"""TradingAgents request/response models."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TARunRequest(BaseModel):
    tickers: List[str] = Field(..., min_length=1)
    trade_date: str
    selected_analysts: Optional[List[str]] = None
    llm_provider: str = "openai"
    deep_think_model: str = "gpt-4.1"
    quick_think_model: str = "gpt-4.1-mini"
    max_debate_rounds: int = Field(default=1, ge=1, le=5)
    max_risk_rounds: int = Field(default=1, ge=1, le=5)
    output_language: str = "English"


class TARunResponse(BaseModel):
    results: Dict[str, Any]
    engine: str = "trading-agents"
