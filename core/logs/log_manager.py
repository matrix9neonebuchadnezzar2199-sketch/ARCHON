"""
ARCHON — Log Manager.

Scans TradingAgents log files and ARCHON run history.
Provides listing and detail retrieval for the Logs UI.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.config import ARCHON_CONFIG


class LogManager:
    """Manages run log discovery and retrieval."""

    def __init__(
        self,
        results_dir: str | None = None,
        archon_runs_dir: str | None = None,
    ) -> None:
        self.results_dir = Path(
            results_dir or ARCHON_CONFIG.get("results_dir", ".results")
        )
        if archon_runs_dir is not None:
            self.archon_runs_dir = Path(archon_runs_dir)
        else:
            self.archon_runs_dir = self.results_dir / "archon_runs"
        self.archon_runs_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _ticker_str(meta: dict[str, Any], stem: str) -> str:
        t = meta.get("ticker")
        if t is not None and str(t) != "":
            return str(t)
        ts = meta.get("tickers", "")
        if isinstance(ts, list):
            return ", ".join(str(x) for x in ts) if ts else ""
        if ts is None or str(ts) == "":
            return stem
        return str(ts)

    @staticmethod
    def _ticker_in_row(t: str, ticker: str) -> bool:
        fu, tu = ticker.upper(), t.upper()
        if fu in tu:
            return True
        for part in t.split(","):
            if fu in part.strip().upper():
                return True
        return False

    def list_logs(
        self, engine: str | None = None, ticker: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Return a list of log entries.
        Each entry: { id, engine, ticker, date, file_path, size_bytes }
        """
        out: list[dict[str, Any]] = []

        if engine in (None, "trading-agents"):
            if self.results_dir.exists():
                for ticker_dir in sorted(self.results_dir.iterdir()):
                    if not ticker_dir.is_dir() or ticker_dir.name == "archon_runs":
                        continue
                    if ticker and ticker_dir.name.upper() != ticker.upper():
                        continue
                    log_dir = ticker_dir / "TradingAgentsStrategy_logs"
                    if not log_dir.exists():
                        continue
                    for log_file in sorted(
                        log_dir.glob("full_states_log_*.json"), reverse=True
                    ):
                        date_part = log_file.stem.replace("full_states_log_", "")
                        out.append(
                            {
                                "id": f"ta-{ticker_dir.name}-{date_part}",
                                "engine": "trading-agents",
                                "ticker": ticker_dir.name,
                                "date": date_part,
                                "file_path": str(log_file),
                                "size_bytes": log_file.stat().st_size,
                            }
                        )

        for log_file in sorted(self.archon_runs_dir.glob("*.json"), reverse=True):
            try:
                with open(log_file, encoding="utf-8") as f:
                    meta = json.load(f)
            except (json.JSONDecodeError, OSError, UnicodeDecodeError, TypeError):
                continue
            en = str(meta.get("engine", "archon"))
            if engine is not None and en != engine:
                continue
            t = self._ticker_str(meta, log_file.stem)
            if ticker and not self._ticker_in_row(t, ticker):
                continue
            d = str(meta.get("date", log_file.stem))
            out.append(
                {
                    "id": f"archon-{log_file.stem}",
                    "engine": en,
                    "ticker": t,
                    "date": d,
                    "file_path": str(log_file),
                    "size_bytes": log_file.stat().st_size,
                }
            )

        return sorted(
            out,
            key=lambda L: f"{L.get('date', '')!s} {L.get('id', '')!s}",
            reverse=True,
        )

    def get_log_detail(self, log_id: str) -> dict[str, Any] | None:
        all_logs = self.list_logs()
        for entry in all_logs:
            if entry["id"] == log_id:
                try:
                    with open(entry["file_path"], encoding="utf-8") as f:
                        content: Any = json.load(f)
                    return {**entry, "content": content}
                except (json.JSONDecodeError, OSError, UnicodeDecodeError, TypeError):
                    return {**entry, "content": None, "error": "Failed to read file"}
        return None

    def save_run_log(
        self,
        engine: str,
        tickers: list[str] | str,
        date: str,
        result: dict[str, Any],
    ) -> str:
        """Save an ARCHON engine run result. Returns the log ID."""
        now = datetime.now(timezone.utc)
        ts = now.strftime("%Y%m%d_%H%M%S")
        ticker_str = (
            tickers
            if isinstance(tickers, str)
            else "_".join(s.replace(" ", "_") for s in tickers)
        )
        safe_en = engine.replace(" ", "_").replace("/", "-")
        filename = f"{safe_en}_{ticker_str}_{ts}.json"
        for ch in r'\\/*?"<>|':
            filename = filename.replace(ch, "_")
        if len(filename) > 200:
            filename = f"{safe_en[:20]}_{ts}.json"
        path = self.archon_runs_dir / filename
        payload = {
            "engine": engine,
            "tickers": tickers,
            "date": date,
            "timestamp": now.isoformat(),
            "result": result,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False, default=str)

        return f"archon-{path.stem}"

    def delete_log(self, log_id: str) -> bool:
        for entry in self.list_logs():
            if entry["id"] == log_id:
                try:
                    Path(entry["file_path"]).unlink()
                    return True
                except OSError:
                    return False
        return False

    def get_log_count(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for log in self.list_logs():
            eng = str(log.get("engine", "unknown"))
            counts[eng] = counts.get(eng, 0) + 1
        return counts
