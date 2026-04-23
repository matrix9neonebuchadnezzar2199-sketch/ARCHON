"""
TradingAgents — /api/ta/*
"""

import asyncio
import traceback

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from archon_app.models.events import CompleteEvent, ErrorEvent, ProgressEvent, StartEvent
from archon_app.models.ta_schemas import TARunRequest, TARunResponse

router = APIRouter(prefix="/api/ta", tags=["Trading Agents"])


@router.get("/analysts")
async def get_analysts():
    return {
        "analysts": [
            {
                "key": "market",
                "name": "Technical/Market Analyst",
                "description": "Price, volume, and technical indicators",
            },
            {
                "key": "social",
                "name": "Sentiment Analyst",
                "description": "Social and news-based sentiment",
            },
            {
                "key": "news",
                "name": "News Analyst",
                "description": "News, insider activity, and macro headlines",
            },
            {
                "key": "fundamentals",
                "name": "Fundamentals Analyst",
                "description": "Financial statements and fundamentals",
            },
        ]
    }


@router.post("/run-sync", response_model=TARunResponse)
async def run_sync(req: TARunRequest):
    try:
        from core.engines.trading_agents_engine import TradingAgentsEngine

        config_overrides = {
            "llm_provider": req.llm_provider,
            "deep_think_llm": req.deep_think_model,
            "quick_think_llm": req.quick_think_model,
            "max_debate_rounds": req.max_debate_rounds,
            "max_risk_discuss_rounds": req.max_risk_rounds,
            "output_language": req.output_language,
        }
        engine = TradingAgentsEngine(config_overrides=config_overrides)
        engine.initialize(selected_analysts=req.selected_analysts)
        results = engine.run_multi(req.tickers, req.trade_date, req.selected_analysts)
        return TARunResponse(results=results)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=traceback.format_exc()) from e


@router.post("/run")
async def run_stream(req: TARunRequest):
    async def event_generator():
        try:
            yield StartEvent(engine="trading-agents").to_sse()
            from core.engines.trading_agents_engine import TradingAgentsEngine

            config_overrides = {
                "llm_provider": req.llm_provider,
                "deep_think_llm": req.deep_think_model,
                "quick_think_llm": req.quick_think_model,
                "max_debate_rounds": req.max_debate_rounds,
                "max_risk_discuss_rounds": req.max_risk_rounds,
                "output_language": req.output_language,
            }
            engine = TradingAgentsEngine(config_overrides=config_overrides)
            yield ProgressEvent(
                engine="trading-agents",
                agent="system",
                status="Initializing TradingAgents...",
            ).to_sse()
            await asyncio.to_thread(engine.initialize, req.selected_analysts)
            results: dict = {}
            for i, ticker in enumerate(req.tickers):
                yield ProgressEvent(
                    engine="trading-agents",
                    agent="system",
                    ticker=ticker,
                    status=f"Analyzing {ticker} ({i + 1}/{len(req.tickers)})",
                ).to_sse()
                result = await asyncio.to_thread(
                    engine.run, ticker, req.trade_date, req.selected_analysts
                )
                results[ticker] = result
                yield ProgressEvent(
                    engine="trading-agents",
                    agent="system",
                    ticker=ticker,
                    status=f"Completed {ticker}",
                    detail=str(result.get("decision", ""))[:500],
                ).to_sse()
            try:
                from archon_app.routes.memory import register_ta_engine

                register_ta_engine(engine)
            except Exception:  # noqa: BLE001
                pass
            try:
                from core.logs.log_manager import LogManager

                LogManager().save_run_log(
                    "trading-agents", req.tickers, req.trade_date, results
                )
            except Exception:  # noqa: BLE001
                pass
            yield CompleteEvent(engine="trading-agents", data={"results": results}).to_sse()
        except Exception as e:  # noqa: BLE001
            yield ErrorEvent(
                engine="trading-agents",
                message=f"{type(e).__name__}: {e}",
            ).to_sse()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
