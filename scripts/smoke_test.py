#!/usr/bin/env python3
"""
ARCHON — offline smoke test (in-process, no live server, no API keys).

Usage (repo root):
  poetry run python scripts/smoke_test.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


def main() -> int:
    from fastapi.testclient import TestClient

    from archon_app.fapi import app

    c = TestClient(app)
    paths: list[tuple[str, int]] = [
        ("/api/archon/health", 200),
        ("/api/ultimate/gurus", 200),
        ("/api/ultimate/analysts", 200),
        ("/api/ta/analysts", 200),
        ("/api/hf/analysts", 200),
        ("/api/archon/settings", 200),
        ("/api/memory/", 200),
        ("/api/memory/stats", 200),
        ("/api/logs/", 200),
        ("/api/logs/count", 200),
        ("/api/portfolio/", 200),
        ("/docs", 200),
    ]

    failures: list[str] = []
    h = c.get("/api/archon/health")
    if h.status_code != 200:
        failures.append(f"GET /api/archon/health -> {h.status_code}")
    else:
        v = h.json().get("version")
        if v != "0.2.0":
            failures.append(f"health version: expected 0.2.0, got {v!r}")

    for path, want in paths:
        if path == "/api/archon/health":
            continue
        r = c.get(path)
        if r.status_code != want:
            failures.append(f"GET {path} -> {r.status_code} (want {want})")

    r0 = c.get("/")
    if r0.status_code not in (200, 404):
        failures.append(f"GET / -> {r0.status_code} (expected 200 if dist built, else 404)")

    if failures:
        for f in failures:
            print("FAIL:", f, file=sys.stderr)
        return 1

    print("smoke_test: all checks passed (GET routes + version 0.2.0).")
    print("Note: LLM-backed POST/SSE runs are not covered; use manual or E2E with API keys.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
