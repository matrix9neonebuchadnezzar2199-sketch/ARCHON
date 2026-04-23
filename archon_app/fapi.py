"""
ARCHON — unified FastAPI application.

Uvicorn (from repo root):
  poetry run uvicorn serve:app --reload --port 8000

Do **not** add a top-level `app/` package under the repo: it would shadow
`vendors/ai-hedge-fund/app` and break `from app.backend...` imports.
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import ARCHON_CONFIG
from core.llm_key_status import env_name_for_provider, is_api_key_configured_for_provider
from core.ui_secrets import load_ui_secrets_to_environ

_ROOT = Path(__file__).resolve().parent.parent
_AIHF = _ROOT / "vendors" / "ai-hedge-fund"
_TA = _ROOT / "vendors" / "TradingAgents"
# Search order: AI-HF's `app` and `src` first, then TradingAgents, then ARCHON (core, archon_app)
for p in (str(_ROOT), str(_TA), str(_AIHF)):
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv(_ROOT / ".env")
load_ui_secrets_to_environ()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("archon")

_aihf_available = False
api_router = None

try:
    from app.backend.database.connection import engine  # type: ignore
    from app.backend.database.models import Base as AihfBase  # type: ignore
    from app.backend.routes import api_router as aihf_api_router  # type: ignore

    AihfBase.metadata.create_all(bind=engine)
    api_router = aihf_api_router
    _aihf_available = True
    logger.info("AI-HF backend modules loaded; DB tables ensured")
except Exception as e:  # noqa: BLE001
    logger.warning("AI-HF backend not loaded: %s", e)
    logger.warning("Hedge-fund / flows / ollama routes from the vendor will be unavailable.")

from archon_app.routes.trading_agents import router as ta_router
from archon_app.routes.ultimate import router as ultimate_router
from archon_app.routes.hedge_fund_archon import router as hf_archon_router
from archon_app.routes.backtest import router as backtest_router
from archon_app.routes.portfolio import router as portfolio_router
from archon_app.routes.memory import router as memory_router
from archon_app.routes.logs import router as archon_logs_router
from archon_app.routes.settings import router as archon_settings_router
from archon_app.routes.llm_candidates import router as llm_candidates_router


@asynccontextmanager
async def _lifespan(app: FastAPI):
    logger.info("=" * 60)
    logger.info("  ARCHON — API starting")
    logger.info("  AI-HF path:   %s", _AIHF)
    logger.info("  TA path:      %s", _TA)
    if _aihf_available:
        try:
            from app.backend.services.ollama_service import ollama_service  # type: ignore

            status = await ollama_service.check_ollama_status()
            if status.get("running"):
                logger.info("  Ollama: running at %s", status.get("server_url"))
            else:
                logger.info("  Ollama: not running (optional)")
        except Exception:  # noqa: BLE001
            logger.info("  Ollama: check skipped (optional)")
    else:
        logger.info("  Ollama: skipped (AI-HF not loaded)")
    logger.info("=" * 60)
    yield
    logger.info("ARCHON API shutdown")


app = FastAPI(
    title="ARCHON — AI Trading",
    description="AI Hedge Fund + TradingAgents (integrated)",
    version="0.2.0",
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3501",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if _aihf_available and api_router is not None:
    app.include_router(api_router)

app.include_router(ta_router)
app.include_router(ultimate_router)
app.include_router(hf_archon_router)
app.include_router(backtest_router)
app.include_router(portfolio_router)
app.include_router(memory_router)
app.include_router(archon_logs_router)
app.include_router(archon_settings_router)
app.include_router(llm_candidates_router)


@app.get("/api/archon/health")
async def archon_health():
    _prov = str(ARCHON_CONFIG.get("llm_provider", "openai") or "openai")
    _key_env = env_name_for_provider(_prov)
    return {
        "status": "ok",
        "system": "ARCHON",
        "version": "0.2.0",
        "engines": {
            "ai_hedge_fund": _aihf_available,
            "trading_agents": True,
            "ultimate": True,
        },
        "llm": {
            "provider": _prov,
            "api_key_configured": is_api_key_configured_for_provider(_prov),
            "expected_api_key_env": _key_env,
        },
    }


# ── Serve `frontend/dist` in production (when built; skipped for dev) ──
_FRONTEND_DIST = _ROOT / "frontend" / "dist"
if _FRONTEND_DIST.is_dir() and (_FRONTEND_DIST / "index.html").is_file():
    from fastapi import HTTPException
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    _ASSETS = _FRONTEND_DIST / "assets"
    if _ASSETS.is_dir():
        app.mount(
            "/assets",
            StaticFiles(directory=str(_ASSETS)),
            name="frontend-assets",
        )

    @app.get("/", include_in_schema=False)
    async def _spa_root() -> FileResponse:
        return FileResponse(str(_FRONTEND_DIST / "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def _spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        p = _FRONTEND_DIST / full_path
        if p.is_file():
            return FileResponse(str(p))
        return FileResponse(str(_FRONTEND_DIST / "index.html"))
