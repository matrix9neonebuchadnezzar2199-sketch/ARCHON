"""
ARCHON - Phase 1 engine smoke tests.

  poetry run python scripts/test_engines.py
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
load_dotenv(_ROOT / ".env")


def test_config() -> None:
    print("\n" + "=" * 60)
    print("STEP 0: Config import test")
    print("=" * 60)
    from core.config import ARCHON_CONFIG

    print(f"  llm_provider:    {ARCHON_CONFIG['llm_provider']}")
    print(f"  deep_think_llm:  {ARCHON_CONFIG['deep_think_llm']}")
    print(f"  quick_think_llm: {ARCHON_CONFIG['quick_think_llm']}")
    print(f"  enabled_gurus:   {len(ARCHON_CONFIG['enabled_gurus'])} gurus")
    print("  [OK] Config loaded successfully.\n")


def test_hedge_fund_engine_init() -> None:
    print("\n" + "=" * 60)
    print("STEP 1: HedgeFundEngine initialization")
    print("=" * 60)
    from core.engines.hedge_fund_engine import HedgeFundEngine

    eng = HedgeFundEngine()
    print(f"  Mode: {eng.mode}")
    print(f"  Available analysts: {len(eng.AVAILABLE_ANALYSTS)}")
    print(f"  [OK] HedgeFundEngine in '{eng.mode}' mode.\n")


def test_trading_agents_engine_init() -> None:
    print("\n" + "=" * 60)
    print("STEP 2: TradingAgentsEngine initialization")
    print("=" * 60)
    from core.engines.trading_agents_engine import TradingAgentsEngine

    eng = TradingAgentsEngine()
    print(f"  Available analysts: {eng.AVAILABLE_ANALYSTS}")
    print(f"  Config llm_provider: {eng.config.get('llm_provider')}")
    print("  [OK] TradingAgentsEngine created (graph not yet built).\n")


def test_ultimate_engine_init() -> None:
    print("\n" + "=" * 60)
    print("STEP 3: UltimateEngine initialization")
    print("=" * 60)
    from core.engines.ultimate_engine import UltimateEngine

    eng = UltimateEngine()
    print(f"  Config sample keys: {list(eng.config.keys())[:8]}")
    print("  [OK] UltimateEngine created (not yet fully initialized).\n")


def test_live_run() -> None:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        print("\n" + "=" * 60)
        print("STEP 4: SKIPPED (no OPENAI_API_KEY in .env)")
        print("=" * 60)
        print("  Set OPENAI_API_KEY in .env to run live tests.\n")
        return

    print("\n" + "=" * 60)
    print("STEP 4: Live API test (AI Hedge Fund, AAPL)")
    print("=" * 60)
    from core.engines.hedge_fund_engine import HedgeFundEngine

    eng = HedgeFundEngine()
    result = eng.run(
        tickers=["AAPL"],
        start_date="2025-01-01",
        end_date="2025-01-15",
        selected_analysts=["warren_buffett", "technical_analyst"],
        model_name="gpt-4.1-mini",
        model_provider="OpenAI",
        show_reasoning=False,
    )
    print(f"  Engine: {result.get('engine')}")
    print(f"  Mode:   {result.get('mode')}")
    print(f"  Has decisions: {result.get('decisions') is not None}")
    print(f"  Analyst signals keys: {list(result.get('analyst_signals', {}).keys())}")
    if result.get("error"):
        print(f"  Error: {result['error'][:500]}")
    else:
        print("  [OK] Live run completed.\n")


def main() -> None:
    print("=" * 60)
    print("  ARCHON - Phase 1 Engine Test Suite")
    print("=" * 60)
    test_config()
    test_hedge_fund_engine_init()
    test_trading_agents_engine_init()
    test_ultimate_engine_init()
    test_live_run()
    print("\n" + "=" * 60)
    print("  ALL PHASE 1 TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
