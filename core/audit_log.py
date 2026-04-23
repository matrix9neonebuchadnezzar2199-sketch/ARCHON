"""Append-only JSONL audit log under ARCHON results_dir."""

from __future__ import annotations

import json
import logging
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.config import ARCHON_CONFIG

logger = logging.getLogger("archon.audit")

_MAX_IN_MEMORY = 200
_ring: deque[dict[str, Any]] = deque(maxlen=_MAX_IN_MEMORY)


def _file() -> Path:
    d = Path(str(ARCHON_CONFIG.get("results_dir", ".results"))).resolve()
    return d / "audit_log.jsonl"


def append_audit(action: str, detail: dict | None = None) -> None:
    entry: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "detail": detail or {},
    }
    _ring.appendleft(entry)
    p = _file()
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError as e:
        logger.warning("audit log write failed: %s", e)


def get_audit_entries_newest_first(limit: int) -> list[dict[str, Any]]:
    n = min(max(1, limit), 2000)
    p = _file()
    if not p.is_file() or p.stat().st_size == 0:
        return list(_ring)[:n]
    try:
        raw = p.read_text(encoding="utf-8").splitlines()[-n:]
    except OSError:
        return list(_ring)[:n]
    out: list[dict[str, Any]] = []
    for line in reversed(raw):
        s = line.strip()
        if not s:
            continue
        try:
            out.append(json.loads(s))
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
    return out
