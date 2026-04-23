"""Ultimate mode request/response models — Phase 2."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class UltimateRunRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=1)
    trade_date: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    enabled_gurus: Optional[List[str]] = None
    selected_analysts: Optional[List[str]] = None
    llm_provider: str = "openai"
    deep_think_model: str = "gpt-4.1"
    quick_think_model: str = "gpt-4.1-mini"
    guru_model: str = "gpt-4.1"
    max_invest_debate_rounds: int = Field(default=2, ge=1, le=5)
    max_risk_debate_rounds: int = Field(default=2, ge=1, le=5)
    output_language: str = "English"


class VerdictResponse(BaseModel):
    action: str
    confidence: float
    aligned: bool
    guru_lean: str
    ta_lean: str
    reasoning: str


class TickerFusionResponse(BaseModel):
    guru_signals: Dict[str, Any]
    guru_bull_count: int
    guru_bear_count: int
    guru_neutral_count: int
    ta_decision: Any
    ta_reports: Dict[str, Any]
    ta_debate: Dict[str, Any]
    ta_trader_plan: Any
    verdict: VerdictResponse


class UltimateRunResponse(BaseModel):
    tickers: List[str]
    trade_date: str
    fusion: Dict[str, TickerFusionResponse]
    hedge_fund_result: Dict[str, Any]
    trading_agents_result: Dict[str, Any]
    engine: str = "ultimate"
    phase: int = 2
