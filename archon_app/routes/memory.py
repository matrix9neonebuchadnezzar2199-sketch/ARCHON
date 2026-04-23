"""
Memory — /api/memory/*
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/memory", tags=["Memory"])

_memory_manager: Any = None
_ta_engine_ref: Any = None


def _get_manager() -> Any:
    global _memory_manager
    if _memory_manager is None:
        from core.memory.memory_manager import MemoryManager

        _memory_manager = MemoryManager()
    return _memory_manager


def _get_ta_engine() -> Any:
    return _ta_engine_ref


@router.get("/")
async def get_all_memories() -> dict[str, Any]:
    mgr = _get_manager()
    ta = _get_ta_engine()
    memories = mgr.get_all_memories(ta)
    return {"memories": memories}


@router.get("/stats")
async def get_stats() -> dict[str, Any]:
    mgr = _get_manager()
    ta = _get_ta_engine()
    return mgr.get_stats(ta)


class QueryRequest(BaseModel):
    memory_name: str
    query: str
    n_matches: int = Field(default=3, ge=1, le=10)


@router.post("/query")
async def query_memory(req: QueryRequest) -> dict[str, Any]:
    mgr = _get_manager()
    ta = _get_ta_engine()
    if not ta or not ta._graph:
        return {
            "matches": [],
            "memory_name": req.memory_name,
            "note": (
                "No live TradingAgents engine. "
                "Run an analysis (SSE) first to populate memory."
            ),
        }
    matches = mgr.query_memory(
        ta, req.memory_name, req.query, n_matches=req.n_matches
    )
    return {"matches": matches, "memory_name": req.memory_name}


@router.post("/save")
async def save_memories() -> dict[str, Any]:
    mgr = _get_manager()
    ta = _get_ta_engine()
    if not ta or not ta._graph:
        raise HTTPException(
            status_code=400, detail="No live TradingAgents engine to save from."
        )
    counts = mgr.save_to_disk(ta)
    return {"status": "saved", "counts": counts}


@router.post("/load")
async def load_memories() -> dict[str, Any]:
    mgr = _get_manager()
    ta = _get_ta_engine()
    if not ta or not ta._graph:
        raise HTTPException(
            status_code=400, detail="No live TradingAgents engine to load into."
        )
    counts = mgr.load_into_engine(ta)
    return {"status": "loaded", "counts": counts}


@router.delete("/clear")
async def clear_memories(memory_name: Optional[str] = None) -> dict[str, str]:
    mgr = _get_manager()
    mgr.clear_memory(memory_name)
    return {
        "status": "cleared",
        "memory_name": (memory_name or "all"),
    }


def register_ta_engine(engine: Any) -> None:
    global _ta_engine_ref
    _ta_engine_ref = engine
