"""
ARCHON - TradingAgents engine wrapper (same process as root deps; langgraph >= 0.4).
"""

import sys
from pathlib import Path
from typing import Any

_TA_ROOT = Path(__file__).resolve().parent.parent.parent / "vendors" / "TradingAgents"
if str(_TA_ROOT) not in sys.path:
    sys.path.insert(0, str(_TA_ROOT))

from tradingagents.graph.trading_graph import TradingAgentsGraph  # type: ignore
from tradingagents.default_config import DEFAULT_CONFIG as TA_DEFAULT_CONFIG  # type: ignore


class TradingAgentsEngine:
    """TradingAgents — in-process `TradingAgentsGraph` wrapper."""

    AVAILABLE_ANALYSTS = ["market", "social", "news", "fundamentals"]

    def __init__(self, config_overrides: dict | None = None) -> None:
        self._config = TA_DEFAULT_CONFIG.copy()
        if config_overrides:
            self._config.update(config_overrides)
        self._graph: TradingAgentsGraph | None = None

    @property
    def config(self) -> dict:
        return self._config

    def initialize(
        self,
        selected_analysts: list[str] | None = None,
    ) -> None:
        analysts = selected_analysts or self.AVAILABLE_ANALYSTS
        self._graph = TradingAgentsGraph(
            selected_analysts=analysts,
            debug=False,
            config=self._config,
        )
        print(f"[ARCHON] TradingAgentsEngine initialized with analysts: {analysts}")

    def run(
        self,
        ticker: str,
        trade_date: str,
        selected_analysts: list[str] | None = None,
    ) -> dict[str, Any]:
        if not self._graph:
            self.initialize(selected_analysts)

        assert self._graph is not None
        state, decision = self._graph.propagate(ticker, trade_date)

        return {
            "ticker": ticker,
            "trade_date": trade_date,
            "decision": decision,
            "reports": {
                "market": state.get("market_report", ""),
                "sentiment": state.get("sentiment_report", ""),
                "news": state.get("news_report", ""),
                "fundamentals": state.get("fundamentals_report", ""),
            },
            "debate": {
                "invest": _safe_debate_state(state.get("investment_debate_state", {})),
                "risk": _safe_debate_state(state.get("risk_debate_state", {})),
            },
            "trader_plan": state.get("trader_investment_plan", ""),
            "investment_plan": state.get("investment_plan", ""),
            "final_trade_decision": state.get("final_trade_decision", ""),
            "engine": "trading-agents",
        }

    def run_multi(
        self,
        tickers: list[str],
        trade_date: str,
        selected_analysts: list[str] | None = None,
    ) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        for t in tickers:
            print(f"[ARCHON] TradingAgents analyzing {t} ...")
            out[t] = self.run(t, trade_date, selected_analysts)
        return out

    def reflect(self, returns_losses: dict) -> None:
        if self._graph:
            self._graph.reflect_and_remember(returns_losses)
            print("[ARCHON] TradingAgents reflection complete.")
        else:
            print("[ARCHON] Warning: reflect called before initialize.")

    def update_config(self, overrides: dict) -> None:
        self._config.update(overrides)
        self._graph = None


def _safe_debate_state(debate: dict) -> dict:
    keys = [
        "bull_history",
        "bear_history",
        "aggressive_history",
        "conservative_history",
        "neutral_history",
        "history",
        "current_response",
        "judge_decision",
    ]
    return {k: debate.get(k, "") for k in keys if k in debate}
