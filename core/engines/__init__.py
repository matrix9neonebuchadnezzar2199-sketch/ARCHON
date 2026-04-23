from __future__ import annotations

__all__ = ["ArchonBacktestEngine", "HedgeFundEngine", "TradingAgentsEngine", "UltimateEngine"]


def __getattr__(name: str):
    if name == "HedgeFundEngine":
        from core.engines.hedge_fund_engine import HedgeFundEngine

        return HedgeFundEngine
    if name == "TradingAgentsEngine":
        from core.engines.trading_agents_engine import TradingAgentsEngine

        return TradingAgentsEngine
    if name == "UltimateEngine":
        from core.engines.ultimate_engine import UltimateEngine

        return UltimateEngine
    if name == "ArchonBacktestEngine":
        from core.engines.backtest_engine import ArchonBacktestEngine

        return ArchonBacktestEngine
    msg = f"module {__name__!r} has no attribute {name!r}"
    raise AttributeError(msg)
