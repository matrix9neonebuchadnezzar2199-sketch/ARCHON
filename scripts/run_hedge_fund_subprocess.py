"""
ARCHON - AI Hedge Fund subprocess entrypoint

Run from `vendors/ai-hedge-fund` with: poetry run python <path-to-this-script> '<json>'

The AI-HF virtualenv (that project's own poetry lock) is used, avoiding LangGraph
version clashes with the ARCHON root venv.
"""

import json
import os
import sys

if os.getcwd() not in sys.path:
    sys.path.insert(0, os.getcwd())

from src.main import run_hedge_fund  # type: ignore


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No arguments provided"}))
        sys.exit(1)

    try:
        args = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON argument: {e}"}))
        sys.exit(1)

    tickers = args["tickers"]
    portfolio = args.get("portfolio")
    if not portfolio:
        portfolio = {
            "cash": 100_000,
            "margin_requirement": 0.0,
            "margin_used": 0.0,
            "positions": {
                t: {
                    "long": 0,
                    "short": 0,
                    "long_cost_basis": 0.0,
                    "short_cost_basis": 0.0,
                    "short_margin_used": 0.0,
                }
                for t in tickers
            },
            "realized_gains": {t: {"long": 0.0, "short": 0.0} for t in tickers},
        }

    try:
        result = run_hedge_fund(
            tickers=tickers,
            start_date=args["start_date"],
            end_date=args["end_date"],
            portfolio=portfolio,
            show_reasoning=args.get("show_reasoning", False),
            selected_analysts=args.get("selected_analysts", []),
            model_name=args.get("model_name", "gpt-4.1"),
            model_provider=args.get("model_provider", "OpenAI"),
        )

        output = {
            "decisions": result.get("decisions"),
            "analyst_signals": result.get("analyst_signals", {}),
        }

        # Single final JSON line for HedgeFundEngine to parse
        print(json.dumps(output, default=str))
    except Exception as e:  # noqa: BLE001 — subprocess must always emit JSON
        print(json.dumps({"error": str(e)}, default=str))
        sys.exit(1)


if __name__ == "__main__":
    main()
