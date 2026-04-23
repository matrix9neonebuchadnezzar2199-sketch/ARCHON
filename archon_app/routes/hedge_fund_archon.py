"""
AI Hedge Fund standalone — /api/hf/*

Uses the ARCHON `HedgeFundEngine` (not the vendored HTTP routes at /hedge-fund/*).
"""

import asyncio
import traceback
from typing import Any, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from archon_app.models.events import CompleteEvent, ErrorEvent, ProgressEvent, StartEvent

router = APIRouter(prefix="/api/hf", tags=["AI Hedge Fund (ARCHON)"])


class HFRunRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=1)
    start_date: str
    end_date: str
    selected_analysts: Optional[List[str]] = None
    model_name: str = "gpt-4.1"
    model_provider: str = "OpenAI"
    initial_cash: float = 100_000.0
    show_reasoning: bool = False


class HFRunResponse(BaseModel):
    decisions: Any
    analyst_signals: dict[str, Any]
    engine: str = "ai-hedge-fund"
    mode: str = "direct"


@router.get("/analysts")
async def get_analysts() -> dict[str, Any]:
    from core.engines.hedge_fund_engine import HedgeFundEngine

    return {"analysts": HedgeFundEngine.AVAILABLE_ANALYSTS}


@router.post("/run-sync", response_model=HFRunResponse)
async def run_sync(req: HFRunRequest) -> HFRunResponse:
    try:
        from core.engines.hedge_fund_engine import HedgeFundEngine

        engine = HedgeFundEngine()
        result = engine.run(
            tickers=req.tickers,
            start_date=req.start_date,
            end_date=req.end_date,
            selected_analysts=req.selected_analysts,
            model_name=req.model_name,
            model_provider=req.model_provider,
            show_reasoning=req.show_reasoning,
        )
        return HFRunResponse(**result)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=traceback.format_exc()) from e


@router.post("/run")
async def run_stream(req: HFRunRequest) -> StreamingResponse:
    async def event_generator() -> Any:
        try:
            yield StartEvent(engine="ai-hedge-fund").to_sse()
            from core.engines.hedge_fund_engine import HedgeFundEngine

            engine = HedgeFundEngine()
            n_analysts = len(req.selected_analysts or [])

            yield ProgressEvent(
                engine="ai-hedge-fund",
                agent="system",
                status="Running AI Hedge Fund…",
                detail=f"{len(req.tickers)} ticker(s), {n_analysts} analyst(s)",
            ).to_sse()

            result = await asyncio.to_thread(
                engine.run,
                req.tickers,
                req.start_date,
                req.end_date,
                None,
                req.selected_analysts,
                req.model_name,
                req.model_provider,
                req.show_reasoning,
            )

            for guru_key, signals in result.get("analyst_signals", {}).items():
                detail = (str(signals)[:300] if signals is not None else None) or ""
                yield ProgressEvent(
                    engine="ai-hedge-fund",
                    agent=guru_key,
                    status="Analysis complete",
                    detail=detail,
                ).to_sse()

            yield CompleteEvent(engine="ai-hedge-fund", data=result).to_sse()
        except Exception as e:  # noqa: BLE001
            yield ErrorEvent(
                engine="ai-hedge-fund",
                message=f"{type(e).__name__}: {e}",
            ).to_sse()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
