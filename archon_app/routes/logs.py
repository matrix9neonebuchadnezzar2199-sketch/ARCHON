"""
Logs — /api/logs/*
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/logs", tags=["Logs"])

_log_manager: Any = None


def _get_manager() -> Any:
    global _log_manager
    if _log_manager is None:
        from core.logs.log_manager import LogManager

        _log_manager = LogManager()
    return _log_manager


@router.get("/")
async def list_logs(
    engine: Optional[str] = None, ticker: Optional[str] = None
) -> dict[str, Any]:
    mgr = _get_manager()
    logs = mgr.list_logs(engine=engine, ticker=ticker)
    return {"logs": logs, "count": len(logs)}


@router.get("/count")
async def log_counts() -> dict[str, Any]:
    mgr = _get_manager()
    return {"counts": mgr.get_log_count()}


@router.get("/{log_id}")
async def get_log_detail(log_id: str) -> dict[str, Any]:
    mgr = _get_manager()
    detail = mgr.get_log_detail(log_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Log {log_id} not found")
    return detail


@router.delete("/{log_id}")
async def delete_log(log_id: str) -> dict[str, str]:
    mgr = _get_manager()
    if not mgr.delete_log(log_id):
        raise HTTPException(
            status_code=404, detail=f"Log {log_id} not found or could not be deleted"
        )
    return {"status": "deleted", "log_id": log_id}
