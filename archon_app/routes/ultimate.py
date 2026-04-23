"""
Ultimate mode — /api/ultimate/*
"""

import asyncio
import traceback

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from archon_app.models.events import CompleteEvent, ErrorEvent, ProgressEvent, StartEvent
from archon_app.models.ultimate_schemas import UltimateRunRequest, UltimateRunResponse

router = APIRouter(prefix="/api/ultimate", tags=["Ultimate Mode"])


@router.get("/gurus")
async def get_gurus():
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


@router.post("/run-sync", response_model=UltimateRunResponse)
async def run_sync(req: UltimateRunRequest):
    try:
        from core.config import ARCHON_CONFIG
        from core.engines.ultimate_engine import UltimateEngine

        config = ARCHON_CONFIG.copy()
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

        engine = UltimateEngine(config=config)
        result = engine.run(
            tickers=req.tickers,
            trade_date=req.trade_date,
            start_date=req.start_date,
            end_date=req.end_date,
        )
        return UltimateRunResponse(**result)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=traceback.format_exc()) from e


@router.post("/run")
async def run_stream(req: UltimateRunRequest):
    async def event_generator():
        try:
            yield StartEvent(engine="ultimate").to_sse()
            from core.config import ARCHON_CONFIG
            from core.engines.ultimate_engine import UltimateEngine

            config = ARCHON_CONFIG.copy()
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

            engine = UltimateEngine(config=config)
            yield ProgressEvent(
                engine="ultimate",
                agent="system",
                status="Initializing Ultimate engine...",
            ).to_sse()
            await asyncio.to_thread(engine.initialize)
            yield ProgressEvent(
                engine="ultimate",
                agent="system",
                status="Running full pipeline...",
            ).to_sse()
            result = await asyncio.to_thread(
                engine.run,
                req.tickers,
                req.trade_date,
                req.start_date,
                req.end_date,
            )
            yield CompleteEvent(engine="ultimate", data=result).to_sse()
        except Exception as e:  # noqa: BLE001
            yield ErrorEvent(engine="ultimate", message=f"{type(e).__name__}: {e}").to_sse()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
