"""Uvicorn entry: `poetry run uvicorn serve:app --reload --port 8000` (from repo root)."""

from archon_app.fapi import app

__all__ = ["app"]
