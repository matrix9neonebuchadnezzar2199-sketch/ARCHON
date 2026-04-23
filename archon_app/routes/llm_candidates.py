"""
ローカル（Ollama / LM Studio）+ クラウド候補を Phase 8 形式（フラット `candidates`）で返す。
GET /llm/candidates, POST /llm/connection-test
"""

from __future__ import annotations

import os
import time
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from core.llm_discovery import discover_all

router = APIRouter(prefix="/api/archon", tags=["LLM"])


# ── Pydantic ──


class LlmCandidate(BaseModel):
    id: str
    display_name: str
    provider: str  # ollama | lm-studio | openai | anthropic | ...
    source: str  # "local" | "cloud"
    parameter_size: str | None = None
    quantization: str | None = None


class LlmCandidatesResponse(BaseModel):
    candidates: list[LlmCandidate]
    ollama_detected: bool = False
    ollama_base_url: str | None = None
    ollama_port: int | None = None
    ollama_error: str | None = None
    lm_studio_detected: bool = False
    lm_studio_base_url: str | None = None
    lm_studio_port: int | None = None
    lm_studio_openai_v1_url: str | None = None  # …/v1 付き（OPENAI_BASE_URL 用）
    lm_studio_error: str | None = None
    cloud_providers: list[str] = Field(default_factory=list)


class ConnectionTestResult(BaseModel):
    provider: str
    reachable: bool
    latency_ms: float | None = None
    error: str | None = None
    model_count: int | None = None


# ── Cloud (TradingAgents カタログ) ──


def _cloud_from_catalog() -> list[dict[str, str]]:
    try:
        from tradingagents.llm_clients.model_catalog import (  # type: ignore
            MODEL_OPTIONS,
        )
    except Exception:  # noqa: BLE001
        return _fallback_cloud()
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for prov, modes in MODEL_OPTIONS.items():
        for _mode, options in modes.items():
            for display, mid in options:
                if not mid or mid == "custom" or mid in seen:
                    continue
                seen.add(str(mid))
                out.append(
                    {
                        "id": str(mid),
                        "label": f"{display} · {prov}",
                        "backend": str(prov),
                    }
                )
    return out or _fallback_cloud()


def _fallback_cloud() -> list[dict[str, str]]:
    return [
        {
            "id": "gpt-4.1",
            "label": "GPT-4.1 (openai) · フォールバック",
            "backend": "openai",
        },
        {
            "id": "claude-sonnet-4-5",
            "label": "Claude Sonnet 4.5 · フォールバック",
            "backend": "anthropic",
        },
    ]


def _cloud_api_providers() -> list[str]:
    out: list[str] = []
    m = {
        "OPENAI_API_KEY": "openai",
        "ANTHROPIC_API_KEY": "anthropic",
        "GOOGLE_API_KEY": "google",
        "XAI_API_KEY": "xai",
        "GROQ_API_KEY": "groq",
        "DEEPSEEK_API_KEY": "deepseek",
    }
    for env, p in m.items():
        v = (os.getenv(env) or "").strip()
        if v and p not in out:
            out.append(p)
    return out


def _parse_port(url: str | None) -> int | None:
    if not url:
        return None
    try:
        p = urlparse(url)
        return p.port
    except Exception:  # noqa: BLE001
        return None


def _v1_for_lm(base: str) -> str:
    b = base.rstrip("/")
    return b if b.endswith("/v1") else f"{b}/v1"


def _flatten_disco() -> tuple[list[LlmCandidate], LlmCandidatesResponse]:
    d = discover_all()
    o = d.get("ollama") or {}
    l = d.get("lm_studio") or {}
    seen: set[str] = set()
    flat: list[LlmCandidate] = []

    if o.get("ok") and o.get("base_url"):
        for m in o.get("models") or []:
            mid = m.get("id") or m.get("label")
            if not mid or str(mid) in seen:
                continue
            seen.add(str(mid))
            flat.append(
                LlmCandidate(
                    id=str(mid),
                    display_name=str(m.get("label") or mid),
                    provider="ollama",
                    source="local",
                )
            )

    if l.get("ok") and l.get("base_url"):
        for m in l.get("models") or []:
            mid = m.get("id")
            if not mid or str(mid) in seen:
                continue
            seen.add(str(mid))
            flat.append(
                LlmCandidate(
                    id=str(mid),
                    display_name=str(m.get("label") or mid),
                    provider="lm-studio",
                    source="local",
                )
            )

    for c in _cloud_from_catalog():
        mid = c["id"]
        if mid in seen:
            continue
        seen.add(mid)
        be = c.get("backend") or "openai"
        flat.append(
            LlmCandidate(
                id=mid,
                display_name=c.get("label") or mid,
                provider=be,
                source="cloud",
            )
        )

    ob = o.get("base_url")
    lb = l.get("base_url")
    o_ok = bool(o.get("ok") and ob and o.get("models"))
    l_ok = bool(l.get("ok") and lb and l.get("models"))
    meta = LlmCandidatesResponse(
        candidates=[],
        ollama_detected=o_ok,
        ollama_base_url=str(ob) if ob else None,
        ollama_port=o.get("port") or (_parse_port(str(ob)) if ob else None),
        ollama_error=None if o_ok else ("未検出: Ollama /api/tags" if not o.get("ok") else None),
        lm_studio_detected=l_ok,
        lm_studio_base_url=str(lb) if lb else None,
        lm_studio_port=l.get("port") or (_parse_port(str(lb)) if lb else None),
        lm_studio_openai_v1_url=_v1_for_lm(str(lb)) if lb else None,
        lm_studio_error=None if l_ok else ("未検出: LM Studio /v1/models" if not l.get("ok") else None),
        cloud_providers=_cloud_api_providers(),
    )
    return flat, meta


# ── Endpoints ──


@router.get("/llm/candidates", response_model=LlmCandidatesResponse)
async def get_llm_candidates() -> LlmCandidatesResponse:
    """Phase 8: フラット候補 + 検出メタデータ。"""
    flat, meta = _flatten_disco()
    meta.candidates = flat
    return meta


@router.post("/llm/connection-test", response_model=list[ConnectionTestResult])
async def test_llm_connections() -> list[ConnectionTestResult]:
    from core.audit_log import append_audit

    out: list[ConnectionTestResult] = []
    d = discover_all()
    o = d.get("ollama") or {}
    l = d.get("lm_studio") or {}
    o_url = str(o.get("base_url") or "http://127.0.0.1:11434").rstrip("/")
    l_base = str(l.get("base_url") or "http://127.0.0.1:1234").rstrip("/")
    if l_base.rstrip("/").endswith("/v1"):
        l_models_url = f"{l_base.rstrip('/')}/models"
    else:
        l_models_url = f"{l_base.rstrip('/')}/v1/models"

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{o_url}/api/tags")
        ms = (time.monotonic() - t0) * 1000
        r.raise_for_status()
        cnt = len(r.json().get("models") or [])
        out.append(
            ConnectionTestResult(
                provider="ollama", reachable=True, latency_ms=round(ms, 1), model_count=cnt
            )
        )
    except Exception as e:  # noqa: BLE001
        ms = (time.monotonic() - t0) * 1000
        out.append(
            ConnectionTestResult(
                provider="ollama", reachable=False, latency_ms=round(ms, 1), error=str(e)[:200]
            )
        )

    t0 = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r2 = await client.get(l_models_url)
        ms2 = (time.monotonic() - t0) * 1000
        r2.raise_for_status()
        cnt2 = len(r2.json().get("data") or [])
        out.append(
            ConnectionTestResult(
                provider="lm-studio", reachable=True, latency_ms=round(ms2, 1), model_count=cnt2
            )
        )
    except Exception as e:  # noqa: BLE001
        ms2 = (time.monotonic() - t0) * 1000
        out.append(
            ConnectionTestResult(
                provider="lm-studio", reachable=False, latency_ms=round(ms2, 1), error=str(e)[:200]
            )
        )

    m = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "google": "GOOGLE_API_KEY",
        "xai": "XAI_API_KEY",
        "groq": "GROQ_API_KEY",
        "deepseek": "DEEPSEEK_API_KEY",
    }
    for p, k in m.items():
        v = (os.getenv(k) or "").strip()
        if v:
            out.append(
                ConnectionTestResult(provider=p, reachable=True, latency_ms=0.0, model_count=None)
            )

    append_audit("connection_test", {"results": [x.model_dump() for x in out]})
    return out
