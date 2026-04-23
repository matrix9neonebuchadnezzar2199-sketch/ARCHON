"""
Detect whether the API key for the current LLM provider is set in the environment.
Ollama and other local backends do not require a cloud key.
"""
from __future__ import annotations

import os
from typing import Optional

# Provider name (lowercase) -> required env; None = no key needed
_PROVIDERS: dict[str, Optional[str]] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "xai": "XAI_API_KEY",
    "groq": "GROQ_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "ollama": None,
}


def env_name_for_provider(provider: str) -> Optional[str]:
    p = (provider or "openai").lower().strip()
    if p in _PROVIDERS:
        return _PROVIDERS[p]
    return "OPENAI_API_KEY"


def is_api_key_configured_for_provider(provider: str) -> bool:
    env = env_name_for_provider(provider)
    if env is None:
        return True
    return bool(os.getenv(env, "").strip())
