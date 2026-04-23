"""
ARCHON - Ultimate (fusion) engine.

Phase 1: run TradingAgents and Hedge Fund independently and merge outputs.
"""

from __future__ import annotations

from typing import Any

from core.config import ARCHON_CONFIG
from core.engines.hedge_fund_engine import HedgeFundEngine
from core.engines.trading_agents_engine import TradingAgentsEngine


class UltimateEngine:
    """Hedge fund + TradingAgents; Phase 1 = parallel merge only."""

    def __init__(self, config: dict | None = None) -> None:
        self.config = config or ARCHON_CONFIG.copy()
        self._hf_engine: HedgeFundEngine | None = None
        self._ta_engine: TradingAgentsEngine | None = None

    def initialize(self) -> None:
        self._hf_engine = HedgeFundEngine()
        ta_overrides = {
            "llm_provider": self.config.get("llm_provider", "openai"),
            "deep_think_llm": self.config.get("deep_think_llm", "gpt-4.1"),
            "quick_think_llm": self.config.get("quick_think_llm", "gpt-4.1-mini"),
            "max_debate_rounds": self.config.get("max_invest_debate_rounds", 2),
            "max_risk_discuss_rounds": self.config.get("max_risk_debate_rounds", 2),
            "output_language": self.config.get("output_language", "English"),
        }
        self._ta_engine = TradingAgentsEngine(config_overrides=ta_overrides)
        self._ta_engine.initialize(
            selected_analysts=self.config.get("selected_analysts"),
        )
        print("[ARCHON] UltimateEngine initialized (Phase 1)")

    def run(
        self,
        tickers: list[str],
        trade_date: str,
        start_date: str | None = None,
        end_date: str | None = None,
        portfolio: dict | None = None,
    ) -> dict[str, Any]:
        if not self._hf_engine or not self._ta_engine:
            self.initialize()

        assert self._hf_engine is not None
        assert self._ta_engine is not None

        _end = end_date or trade_date
        _start = start_date or trade_date

        print(f"[ARCHON] === Running AI Hedge Fund for {tickers} ===")
        hf_result = self._hf_engine.run(
            tickers=tickers,
            start_date=_start,
            end_date=_end,
            portfolio=portfolio,
            selected_analysts=self.config.get("enabled_gurus", []),
            model_name=self.config.get("guru_llm", "gpt-4.1"),
            model_provider=self.config.get("llm_provider", "openai").capitalize(),
            show_reasoning=False,
        )

        print(f"[ARCHON] === Running TradingAgents for {tickers} ===")
        ta_results = self._ta_engine.run_multi(
            tickers, trade_date, self.config.get("selected_analysts")
        )

        return {
            "tickers": tickers,
            "trade_date": trade_date,
            "hedge_fund_result": hf_result,
            "trading_agents_result": ta_results,
            "engine": "ultimate",
            "phase": 1,
        }

    def reflect(self, returns_losses: dict) -> None:
        if self._ta_engine:
            self._ta_engine.reflect(returns_losses)
