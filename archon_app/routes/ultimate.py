"""
Ultimate mode — /api/ultimate/*  (Phase 2 with progress callbacks)
"""

import asyncio
import queue
import traceback
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from archon_app.models.events import CompleteEvent, ErrorEvent, ProgressEvent, StartEvent
from archon_app.models.ultimate_schemas import UltimateRunRequest, UltimateRunResponse

router = APIRouter(prefix="/api/ultimate", tags=["Ultimate Mode"])


@router.get("/gurus")
async def get_gurus() -> dict[str, Any]:
    try:
        from src.utils.analysts import ANALYST_CONFIG  # type: ignore

        gurus: list[dict] = []
        for key, config in ANALYST_CONFIG.items():
            gurus.append(
                {
                    "key": key,
                    "display_name": config["display_name"],
                    "description": config["description"],
                    "investing_style": config["investing_style"],
                }
            )
        return {"gurus": gurus}
    except Exception as e:  # noqa: BLE001
        return {"gurus": [], "error": str(e)}


@router.get("/analysts")
async def get_analysts() -> dict[str, Any]:
    return {
        "analysts": [
            {
                "key": "market",
                "name": "Technical/Market Analyst",
                "description": "Price, volume, and technical context",
            },
            {
                "key": "social",
                "name": "Sentiment Analyst",
                "description": "Social and sentiment",
            },
            {
                "key": "news",
                "name": "News Analyst",
                "description": "News and headlines",
            },
            {
                "key": "fundamentals",
                "name": "Fundamentals Analyst",
                "description": "Earnings, valuation, and fundamentals",
            },
        ],
    }


@router.post("/run-sync", response_model=UltimateRunResponse)
async def run_sync(req: UltimateRunRequest) -> UltimateRunResponse:
    try:
        from core.engines.ultimate_engine import UltimateEngine

        config = _build_config(req)
        engine = UltimateEngine(config=config)
        result = engine.run(
            tickers=req.tickers,
            trade_date=req.trade_date,
            start_date=req.start_date,
            end_date=req.end_date,
        )
        return UltimateRunResponse.model_validate(result)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=traceback.format_exc()) from e


@router.post("/run")
async def run_stream(req: UltimateRunRequest) -> StreamingResponse:
    async def event_generator() -> Any:
        progress_q: "queue.Queue[dict[str, Any]]" = queue.Queue()

        def progress_callback(
            agent: str, status: str, ticker: str | None = None
        ) -> None:
            try:
                progress_q.put(
                    {
                        "agent": agent,
                        "status": status,
                        "ticker": ticker,
                    }
                )
            except Exception:  # noqa: BLE001
                pass

        try:
            yield StartEvent(engine="ultimate").to_sse()

            from core.engines.ultimate_engine import UltimateEngine

            yield ProgressEvent(
                engine="ultimate", agent="system", status="Initializing Ultimate engine…"
            ).to_sse()

            def _work() -> dict[str, Any]:
                eng = UltimateEngine(_build_config(req))
                eng.set_progress_callback(progress_callback)
                eng.initialize()
                return eng.run(
                    req.tickers, req.trade_date, req.start_date, req.end_date
                )

            loop = asyncio.get_running_loop()
            task = loop.run_in_executor(None, _work)

            while not task.done():
                while True:
                    try:
                        item = progress_q.get_nowait()
                    except queue.Empty:
                        break
                    yield ProgressEvent(
                        engine="ultimate",
                        agent=item["agent"],
                        ticker=item.get("ticker"),
                        status=item["status"],
                    ).to_sse()
                await asyncio.sleep(0.05)

            result = await task

            while True:
                try:
                    item = progress_q.get_nowait()
                except queue.Empty:
                    break
                yield ProgressEvent(
                    engine="ultimate",
                    agent=item["agent"],
                    ticker=item.get("ticker"),
                    status=item["status"],
                ).to_sse()

            yield CompleteEvent(engine="ultimate", data=result).to_sse()
        except Exception as e:  # noqa: BLE001
            yield ErrorEvent(
                engine="ultimate", message=f"{type(e).__name__}: {e}"
            ).to_sse()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


def _build_config(req: UltimateRunRequest) -> dict[str, Any]:
    from core.config import ARCHON_CONFIG

    config = dict(ARCHON_CONFIG)
    config["llm_provider"] = req.llm_provider
    config["deep_think_llm"] = req.deep_think_model
    config["quick_think_llm"] = req.quick_think_model
    config["guru_llm"] = req.guru_model
    config["max_invest_debate_rounds"] = req.max_invest_debate_rounds
    config["max_risk_debate_rounds"] = req.max_risk_debate_rounds
    config["output_language"] = req.output_language
    if req.enabled_gurus:
        config["enabled_gurus"] = req.enabled_gurus
    if req.selected_analysts:
        config["selected_analysts"] = req.selected_analysts
    return config
