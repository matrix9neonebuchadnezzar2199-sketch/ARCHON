"""
ARCHON — Backtest engine wrapper.

Wraps AI-HF's BacktestEngine (`src.backtesting.engine`) to run multi-day
backtests using the `run_hedge_fund` agent function.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Callable

_AIHF_ROOT = Path(__file__).resolve().parent.parent.parent / "vendors" / "ai-hedge-fund"
if str(_AIHF_ROOT) not in sys.path:
    sys.path.insert(0, str(_AIHF_ROOT))


class ArchonBacktestEngine:
    """
    Wraps AI-HF's BacktestEngine for in-process execution.
    (Phase 5: no per-day progress hook; optional callback reserved for future use.)
    """

    def __init__(
        self,
        tickers: list[str],
        start_date: str,
        end_date: str,
        initial_capital: float = 100_000.0,
        model_name: str = "gpt-4.1",
        model_provider: str = "OpenAI",
        selected_analysts: list[str] | None = None,
        margin_requirement: float = 0.0,
    ) -> None:
        self.tickers = tickers
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = float(initial_capital)
        self.model_name = model_name
        self.model_provider = model_provider
        self.selected_analysts = selected_analysts
        self.margin_requirement = margin_requirement
        self._progress_callback: Callable[[dict], None] | None = None

    def set_progress_callback(self, cb: Callable[[dict], None] | None) -> None:
        self._progress_callback = cb

    def run(self) -> dict[str, Any]:
        """
        Run the full backtest. Returns:
        {
            "performance_metrics": { ... },
            "portfolio_values": [ { "date", "value", ... } ],
            "total_days": int,
            "initial_capital": float,
            "final_value": float,
            "total_return_pct": float,
        }
        """
        from src.main import run_hedge_fund  # type: ignore[import-not-found]
        from src.backtesting.engine import BacktestEngine  # type: ignore[import-not-found]

        engine = BacktestEngine(
            agent=run_hedge_fund,
            tickers=self.tickers,
            start_date=self.start_date,
            end_date=self.end_date,
            initial_capital=self.initial_capital,
            model_name=self.model_name,
            model_provider=self.model_provider,
            selected_analysts=self.selected_analysts,
            initial_margin_requirement=self.margin_requirement,
        )

        performance_metrics = engine.run_backtest()
        raw_values = engine.get_portfolio_values()
        portfolio_values: list[dict[str, Any]] = []
        for pv in raw_values:
            d = pv.get("Date")
            if d is not None and hasattr(d, "strftime"):
                date_str: str = d.strftime("%Y-%m-%d")
            else:
                date_str = str(d) if d is not None else ""

            entry: dict[str, Any] = {
                "date": date_str,
                "value": float(pv.get("Portfolio Value", 0)),
            }
            for extra_key in (
                "Long Exposure",
                "Short Exposure",
                "Gross Exposure",
                "Net Exposure",
                "Long/Short Ratio",
            ):
                if extra_key in pv and pv[extra_key] is not None:
                    snake = extra_key.lower().replace(" ", "_").replace("/", "_")
                    try:
                        entry[snake] = float(pv[extra_key])  # type: ignore[index]
                    except (TypeError, ValueError):
                        entry[snake] = pv[extra_key]  # type: ignore[index]
            portfolio_values.append(entry)

        final_value = float(portfolio_values[-1]["value"]) if portfolio_values else self.initial_capital
        total_return_pct = ((final_value - self.initial_capital) / self.initial_capital) * 100

        metrics_dict: dict[str, Any] = (
            dict(performance_metrics) if performance_metrics else {}
        )

        return {
            "performance_metrics": metrics_dict,
            "portfolio_values": portfolio_values,
            "total_days": len(portfolio_values),
            "initial_capital": self.initial_capital,
            "final_value": final_value,
            "total_return_pct": round(float(total_return_pct), 2),
        }
