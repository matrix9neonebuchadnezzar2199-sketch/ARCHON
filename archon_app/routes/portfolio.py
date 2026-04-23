"""
Portfolio — /api/portfolio/*

In-memory latest analysis snapshot for a portfolio-style overview.
(Phase 7+ may add persistence.)
"""

from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio"])

_lock = threading.Lock()
_portfolio_state: dict[str, Any] = {
    "last_updated": None,
    "cash": 100_000.0,
    "positions": {},
    "total_value": 100_000.0,
    "analysis_results": {},
}


class PortfolioPosition(BaseModel):
    ticker: str
    long_shares: int = 0
    short_shares: int = 0
    cost_basis: float = 0.0
    current_price: float = 0.0
    market_value: float = 0.0
    unrealized_pnl: float = 0.0
    weight_pct: float = 0.0


class PortfolioSummary(BaseModel):
    last_updated: Optional[str] = None
    cash: float = 100_000.0
    total_value: float = 100_000.0
    positions: List[PortfolioPosition] = Field(default_factory=list)
    engine_results: Dict[str, str] = Field(default_factory=dict)


class PortfolioUpdateRequest(BaseModel):
    engine: str
    cash: float
    positions: Dict[str, Any]
    total_value: float
    results_summary: Optional[str] = None


@router.get("/", response_model=PortfolioSummary)
async def get_portfolio() -> PortfolioSummary:
    with _lock:
        total_val = float(_portfolio_state.get("total_value") or 1.0)
        positions: list[PortfolioPosition] = []
        for ticker, data in _portfolio_state.get("positions", {}).items():
            if not isinstance(data, dict):
                continue
            mv = float(data.get("market_value", 0.0))
            positions.append(
                PortfolioPosition(
                    ticker=ticker,
                    long_shares=int(data.get("long", 0)),
                    short_shares=int(data.get("short", 0)),
                    cost_basis=float(data.get("cost_basis", 0.0)),
                    current_price=float(data.get("current_price", 0.0)),
                    market_value=mv,
                    unrealized_pnl=float(data.get("unrealized_pnl", 0.0)),
                    weight_pct=round((mv / total_val) * 100, 2) if total_val else 0.0,
                )
            )
        engine_results: dict[str, str] = {}
        for eng, summary in _portfolio_state.get("analysis_results", {}).items():
            engine_results[eng] = str(summary)[:500]

        return PortfolioSummary(
            last_updated=_portfolio_state.get("last_updated"),
            cash=float(_portfolio_state.get("cash", 100_000.0)),
            total_value=float(_portfolio_state.get("total_value", 100_000.0)),
            positions=positions,
            engine_results=engine_results,
        )


@router.post("/update")
async def update_portfolio(req: PortfolioUpdateRequest) -> dict[str, str]:
    with _lock:
        _portfolio_state["cash"] = req.cash
        _portfolio_state["total_value"] = req.total_value
        _portfolio_state["last_updated"] = datetime.now(timezone.utc).isoformat()
        for ticker, data in req.positions.items():
            _portfolio_state["positions"][ticker] = data
        if req.results_summary:
            _portfolio_state["analysis_results"][req.engine] = req.results_summary
    return {"status": "updated"}


@router.delete("/reset")
async def reset_portfolio() -> dict[str, str]:
    with _lock:
        _portfolio_state["last_updated"] = None
        _portfolio_state["cash"] = 100_000.0
        _portfolio_state["positions"] = {}
        _portfolio_state["total_value"] = 100_000.0
        _portfolio_state["analysis_results"] = {}
    return {"status": "reset"}
