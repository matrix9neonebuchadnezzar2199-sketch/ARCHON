"""
ARCHON settings — /api/archon/* (read/update in-memory `ARCHON_CONFIG` + API キーは `ui_secrets` に永続).

Note: the AI-HF app also exposes /api-keys under its own `app` API when loaded.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

import os

from core.audit_log import append_audit, get_audit_entries_newest_first
from core.config import ARCHON_CONFIG
from core.ui_secrets import set_secret_env, secrets_set_flags

router = APIRouter(prefix="/api/archon", tags=["ARCHON Settings"])


class SettingsGetResponse(BaseModel):
    config: Dict[str, Any]
    secrets_set: Dict[str, bool] = Field(
        description="各環境変数名に対し、非空の値が設定されているか"
    )


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
    anthropic_effort: Optional[str] = None
    openai_reasoning_effort: Optional[str] = None
    google_thinking_level: Optional[str] = None
    enable_valuation_agent: Optional[bool] = None
    enable_memory: Optional[bool] = None
    enable_reflection: Optional[bool] = None
    allow_short: Optional[bool] = None
    initial_cash: Optional[float] = None
    margin_requirement: Optional[float] = None
    ollama_base_url: Optional[str] = None
    openai_base_url: Optional[str] = None  # LM Studio: http://host:port/v1

    # UI 専用フィールド名 → set_secret_env で OPENAI 等へ
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    deepseek_api_key: Optional[str] = None
    financial_datasets_api_key: Optional[str] = None
    alpha_vantage_api_key: Optional[str] = None


class ConfigExportPayload(BaseModel):
    config: Dict[str, Any]
    exported_at: Optional[str] = None
    version: str = "0.2.0"


def _map_ui_secrets(req: SettingsUpdateRequest) -> None:
    m = {
        "openai_api_key": "OPENAI_API_KEY",
        "anthropic_api_key": "ANTHROPIC_API_KEY",
        "google_api_key": "GOOGLE_API_KEY",
        "xai_api_key": "XAI_API_KEY",
        "groq_api_key": "GROQ_API_KEY",
        "deepseek_api_key": "DEEPSEEK_API_KEY",
        "financial_datasets_api_key": "FINANCIAL_DATASETS_API_KEY",
        "alpha_vantage_api_key": "ALPHA_VANTAGE_API_KEY",
    }
    data = req.model_dump(exclude_none=True)
    for ufield, envn in m.items():
        v = data.get(ufield)
        if v is not None and str(v).strip():
            set_secret_env(envn, str(v).strip())


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


@router.get("/settings", response_model=SettingsGetResponse)
async def get_settings():
    safe_config = {
        k: v
        for k, v in ARCHON_CONFIG.items()
        if "key" not in k.lower() and "secret" not in k.lower()
    }
    return SettingsGetResponse(
        config=safe_config,
        secrets_set=secrets_set_flags(),
    )


ALLOWED_CONFIG_KEYS = frozenset(
    {
        "llm_provider",
        "deep_think_llm",
        "quick_think_llm",
        "guru_llm",
        "output_language",
        "max_invest_debate_rounds",
        "max_risk_debate_rounds",
        "enabled_gurus",
        "selected_analysts",
        "anthropic_effort",
        "openai_reasoning_effort",
        "google_thinking_level",
        "enable_valuation_agent",
        "enable_memory",
        "enable_reflection",
        "allow_short",
        "initial_cash",
        "margin_requirement",
        "ollama_base_url",
        "openai_base_url",
    }
)

SECRET_UI_FIELDS = frozenset(
    {
        "openai_api_key",
        "anthropic_api_key",
        "google_api_key",
        "xai_api_key",
        "groq_api_key",
        "deepseek_api_key",
        "financial_datasets_api_key",
        "alpha_vantage_api_key",
    }
)


@router.put("/settings")
async def update_settings(req: SettingsUpdateRequest):
    _map_ui_secrets(req)
    raw = req.model_dump(exclude_none=True)
    secret_touched = any(
        k in raw and str(raw.get(k) or "").strip() for k in SECRET_UI_FIELDS
    )
    for k in SECRET_UI_FIELDS:
        raw.pop(k, None)
    d = {k: v for k, v in raw.items() if k in ALLOWED_CONFIG_KEYS}
    for _e in ("anthropic_effort", "openai_reasoning_effort", "google_thinking_level"):
        if d.get(_e) == "":
            d[_e] = None
    old_for_audit = {k: ARCHON_CONFIG.get(k) for k in d}
    ARCHON_CONFIG.update(d)
    # ローカル/互換: 起動直後以降のプロセス内と永続化 JSON を揃える
    if d.get("ollama_base_url") and str(d["ollama_base_url"]).strip():
        b = str(d["ollama_base_url"]).strip()
        os.environ["OLLAMA_BASE_URL"] = b
        set_secret_env("OLLAMA_BASE_URL", b)  # ui_secrets ファイルに同梱
    oai_b = d.get("openai_base_url")
    if oai_b is not None:
        t = str(oai_b).strip()
        if t:
            os.environ["OPENAI_BASE_URL"] = t
            set_secret_env("OPENAI_BASE_URL", t)
        else:
            os.environ.pop("OPENAI_BASE_URL", None)
    if d:
        try:
            append_audit(
                "settings_update",
                {
                    "updated_keys": list(d.keys()),
                    "old": {k: old_for_audit.get(k) for k in d},
                    "new": {k: d[k] for k in d},
                },
            )
        except Exception:  # noqa: BLE001
            pass
    return {
        "status": "ok",
        "updated_keys": list(d.keys()) + (["APIキー(永続)"] if secret_touched else []),
    }


@router.get("/settings/export", response_model=ConfigExportPayload)
async def export_settings_v8():
    safe = {
        k: v
        for k, v in ARCHON_CONFIG.items()
        if "key" not in k.lower() and "secret" not in k.lower()
    }
    return ConfigExportPayload(
        config=safe,
        exported_at=datetime.now(timezone.utc).isoformat(),
        version="0.2.0",
    )


@router.post("/settings/import")
async def import_settings_v8(payload: ConfigExportPayload):
    imported = {
        k: v
        for k, v in payload.config.items()
        if "key" not in k.lower() and "secret" not in k.lower()
    }
    allowed = {k: v for k, v in imported.items() if k in ALLOWED_CONFIG_KEYS}
    for _e in ("anthropic_effort", "openai_reasoning_effort", "google_thinking_level"):
        if allowed.get(_e) == "":
            allowed[_e] = None
    ARCHON_CONFIG.update(allowed)
    append_audit("settings_import", {"imported_keys": list(allowed.keys())})
    return {"status": "ok", "imported_keys": list(allowed.keys())}


class AuditEntryV8(BaseModel):
    ts: str
    action: str
    detail: Dict[str, Any] = Field(default_factory=dict)


@router.get("/audit", response_model=List[AuditEntryV8])
async def get_audit_v8(limit: int = 50):
    return [AuditEntryV8(**e) for e in get_audit_entries_newest_first(min(limit, 200))]
