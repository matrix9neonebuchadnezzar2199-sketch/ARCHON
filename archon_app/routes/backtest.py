"""
Backtest — /api/backtest/*
"""

import asyncio
import traceback
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from archon_app.models.events import CompleteEvent, ErrorEvent, ProgressEvent, StartEvent

router = APIRouter(prefix="/api/backtest", tags=["Backtest"])


class BacktestRunRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=1)
    start_date: str
    end_date: str
    initial_capital: float = Field(default=100_000, gt=0)
    model_name: str = "gpt-4.1"
    model_provider: str = "OpenAI"
    selected_analysts: Optional[List[str]] = None
    margin_requirement: float = Field(default=0.0, ge=0.0)


class BacktestRunResponse(BaseModel):
    performance_metrics: Dict[str, Any]
    portfolio_values: List[Dict[str, Any]]
    total_days: int
    initial_capital: float
    final_value: float
    total_return_pct: float


@router.post("/run-sync", response_model=BacktestRunResponse)
async def run_sync(req: BacktestRunRequest) -> BacktestRunResponse:
    try:
        from core.engines.backtest_engine import ArchonBacktestEngine

        engine = ArchonBacktestEngine(
            tickers=req.tickers,
            start_date=req.start_date,
            end_date=req.end_date,
            initial_capital=req.initial_capital,
            model_name=req.model_name,
            model_provider=req.model_provider,
            selected_analysts=req.selected_analysts,
            margin_requirement=req.margin_requirement,
        )
        result = await asyncio.to_thread(engine.run)
        return BacktestRunResponse(**result)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=traceback.format_exc()) from e


@router.post("/run")
async def run_stream(req: BacktestRunRequest) -> StreamingResponse:
    """SSE: start → progress → complete (blocking backtest in thread)."""

    async def event_generator() -> Any:
        try:
            yield StartEvent(engine="backtest").to_sse()
            from core.engines.backtest_engine import ArchonBacktestEngine

            tickers_t = ", ".join(req.tickers)
            yield ProgressEvent(
                engine="backtest",
                agent="system",
                status=(
                    f"Starting backtest: {tickers_t} "
                    f"({req.start_date} → {req.end_date}), "
                    f"${req.initial_capital:,.0f}"
                ),
            ).to_sse()

            engine = ArchonBacktestEngine(
                tickers=req.tickers,
                start_date=req.start_date,
                end_date=req.end_date,
                initial_capital=req.initial_capital,
                model_name=req.model_name,
                model_provider=req.model_provider,
                selected_analysts=req.selected_analysts,
                margin_requirement=req.margin_requirement,
            )

            yield ProgressEvent(
                engine="backtest",
                agent="system",
                status="Prefetching data and running daily loop (may take several minutes)…",
            ).to_sse()

            result = await asyncio.to_thread(engine.run)

            yield ProgressEvent(
                engine="backtest",
                agent="system",
                status=(
                    f"Backtest complete: {result['total_days']} days, "
                    f"return {result['total_return_pct']:+.2f}%"
                ),
            ).to_sse()

            yield CompleteEvent(engine="backtest", data=result).to_sse()
        except Exception as e:  # noqa: BLE001
            yield ErrorEvent(engine="backtest", message=f"{type(e).__name__}: {e}").to_sse()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
