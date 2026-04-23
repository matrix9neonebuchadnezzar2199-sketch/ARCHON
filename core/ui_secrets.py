"""
UI / API から保存した API キーを .memory 配下の JSON に保持し、起動時に os.environ に戻す。
（.env より後にロードし、上書きする。Docker では .memory がボリューム想定。）
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from core.config import BASE_DIR

# 設定画面で扱う（環境変数名と 1:1）
KNOWN_SECRET_ENVS: tuple[str, ...] = (
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "XAI_API_KEY",
    "GROQ_API_KEY",
    "DEEPSEEK_API_KEY",
    "FINANCIAL_DATASETS_API_KEY",
    "ALPHA_VANTAGE_API_KEY",
    "OLLAMA_BASE_URL",  # UI 保存（秘密ではないが同ファイルで永続）
    "OPENAI_BASE_URL",  # LM Studio 等
)

_SECRETS_FILE = Path(os.getenv("ARCHON_UI_SECRETS_FILE", str(BASE_DIR / ".memory" / "ui_secrets.json")))


def _read_file() -> dict:
    if not _SECRETS_FILE.is_file():
        return {}
    try:
        raw = _SECRETS_FILE.read_text(encoding="utf-8")
        data = json.loads(raw) if raw.strip() else {}
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _write_file(data: dict) -> None:
    _SECRETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _SECRETS_FILE.write_text(
        json.dumps({k: v for k, v in data.items() if isinstance(v, str) and v.strip()}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def load_ui_secrets_to_environ() -> None:
    """起動直後: JSON → os.environ（値があるキーのみ上書き）。"""
    data = _read_file()
    for k, v in data.items():
        if not isinstance(v, str) or not v.strip():
            continue
        os.environ[k] = v.strip()


def set_secret_env(name: str, value: str | None) -> None:
    """
    空でない value を保存・適用。None や空文字は何もしない（既存を維持）。
    キー削除が必要な場合は別途 clear_secret_env を使う（将来用）。
    """
    if not value or not str(value).strip():
        return
    name = name.strip()
    v = str(value).strip()
    os.environ[name] = v
    data = _read_file()
    data[name] = v
    _write_file(data)


def clear_secret_env(name: str) -> None:
    """キーをファイルと os.environ から除去（.pop で KeyError は握らない）。"""
    name = name.strip()
    os.environ.pop(name, None)
    data = _read_file()
    if name in data:
        del data[name]
        _write_file(data)


def secrets_set_flags() -> dict[str, bool]:
    """各 KNOWN について、os.environ に非空の値が載っているか。"""
    return {k: bool(os.getenv(k, "").strip()) for k in KNOWN_SECRET_ENVS}
