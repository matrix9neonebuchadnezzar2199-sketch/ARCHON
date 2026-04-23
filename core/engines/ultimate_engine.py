"""
ARCHON - Ultimate (fusion) engine.

Phase 2: Guru panel + TradingAgents debate → per-ticker fusion and verdict.
"""

from __future__ import annotations

from typing import Any, Callable

from core.config import ARCHON_CONFIG
from core.engines.hedge_fund_engine import HedgeFundEngine
from core.engines.trading_agents_engine import TradingAgentsEngine


def _classify_text_signal(raw: str) -> str:
    s = raw.lower().strip()
    if s in ("bullish", "bearish", "neutral"):
        return s
    if "bull" in s and "bear" not in s:
        return "bullish"
    if "bear" in s:
        return "bearish"
    return "neutral"


class UltimateEngine:
    """
    Run Guru panel + TradingAgents, extract signals, classify to bull/bear/neutral,
    and build a simple fused verdict.
    """

    def __init__(self, config: dict | None = None) -> None:
        self.config = config or ARCHON_CONFIG.copy()
        self._hf_engine: HedgeFundEngine | None = None
        self._ta_engine: TradingAgentsEngine | None = None
        self._progress_callback: Callable[[str, str, str | None], None] | None = None

    def set_progress_callback(
        self,
        cb: Callable[[str, str, str | None], None] | None,
    ) -> None:
        self._progress_callback = cb

    def _emit(self, agent: str, status: str, ticker: str | None = None) -> None:
        if self._progress_callback:
            self._progress_callback(agent, status, ticker)

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
        self._emit("system", "UltimateEngine initialized (Phase 2)")

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

        self._emit("guru-panel", "Running Guru investors (AI Hedge Fund)…", None)
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
        self._emit("guru-panel", "Guru panel complete", None)

        self._emit("signal-classifier", "Classifying guru signals into bull/bear/neutral…", None)
        guru_signals = self._extract_guru_signals(hf_result, tickers)

        ta_results: dict[str, Any] = {}
        for i, ticker in enumerate(tickers):
            self._emit(
                "trading-agents",
                f"Analyzing {ticker} ({i + 1}/{len(tickers)})",
                ticker,
            )
            ta_results[ticker] = self._ta_engine.run(
                ticker,
                trade_date,
                self.config.get("selected_analysts"),
            )
            self._emit("trading-agents", f"Completed {ticker}", ticker)

        self._emit("fusion", "Merging guru + TradingAgents results…", None)
        fusion: dict[str, Any] = {}
        for ticker in tickers:
            camps = guru_signals.get(
                ticker, {"bullish": [], "bearish": [], "neutral": []}
            )
            ticker_ta = ta_results.get(ticker, {})
            fusion[ticker] = {
                "guru_signals": {
                    "bullish": camps.get("bullish", []),
                    "bearish": camps.get("bearish", []),
                    "neutral": camps.get("neutral", []),
                },
                "guru_bull_count": len(camps.get("bullish", [])),
                "guru_bear_count": len(camps.get("bearish", [])),
                "guru_neutral_count": len(camps.get("neutral", [])),
                "ta_decision": ticker_ta.get("decision", ""),
                "ta_reports": ticker_ta.get("reports", {}),
                "ta_debate": ticker_ta.get("debate", {}),
                "ta_trader_plan": ticker_ta.get("trader_plan", ""),
                "verdict": self._compute_verdict(camps, ticker_ta),
            }
        self._emit("fusion", "Fusion complete", None)

        return {
            "tickers": tickers,
            "trade_date": trade_date,
            "fusion": fusion,
            "hedge_fund_result": hf_result,
            "trading_agents_result": ta_results,
            "engine": "ultimate",
            "phase": 2,
        }

    def _extract_guru_signals(
        self, hf_result: dict, tickers: list[str]
    ) -> dict[str, dict[str, list[dict]]]:
        """
        Parse analyst_signals. AI-HF: {guru: {TICKER: {signal, confidence, reasoning}}}.
        Flat: {guru: {signal, confidence, ...}} (no per-ticker keys) → same signal for every ticker.
        """
        analyst_signals: dict = hf_result.get("analyst_signals", {}) or {}
        per_ticker: dict[str, dict[str, list[dict]]] = {
            t: {"bullish": [], "bearish": [], "neutral": []} for t in tickers
        }
        if not tickers:
            return per_ticker

        for guru_key, data in analyst_signals.items():
            if not isinstance(data, dict):
                continue

            nested = any(
                t in data
                and isinstance(data.get(t), dict)
                and "signal" in (data.get(t) or {})
                for t in tickers
            )

            if nested:
                for t in tickers:
                    if t in data and isinstance(data[t], dict) and "signal" in data[t]:
                        self._append_camp(per_ticker[t], guru_key, data[t])
            elif "signal" in data and "confidence" in data:
                for t in tickers:
                    self._append_camp(per_ticker[t], guru_key, data)
            else:
                for sym, signal_data in data.items():
                    if not isinstance(signal_data, dict) or "signal" not in signal_data:
                        continue
                    if sym in per_ticker:
                        self._append_camp(per_ticker[sym], guru_key, signal_data)

        return per_ticker

    @staticmethod
    def _append_camp(
        camp: dict[str, list[dict]],
        guru_key: str,
        signal_data: dict,
    ) -> None:
        raw_sig = signal_data.get("signal")
        sig = "neutral"
        if isinstance(raw_sig, str):
            sig = _classify_text_signal(raw_sig)
        conf = signal_data.get("confidence", 0)
        try:
            c = float(conf) if conf is not None else 0.0
        except (TypeError, ValueError):
            c = 0.0
        if c > 1.0:
            c = c / 100.0
        reasoning = str(signal_data.get("reasoning", ""))[:500]
        entry: dict = {
            "guru": guru_key,
            "signal": sig,
            "confidence": c,
            "reasoning": reasoning,
        }
        if sig in camp:
            camp[sig].append(entry)

    def _compute_verdict(
        self, guru_camps: dict[str, list[dict]], ta_result: dict
    ) -> dict[str, Any]:
        n_bull = len(guru_camps.get("bullish", []))
        n_bear = len(guru_camps.get("bearish", []))
        n_neut = len(guru_camps.get("neutral", []))
        total = n_bull + n_bear + n_neut or 1

        ta_decision_raw = ta_result.get("decision", "")
        if isinstance(ta_decision_raw, dict):
            ta_action = str(ta_decision_raw.get("action", "hold")).lower()
        else:
            ta_action = str(ta_decision_raw).lower()

        ta_is_buy = any(w in ta_action for w in ("buy", "long", "bullish"))
        ta_is_sell = any(w in ta_action for w in ("sell", "short", "bearish"))

        if n_bull > n_bear and n_bull > n_neut:
            guru_lean = "buy"
        elif n_bear > n_bull and n_bear > n_neut:
            guru_lean = "sell"
        else:
            guru_lean = "hold"

        if guru_lean == "buy" and ta_is_buy:
            action, aligned = "buy", True
        elif guru_lean == "sell" and ta_is_sell:
            action, aligned = "sell", True
        elif guru_lean == "hold":
            action, aligned = "hold", False
        else:
            if (n_bull + n_bear) > n_neut:
                action = guru_lean
            else:
                action = "hold"
            aligned = False

        confidence = round(max(n_bull, n_bear, n_neut) / float(total), 2)
        if aligned:
            confidence = min(confidence + 0.15, 1.0)

        part1 = f"Guru vote: {n_bull} bullish, {n_bear} bearish, {n_neut} neutral → {guru_lean}."
        part2 = f"TradingAgents decision: {ta_action.upper() if ta_action else 'N/A'}."
        part3 = f"{'ALIGNED' if aligned else 'DIVERGENT'} → final: {str(action).upper()}."

        return {
            "action": action,
            "confidence": float(confidence),
            "aligned": bool(aligned),
            "guru_lean": guru_lean,
            "ta_lean": "buy"
            if ta_is_buy
            else ("sell" if ta_is_sell else "hold"),
            "reasoning": " ".join((part1, part2, part3)),
        }

    def reflect(self, returns_losses: dict) -> None:
        if self._ta_engine:
            self._ta_engine.reflect(returns_losses)
