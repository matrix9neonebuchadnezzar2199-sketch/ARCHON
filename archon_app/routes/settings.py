"""
ARCHON settings — /api/archon/* (read/update in-memory `ARCHON_CONFIG`).

Note: the AI-HF app also exposes /api-keys under its own `app` API when loaded.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from core.config import ARCHON_CONFIG

router = APIRouter(prefix="/api/archon", tags=["ARCHON Settings"])


class SettingsResponse(BaseModel):
    config: Dict[str, Any]


class SettingsUpdateRequest(BaseModel):
    llm_provider: Optional[str] = None
    deep_think_llm: Optional[str] = None
    quick_think_llm: Optional[str] = None
    guru_llm: Optional[str] = None
    output_language: Optional[str] = None
    max_invest_debate_rounds: Optional[int] = None
    max_risk_debate_rounds: Optional[int] = None
    enabled_gurus: Optional[List[str]] = None
    selected_analysts: Optional[List[str]] = None


@router.get("/settings/models")
async def get_available_models():
    try:
        from src.llm.models import get_models_list  # type: ignore

        return {"models": get_models_list()}
    except Exception as e:  # noqa: BLE001
        return {
            "models": [
                {
                    "display_name": "GPT-4.1",
                    "model_name": "gpt-4.1",
                    "provider": "OpenAI",
                },
                {
                    "display_name": "GPT-4.1 Mini",
                    "model_name": "gpt-4.1-mini",
                    "provider": "OpenAI",
                },
            ],
            "error": str(e),
        }


@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    safe_config = {
        k: v
        for k, v in ARCHON_CONFIG.items()
        if "key" not in k.lower() and "secret" not in k.lower()
    }
    return SettingsResponse(config=safe_config)


@router.put("/settings")
async def update_settings(req: SettingsUpdateRequest):
    updates = req.model_dump(exclude_none=True)
    ARCHON_CONFIG.update(updates)
    return {"status": "ok", "updated_keys": list(updates.keys())}
