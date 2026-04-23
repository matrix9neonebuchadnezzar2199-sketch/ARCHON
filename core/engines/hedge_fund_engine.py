"""
ARCHON - AI Hedge Fund engine wrapper.

1. Try direct in-process import (if LangGraph stack is compatible).
2. On import/runtime failure, run vendors/ai-hedge-fund in its own Poetry venv
   via `scripts/run_hedge_fund_subprocess.py` and parse JSON from stdout.
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

_AIHF_ROOT = Path(__file__).resolve().parent.parent.parent / "vendors" / "ai-hedge-fund"
_SUBPROCESS_SCRIPT = (
    Path(__file__).resolve().parent.parent.parent / "scripts" / "run_hedge_fund_subprocess.py"
)


def _build_poetry_python_cmd() -> list[str]:
    """Resolve `poetry run python` as argv parts (no shell)."""
    po = shutil.which("poetry")
    if po:
        return [po, "run", "python"]
    return [sys.executable, "-m", "poetry", "run", "python"]


def _try_direct_import():
    try:
        if str(_AIHF_ROOT) not in sys.path:
            sys.path.insert(0, str(_AIHF_ROOT))

        from src.main import run_hedge_fund as _run_hf  # type: ignore

        return _run_hf
    except Exception as e:  # noqa: BLE001
        print(f"[ARCHON] AI-HF direct import failed ({type(e).__name__}: {e})")
        print("[ARCHON] Falling back to subprocess mode.")
        if str(_AIHF_ROOT) in sys.path:
            sys.path.remove(str(_AIHF_ROOT))
        return None


class HedgeFundEngine:
    """AI Hedge Fund wrapper: direct import first, then subprocess to vendor Poetry env."""

    AVAILABLE_ANALYSTS = [
        "warren_buffett",
        "charlie_munger",
        "aswath_damodaran",
        "ben_graham",
        "bill_ackman",
        "cathie_wood",
        "michael_burry",
        "mohnish_pabrai",
        "nassim_taleb",
        "peter_lynch",
        "phil_fisher",
        "stanley_druckenmiller",
        "rakesh_jhunjhunwala",
        "technical_analyst",
        "fundamentals_analyst",
        "growth_analyst",
        "news_sentiment_analyst",
        "sentiment_analyst",
        "valuation_analyst",
    ]

    def __init__(self) -> None:
        self._direct_fn = _try_direct_import()
        self._mode = "direct" if self._direct_fn else "subprocess"
        print(f"[ARCHON] HedgeFundEngine initialized in '{self._mode}' mode")

    @property
    def mode(self) -> str:
        return self._mode

    def run(
        self,
        tickers: list[str],
        start_date: str,
        end_date: str,
        portfolio: dict | None = None,
        selected_analysts: list[str] | None = None,
        model_name: str = "gpt-4.1",
        model_provider: str = "OpenAI",
        show_reasoning: bool = False,
    ) -> dict[str, Any]:
        if portfolio is None:
            portfolio = self._make_default_portfolio(tickers)

        if self._mode == "direct":
            return self._run_direct(
                tickers,
                start_date,
                end_date,
                portfolio,
                selected_analysts,
                model_name,
                model_provider,
                show_reasoning,
            )
        return self._run_subprocess(
            tickers,
            start_date,
            end_date,
            portfolio,
            selected_analysts,
            model_name,
            model_provider,
            show_reasoning,
        )

    def _run_direct(
        self,
        tickers,
        start_date,
        end_date,
        portfolio,
        selected_analysts,
        model_name,
        model_provider,
        show_reasoning,
    ) -> dict[str, Any]:
        try:
            if not self._direct_fn:
                raise RuntimeError("direct function missing")
            result = self._direct_fn(
                tickers=tickers,
                start_date=start_date,
                end_date=end_date,
                portfolio=portfolio,
                show_reasoning=show_reasoning,
                selected_analysts=selected_analysts or [],
                model_name=model_name,
                model_provider=model_provider,
            )
            return {
                "decisions": result.get("decisions"),
                "analyst_signals": result.get("analyst_signals", {}),
                "engine": "ai-hedge-fund",
                "mode": "direct",
            }
        except Exception as e:  # noqa: BLE001
            print(f"[ARCHON] Direct execution failed: {e}")
            print("[ARCHON] Retrying with subprocess...")
            self._mode = "subprocess"
            self._direct_fn = None
            return self._run_subprocess(
                tickers,
                start_date,
                end_date,
                portfolio,
                selected_analysts,
                model_name,
                model_provider,
                show_reasoning,
            )

    def _run_subprocess(
        self,
        tickers,
        start_date,
        end_date,
        portfolio,
        selected_analysts,
        model_name,
        model_provider,
        show_reasoning,
    ) -> dict[str, Any]:
        args_payload = json.dumps(
            {
                "tickers": tickers,
                "start_date": start_date,
                "end_date": end_date,
                "portfolio": portfolio,
                "selected_analysts": selected_analysts or [],
                "model_name": model_name,
                "model_provider": model_provider,
                "show_reasoning": show_reasoning,
            }
        )

        cmd = _build_poetry_python_cmd() + [str(_SUBPROCESS_SCRIPT), args_payload]
        try:
            result = subprocess.run(
                cmd,
                cwd=str(_AIHF_ROOT),
                capture_output=True,
                text=True,
                timeout=600,
            )
        except subprocess.TimeoutExpired:
            return {
                "decisions": None,
                "analyst_signals": {},
                "engine": "ai-hedge-fund",
                "mode": "subprocess",
                "error": "Subprocess timed out (600s)",
            }
        except Exception as e:  # noqa: BLE001
            return {
                "decisions": None,
                "analyst_signals": {},
                "engine": "ai-hedge-fund",
                "mode": "subprocess",
                "error": str(e),
            }

        if result.returncode != 0:
            print(f"[ARCHON] Subprocess stderr:\n{result.stderr}")
            return {
                "decisions": None,
                "analyst_signals": {},
                "engine": "ai-hedge-fund",
                "mode": "subprocess",
                "error": result.stderr,
            }

        for line in reversed(result.stdout.strip().split("\n")):
            s = line.strip()
            if s.startswith("{"):
                try:
                    parsed: dict = json.loads(s)
                except json.JSONDecodeError:
                    continue
                if "error" in parsed and "decisions" not in parsed:
                    return {
                        "decisions": None,
                        "analyst_signals": {},
                        "engine": "ai-hedge-fund",
                        "mode": "subprocess",
                        "error": parsed.get("error"),
                    }
                parsed["engine"] = "ai-hedge-fund"
                parsed["mode"] = "subprocess"
                return parsed

        return {
            "decisions": None,
            "analyst_signals": {},
            "engine": "ai-hedge-fund",
            "mode": "subprocess",
            "error": "No JSON output found in subprocess stdout",
            "raw_stdout": result.stdout[-2000:],
        }

    @staticmethod
    def _make_default_portfolio(tickers: list[str]) -> dict:
        return {
            "cash": 100_000,
            "margin_requirement": 0.0,
            "margin_used": 0.0,
            "positions": {
                ticker: {
                    "long": 0,
                    "short": 0,
                    "long_cost_basis": 0.0,
                    "short_cost_basis": 0.0,
                    "short_margin_used": 0.0,
                }
                for ticker in tickers
            },
            "realized_gains": {ticker: {"long": 0.0, "short": 0.0} for ticker in tickers},
        }
