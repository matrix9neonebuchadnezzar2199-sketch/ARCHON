"""
ローカル LLM（Ollama / LM Studio 互換）の待受ポートを短時間で走査し、
取得可能なモデル一覧を返す。httpx 同期・短いタイムアウト。
"""
from __future__ import annotations

import os
from typing import Any
from urllib.parse import urlparse

import httpx

# 既定: 127.0.0.1 と host.docker.internal（Docker からホストの Ollama 等）
def _hosts() -> list[str]:
    raw = os.getenv("ARCHON_LLM_DISCOVERY_HOSTS", "127.0.0.1,host.docker.internal")
    return [h.strip() for h in raw.split(",") if h.strip()]

# Ollama: 既定 11434
OLLAMA_PORT_CANDIDATES: tuple[int, ...] = (11434, 11435, 11888, 12345)
# LM Studio: OpenAI 互換 /v1/models
LMSTUDIO_PORT_CANDIDATES: tuple[int, ...] = (1234, 8080, 11435, 3000)

TIMEOUT = 1.2


def _parse_base_from_env() -> str | None:
    for k in ("OLLAMA_BASE_URL", "OLLAMA_HOST"):
        v = (os.getenv(k) or "").strip()
        if not v:
            continue
        if v.startswith("http://") or v.startswith("https://"):
            return v.rstrip("/")
        if ":" in v and "/" not in v:
            a, b = v.split(":", 1)
            p = b.split("/")[0]
            if p.isdigit():
                return f"http://{a.strip()}:{p}"
    return None


def _ollama_tags(base: str) -> list[dict[str, Any]] | None:
    url = f"{base.rstrip('/')}/api/tags"
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.get(url)
        if r.status_code != 200:
            return None
        j = r.json()
    except (httpx.HTTPError, OSError, ValueError, TypeError):
        return None
    out: list[dict[str, Any]] = []
    for m in j.get("models", []) or []:
        name = m.get("name") or m.get("model") or ""
        if not name:
            continue
        out.append({"id": str(name), "label": str(name), "size": m.get("size")})
    return out or None


def _lmstudio_models(base: str) -> list[dict[str, Any]] | None:
    url = f"{base.rstrip('/')}/v1/models"
    try:
        with httpx.Client(timeout=TIMEOUT) as c:
            r = c.get(url)
        if r.status_code != 200:
            return None
        j = r.json()
    except (httpx.HTTPError, OSError, ValueError, TypeError):
        return None
    out: list[dict[str, Any]] = []
    for m in j.get("data", []) or []:
        mid = m.get("id") or m.get("name") or ""
        if not mid:
            continue
        out.append({"id": str(mid), "label": str(mid)})
    return out or None


def discover_ollama() -> dict[str, Any]:
    """Ollama: 環境変数のベース URL 優先 → ホスト×ポート走査。"""
    scanned: list[dict[str, Any]] = []
    seen_bases: set[str] = set()
    # 1) 明示
    ex = _parse_base_from_env()
    if ex:
        models = _ollama_tags(ex)
        if models is not None:
            parsed = urlparse(ex)
            prt: int = parsed.port or 11434
            return {
                "ok": True,
                "source": "ollama",
                "label": f"Ollama（{ex}）",
                "base_url": ex,
                "port": prt,
                "scanned": [{"base_url": ex, "port": prt, "ok": True}],
                "models": models,
            }
    # 2) 走査
    for host in _hosts():
        for port in OLLAMA_PORT_CANDIDATES:
            bu = f"http://{host}:{port}"
            if bu in seen_bases:
                continue
            seen_bases.add(bu)
            models = _ollama_tags(bu)
            scanned.append({"base_url": bu, "port": port, "host": host, "ok": models is not None})
            if models is not None:
                return {
                    "ok": True,
                    "source": "ollama",
                    "label": f"Ollama @ {host}:{port}",
                    "base_url": bu,
                    "port": port,
                    "scanned": scanned,
                    "models": models,
                }
    return {
        "ok": False,
        "source": "ollama",
        "label": "Ollama（未検出）",
        "base_url": None,
        "port": None,
        "scanned": scanned,
        "models": [],
    }


def discover_lm_studio() -> dict[str, Any]:
    """LM Studio: OpenAI 互換 /v1/models。ポート走査。"""
    scanned: list[dict[str, Any]] = []
    seen: set[str] = set()
    for host in _hosts():
        for port in LMSTUDIO_PORT_CANDIDATES:
            bu = f"http://{host}:{port}"
            if bu in seen:
                continue
            seen.add(bu)
            models = _lmstudio_models(bu)
            scanned.append({"base_url": bu, "port": port, "host": host, "ok": models is not None})
            if models is not None:
                return {
                    "ok": True,
                    "source": "lm_studio",
                    "label": f"LM Studio 互換 @ {host}:{port}",
                    "base_url": bu,
                    "port": port,
                    "scanned": scanned,
                    "models": models,
                }
    return {
        "ok": False,
        "source": "lm_studio",
        "label": "LM Studio 互換（未検出）",
        "base_url": None,
        "port": None,
        "scanned": scanned,
        "models": [],
    }


def discover_all() -> dict[str, Any]:
    return {
        "ollama": discover_ollama(),
        "lm_studio": discover_lm_studio(),
    }
