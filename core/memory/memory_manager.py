"""
ARCHON — Memory Manager.

Manages TradingAgents' FinancialSituationMemory instances.
Provides persistence (JSON snapshots), querying, and reflection triggers.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

from core.config import ARCHON_CONFIG

MEMORY_NAMES = [
    "bull_memory",
    "bear_memory",
    "trader_memory",
    "invest_judge_memory",
    "portfolio_manager_memory",
]

_lock = threading.Lock()


class MemoryManager:
    """
    Wraps access to TradingAgentsEngine's in-memory FinancialSituationMemory objects.
    Adds persistence (save/load JSON) and query capability.
    """

    def __init__(self, memory_dir: str | None = None) -> None:
        self.memory_dir = Path(memory_dir or ARCHON_CONFIG.get("memory_dir", ".memory"))
        self.memory_dir.mkdir(parents=True, exist_ok=True)

    def get_all_memories(self, ta_engine: Any | None = None) -> dict[str, list[dict]]:
        """
        Get all memory entries from a live TradingAgentsEngine, or from disk.
        Returns { memory_name: [ { situation, recommendation }, ... ] }
        """
        if ta_engine and ta_engine._graph:
            return self._extract_from_engine(ta_engine)
        return self._load_from_disk()

    def _extract_from_engine(self, ta_engine: Any) -> dict[str, list[dict]]:
        graph = ta_engine._graph
        result: dict[str, list[dict]] = {}
        for name in MEMORY_NAMES:
            mem = getattr(graph, name, None)
            if mem is None:
                result[name] = []
                continue
            entries = []
            for i, doc in enumerate(mem.documents):
                rec = mem.recommendations[i] if i < len(mem.recommendations) else ""
                entries.append({"situation": doc, "recommendation": rec})
            result[name] = entries
        return result

    def _load_from_disk(self) -> dict[str, list[dict]]:
        result: dict[str, list[dict]] = {}
        for name in MEMORY_NAMES:
            path = self.memory_dir / f"{name}.json"
            if path.exists():
                try:
                    with open(path, encoding="utf-8") as f:
                        loaded = json.load(f)
                    result[name] = loaded if isinstance(loaded, list) else []
                except (json.JSONDecodeError, OSError):
                    result[name] = []
            else:
                result[name] = []
        return result

    def save_to_disk(self, ta_engine: Any) -> dict[str, int]:
        """Save current in-memory state to JSON files. Returns { name: count }."""
        memories = self._extract_from_engine(ta_engine)
        counts: dict[str, int] = {}
        with _lock:
            for name, entries in memories.items():
                path = self.memory_dir / f"{name}.json"
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(entries, f, indent=2, ensure_ascii=False)
                counts[name] = len(entries)
        return counts

    def load_into_engine(self, ta_engine: Any) -> dict[str, int]:
        """Load persisted memories back into a live engine. Returns { name: count }."""
        disk_data = self._load_from_disk()
        graph = ta_engine._graph
        counts: dict[str, int] = {}
        if not graph:
            return counts
        for name in MEMORY_NAMES:
            mem = getattr(graph, name, None)
            if mem is None:
                counts[name] = 0
                continue
            if hasattr(mem, "clear"):
                mem.clear()  # replace disk snapshot, avoid duplicating
            entries = disk_data.get(name, [])
            if entries:
                pairs = [
                    (e["situation"], e["recommendation"])
                    for e in entries
                    if "situation" in e
                    and "recommendation" in e
                ]
                if pairs:
                    mem.add_situations(pairs)  # type: ignore[union-attr]
            counts[name] = len(mem.documents) if mem else 0
        return counts

    def query_memory(
        self, ta_engine: Any, memory_name: str, query: str, n_matches: int = 3
    ) -> list[dict[str, Any]]:
        """Query a specific memory using BM25."""
        if not ta_engine or not ta_engine._graph:
            return []
        graph = ta_engine._graph
        mem = getattr(graph, memory_name, None)
        if mem is None or not mem.documents:
            return []
        return list(mem.get_memories(query, n_matches=n_matches))

    def clear_memory(self, memory_name: str | None = None) -> None:
        """Clear memory from disk. If name is None, clear all."""
        with _lock:
            if memory_name:
                path = self.memory_dir / f"{memory_name}.json"
                if path.exists():
                    path.unlink()
            else:
                for name in MEMORY_NAMES:
                    path = self.memory_dir / f"{name}.json"
                    if path.exists():
                        path.unlink()

    def get_stats(self, ta_engine: Any | None = None) -> dict[str, Any]:
        """Return memory stats: per-name count, total, disk files."""
        disk_data = self._load_from_disk()
        disk_counts = {name: len(entries) for name, entries in disk_data.items()}
        live_counts: dict[str, int] = {}
        if ta_engine and ta_engine._graph:
            for name in MEMORY_NAMES:
                mem = getattr(ta_engine._graph, name, None)
                live_counts[name] = len(mem.documents) if mem else 0
        return {
            "disk": disk_counts,
            "live": live_counts,
            "total_disk": sum(disk_counts.values()),
            "total_live": sum(live_counts.values()),
            "memory_dir": str(self.memory_dir),
        }
