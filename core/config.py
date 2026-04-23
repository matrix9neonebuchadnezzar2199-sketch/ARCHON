"""
ARCHON - unified configuration.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
VENDORS_DIR = BASE_DIR / "vendors"
AIHF_DIR = VENDORS_DIR / "ai-hedge-fund"
TA_DIR = VENDORS_DIR / "TradingAgents"

ARCHON_CONFIG: dict = {
    "base_dir": str(BASE_DIR),
    "data_cache_dir": os.getenv("ARCHON_CACHE_DIR", str(BASE_DIR / ".cache")),
    "results_dir": os.getenv("ARCHON_RESULTS_DIR", str(BASE_DIR / ".results")),
    "memory_dir": os.getenv("ARCHON_MEMORY_DIR", str(BASE_DIR / ".memory")),
    "llm_provider": os.getenv("LLM_PROVIDER", "openai"),
    "deep_think_llm": os.getenv("DEEP_THINK_MODEL", "gpt-4.1"),
    "quick_think_llm": os.getenv("QUICK_THINK_MODEL", "gpt-4.1-mini"),
    "guru_llm": os.getenv("GURU_MODEL", "gpt-4.1"),
    "anthropic_effort": os.getenv("ANTHROPIC_EFFORT", None),
    "openai_reasoning_effort": os.getenv("OPENAI_REASONING_EFFORT", None),
    "google_thinking_level": os.getenv("GOOGLE_THINKING_LEVEL", None),
    "output_language": os.getenv("OUTPUT_LANGUAGE", "English"),
    "enabled_gurus": [
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
    ],
    "selected_analysts": [
        "fundamentals",
        "sentiment",
        "news",
        "market",
    ],
    "enable_valuation_agent": True,
    "max_invest_debate_rounds": 2,
    "max_risk_debate_rounds": 2,
    "enable_memory": True,
    "enable_reflection": True,
    "initial_cash": 100_000,
    "margin_requirement": 0.0,
    "allow_short": True,
    "data_vendors": {
        "core_stock_apis": "yfinance",
        "technical_indicators": "yfinance",
        "fundamental_data": "yfinance",
        "news_data": "yfinance",
    },
    "frontend_port": 5173,
    "backend_port": 8000,
}
