r"""
ARCHON - Phase 2 API smoke test.

1) In another terminal:
   cd F:\Cursor\ARCHON
   poetry run uvicorn serve:app --reload --port 8000

2) This script:
   poetry run python scripts/test_backend.py
"""

import sys

import httpx

BASE = "http://127.0.0.1:8000"


def test_health() -> None:
    print("\n=== Test: ARCHON Health ===")
    r = httpx.get(f"{BASE}/api/archon/health", timeout=10)
    print(f"  Status: {r.status_code}")
    data = r.json()
    print(f"  Body:   {data}")
    assert r.status_code == 200
    assert data.get("system") == "ARCHON"
    assert data.get("status") == "ok"
    print("  [OK]")


def test_ta_analysts() -> None:
    print("\n=== Test: TA Analysts List ===")
    r = httpx.get(f"{BASE}/api/ta/analysts", timeout=10)
    print(f"  Status: {r.status_code}")
    data = r.json()
    print(f"  Analysts: {[a['key'] for a in data['analysts']]}")
    assert r.status_code == 200
    assert len(data["analysts"]) == 4
    print("  [OK]")


def test_ultimate_gurus() -> None:
    print("\n=== Test: Ultimate Gurus List ===")
    r = httpx.get(f"{BASE}/api/ultimate/gurus", timeout=30)
    print(f"  Status: {r.status_code}")
    data = r.json()
    n = len(data.get("gurus", []))
    print(f"  Gurus count: {n}")
    if data.get("error"):
        print(f"  (note: {data['error'][:120]})")
    assert r.status_code == 200
    assert n > 0
    print("  [OK]")


def test_settings() -> None:
    print("\n=== Test: ARCHON Settings ===")
    r = httpx.get(f"{BASE}/api/archon/settings", timeout=10)
    print(f"  Status: {r.status_code}")
    j = r.json()
    config = j.get("config", {})
    print(f"  Provider: {config.get('llm_provider')}")
    print(f"  Deep LLM: {config.get('deep_think_llm')}")
    assert r.status_code == 200
    print("  [OK]")


def test_settings_models() -> None:
    print("\n=== Test: Available Models ===")
    r = httpx.get(f"{BASE}/api/archon/settings/models", timeout=15)
    print(f"  Status: {r.status_code}")
    data = r.json()
    print(f"  Models count: {len(data.get('models', []))}")
    assert r.status_code == 200
    assert len(data.get("models", [])) > 0
    print("  [OK]")


def test_aihf_agents() -> None:
    print("\n=== Test: AI-HF Agents List ===")
    r = httpx.get(f"{BASE}/hedge-fund/agents", timeout=30)
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        agents = data.get("agents", data) if isinstance(data, dict) else data
        if isinstance(agents, list):
            print(f"  Agents count: {len(agents)}")
        else:
            print(f"  Response keys: {list(data.keys()) if isinstance(data, dict) else 'n/a'}")
        print("  [OK]")
    else:
        print(f"  [SKIP] AI-HF not loaded. Body: {r.text[:200]}")


def main() -> None:
    print("=" * 60)
    print("  ARCHON Phase 2 - Backend API test")
    print("=" * 60)
    print(f"  Target: {BASE}")

    try:
        httpx.get(f"{BASE}/api/archon/health", timeout=3)
    except httpx.ConnectError:
        print("\n  [ERROR] Server not running.")
        print("  Start with: poetry run uvicorn serve:app --reload --port 8000")
        sys.exit(1)

    test_health()
    test_ta_analysts()
    test_ultimate_gurus()
    test_settings()
    test_settings_models()
    test_aihf_agents()

    print("\n" + "=" * 60)
    print("  ALL PHASE 2 TESTS COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
