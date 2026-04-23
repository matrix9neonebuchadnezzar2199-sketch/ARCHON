<div align="center">

# ARCHON

**AI Trading System — Guru Panel + Multi-Agent Debate + Memory**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-teal.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)

</div>

---

ARCHON integrates two open-source AI trading frameworks into a unified system with a modern dark-themed dashboard:

- **[AI Hedge Fund](https://github.com/virattt/ai-hedge-fund)** — 13 famous investor personas (Buffett, Munger, Damodaran, …) + 6 functional analysts
- **[TradingAgents](https://github.com/TauricResearch/TradingAgents)** — Multi-agent debate framework (Bull/Bear researchers, Trader, Risk team, Portfolio Manager) with BM25 memory

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ARCHON Dashboard                      │
│  React 19 · Vite · Tailwind · shadcn/ui · Recharts      │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Ultimate │ AI Hedge │ Trading  │ Backtest │  Memory /   │
│   Mode   │   Fund   │  Agents  │          │   Logs      │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                  FastAPI Backend (SSE)                    │
├──────────┬──────────────────────────────────┬────────────┤
│ Hedge    │       TradingAgentsEngine        │  Memory    │
│ Fund     │  (Analyst→Debate→Trader→Risk→PM) │  Manager   │
│ Engine   ├──────────────────────────────────┤  + Log     │
│ (13 guru │  Ultimate Engine (Fusion)         │  Manager   │
│ + 6 func)│  Guru votes + TA → Verdict       │            │
├──────────┴──────────────────────────────────┴────────────┤
│                  vendors/ (git submodules)                 │
│        ai-hedge-fund/          TradingAgents/             │
└─────────────────────────────────────────────────────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **Ultimate Mode** | Fuses 13 guru signals with TradingAgents debate for per-ticker buy/sell/hold verdicts |
| **AI Hedge Fund** | 19 selectable analysts with signal/confidence/reasoning per ticker |
| **Trading Agents** | Bull/Bear debate, risk discussion, final trade decision with analyst reports |
| **Backtest** | Historical simulation with equity curve chart, Sharpe/Sortino/drawdown metrics |
| **Portfolio** | Real-time position tracking with P&L |
| **Memory** | BM25-indexed agent memories — save/load/query/clear |
| **Logs** | Auto-saved JSON run logs per engine, with viewer |
| **Settings** | LLM provider, model selection, debate rounds, output language |
| **SSE Streaming** | Real-time progress for all engine runs |

## Upstream comparison (AI Hedge Fund · TradingAgents · ARCHON)

The tables below place **ARCHON** alongside the two upstream open-source projects ARCHON embeds. Symbol legend: **✅** = yes / strong, **❌** = no, **△** = partial or limited.

### Merits & demerits

| Item | [AI Hedge Fund](https://github.com/virattt/ai-hedge-fund) | [TradingAgents](https://github.com/TauricResearch/TradingAgents) | **ARCHON** |
| :--- | :--- | :--- | :--- |
| **Purpose** | PoC for AI investment judgment (educational) | Research framework simulating a trading org | **Unified stack: Guru + TA + Ultimate debate + memory; education / research** |
| **Author** | Individual (virattt) | Tauric / UCLA (research) | **This monorepo (v0.2.0+)** |
| **Academic backing** | None | [arXiv](https://arxiv.org/abs/2412.20138) (experiments) | **No own paper; inherits TA’s research lineage indirectly** |
| **Agent count** | Up to ~19 (gurus + analysts + risk/PM) | ~10 (analysts, bull/bear, trader, risk, PM) | **13 gurus + TA/analysts + invest/risk debate rounds (configurable)** |
| **Investor personas** | ✅ 13 famous gurus | ❌ Role-based only | **✅ (13, toggle via settings)** |
| **Debate mechanism** | ❌ Independent signals | ✅ Bull/Bear + risk | **✅ (`max_invest_debate_rounds` / `max_risk_debate_rounds`)** |
| **Memory / learning** | ❌ Stateless | ✅ BM25 + reflection | **✅ (memory dir + `enable_reflection` / `enable_memory`)** |
| **LLM two-layer** | ❌ Single model path | ✅ Deep + quick | **✅ (deep / quick / guru models)** |
| **LLM providers** | OpenAI, Anthropic, Groq, Ollama, … | OpenAI, Google, … + OpenRouter, Ollama, … | **Many (see `pyproject.toml`; OpenAI, Anthropic, Google, Ollama, xAI, Groq, …)** |
| **Data** | Financial Datasets API, etc. | yfinance, Alpha Vantage, … | **yfinance-centred (`data_vendors` in config)** |
| **Backtest** | ✅ Built-in | ❌ | **✅ (`/api/backtest`, engine wrapper)** |
| **Web UI** | ✅ Full app | ❌ CLI | **✅ React dashboard + API** |
| **Portfolio** | ✅ Cash, margin, long/short | △ Single-ticker sim | **✅ API + config: cash, `margin_requirement`, `allow_short`** |
| **Multi-ticker** | ✅ e.g. CSV tickers | △ One-at-a-time typical | **✅ Ultimate, backtest, etc.** |
| **Architecture** | DAG (parallel → aggregate) | Graph + debate loops | **Fused: Ultimate + AI-HF + TA** |
| **Design philosophy** | Diverse “votes” on style | Org-style consensus + learning | **Fuse gurus, TA, debate, and memory in one pipeline** |
| **Code / extensibility** | Simple, easy to read | Highly modular, package-style | **Monorepo + `vendors/` submodules; large surface, extensible** |
| **Docker** | △ Not a first-class story | ✅ `docker-compose` | **✅ `docker-compose` (backend + frontend, volumes for cache/results/memory)** |
| **Output language** | English-centric | `output_language` | **✅ `OUTPUT_LANGUAGE` + Settings API** |
| **Config flexibility** | Code edits | `DEFAULT_CONFIG`-style | **High: `ARCHON_CONFIG` + `/api/archon/settings` + per-provider options** |

### Capabilities (feature matrix)

| Capability | AI Hedge Fund | TradingAgents | **ARCHON** |
| :--- | :--- | :--- | :--- |
| **Fundamental analysis** | ✅ | ✅ | **✅** |
| **Technical analysis** | ✅ | ✅ | **✅** |
| **Sentiment** | ✅ | ✅ | **✅** |
| **News** | △ (within sentiment) | ✅ News analyst | **✅ (e.g. `news` in `selected_analysts`)** |
| **Valuation (DCF, etc.)** | ✅ | ❌ | **✅ (`enable_valuation_agent`)** |
| **Famous-investor views** | ✅ 13 | ❌ | **✅** |
| **Inter-agent debate** | ❌ | ✅ | **✅** |
| **Reflection on past runs** | ❌ | ✅ | **✅ (`enable_reflection`)** |
| **Portfolio-wide / multi-ticker** | ✅ | ❌ (single name typical) | **✅** |
| **Backtest** | ✅ | ❌ | **✅** |
| **Web dashboard** | ✅ | ❌ | **✅** |
| **Local LLM (Ollama)** | ✅ | ✅ | **✅** |
| **Short positions** | ✅ | △ | **✅ (`allow_short`)** |
| **Margin** | ✅ | ❌ | **✅ (`margin_requirement`)** |
| **Persistent trade / run logs** | △ | ✅ JSON | **✅/△ (`/api/logs` + on-disk; depth depends on engine)** |
| **Provider-specific reasoning** | ❌ | ✅ (thinking / effort) | **✅ (e.g. `OPENAI_REASONING_EFFORT`, `ANTHROPIC_EFFORT`, `GOOGLE_THINKING_LEVEL`)** |

*Automated “full feature” E2E tests are not a single `test.py` in the repo root; use `poetry run python scripts/smoke_test.py` for offline API smoke checks. LLM/POST/SSE paths need keys and manual or separate E2E.*  
*ARCHON is not distributed as a standalone `.exe`; use **Docker Compose** or the scripts in `scripts/` (see [Quick Start](#quick-start)).*

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git

### Setup

```bash
git clone --recursive https://github.com/matrix9neonebuchadnezzar2199-sketch/ARCHON.git
cd ARCHON
cp .env.example .env
# Edit .env and add at least one LLM API key (OPENAI_API_KEY recommended)
```

### Run (script)

```bash
# macOS / Linux
chmod +x scripts/run.sh
./scripts/run.sh

# Windows
scripts\run.bat
```

### Run (manual)

```bash
# Backend
poetry install
poetry run uvicorn serve:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>

### Run (Docker)

```bash
# Init submodules first
git submodule update --init --recursive

# Copy and edit .env
cp .env.example .env

# Build and run
docker compose up --build
```

Open <http://localhost:3501> (Docker UI via nginx, see `FRONTEND_PORT` in `.env`) or <http://localhost:5173> (local dev with Vite). API is on port **8000**; Docker maps `FRONTEND_PORT` (default **3501**) to the frontend container and `BACKEND_PORT` (default **8000**) to the backend.

### Run (single port — production static)

After `cd frontend && npm run build`, `poetry run uvicorn serve:app --port 8000` serves the **API and the built SPA** from the same host (when `frontend/dist` exists). Open <http://localhost:8000>

## API Endpoints

| Route | Description |
|-------|-------------|
| `GET /api/archon/health` | System health & engine availability |
| `POST /api/ultimate/run` | Ultimate Mode (SSE) |
| `POST /api/hf/run` | AI Hedge Fund (SSE) |
| `POST /api/ta/run` | TradingAgents (SSE) |
| `POST /api/backtest/run` | Backtest (SSE) |
| `GET /api/portfolio/` | Portfolio state |
| `GET /api/memory/` | All agent memories |
| `GET /api/logs/` | Run log listing |
| `GET /api/archon/settings` | Configuration |
| `GET /docs` | Swagger UI |

## Pages

| Page | Status |
|------|--------|
| Dashboard | Engine health |
| Ultimate Mode | Guru + TA fusion |
| AI Hedge Fund | 19 analysts |
| Trading Agents | Debate + reports |
| Backtest | Equity chart |
| Portfolio | Positions table |
| Memory | BM25 query |
| Logs | List + detail |
| Settings | LLM config |

## Tech Stack

**Backend**: Python 3.11, FastAPI, LangChain, LangGraph, yfinance, BM25

**Frontend**: React 19, Vite, TypeScript, Tailwind CSS 3, shadcn/ui, Recharts, Lucide

**Vendor Engines**: [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) (MIT), [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) (MIT)

## Disclaimer

This software is for **educational and research purposes only**. It does not place real trades and should not be used for actual investment decisions. No liability is assumed for any losses.

---

## 日本語セクション

### 概要

ARCHON は、2つのオープンソース AI トレーディングフレームワークを統合した AI 取引システムです。

- **AI Hedge Fund** — バフェット、マンガー、ダモダランなど13人の著名投資家ペルソナ
- **TradingAgents** — Bull/Bear リサーチャーの討論、トレーダー、リスク管理チームによるマルチエージェント意思決定

### セットアップ

```bash
git clone --recursive https://github.com/matrix9neonebuchadnezzar2199-sketch/ARCHON.git
cd ARCHON
cp .env.example .env
# .env を編集し、少なくとも OPENAI_API_KEY を設定

# 起動（Windows）
scripts\run.bat

# 起動（macOS / Linux）
./scripts/run.sh
```

ブラウザで <http://localhost:5173> を開いてください。

### 主な機能

- **Ultimate Mode**: 13人のグル投票 + TradingAgents 討論 → 統合判定（buy/sell/hold）
- **バックテスト**: エクイティカーブ、シャープレシオ、最大ドローダウン
- **メモリ**: BM25 インデックスによるエージェント記憶の保存・検索
- **ログ**: 全エンジン実行の JSON ログ自動保存・閲覧

### 比較表（AI Hedge Fund · TradingAgents · ARCHON）

**記号**: **✅** あり/強い · **❌** なし · **△** 一部

#### メリット・デメリット

| 比較項目 | [AI Hedge Fund](https://github.com/virattt/ai-hedge-fund) | [TradingAgents](https://github.com/TauricResearch/TradingAgents) | **ARCHON** |
| :--- | :--- | :--- | :--- |
| 目的 | AI投資判断のPoC（教育） | 取引現場風の研究枠 | **Guru+TA+Ultimate を統合した一貫スタック（教育・研究）** |
| 作者 | 個人（virattt） | Tauric / UCLA 系 | **本 monorepo（v0.2.0+）** |
| 学術的裏付け | なし | [arXiv 論文](https://arxiv.org/abs/2412.20138) 等 | **独自論文はなし（TA 系の要素を利用）** |
| エージェント数 | 最大~19 程度 | 約10 | **Guru 13 ＋ TA/アナリスト ＋ 投資・リスク討論（可変）** |
| 投資家ペルソナ | ✅ 13人 | ❌ 役割のみ | **✅（設定で有効/無効）** |
| ディベート機構 | ❌ 独立シグナル | ✅ | **✅（`max_invest_debate_rounds` / `max_risk_debate_rounds`）** |
| メモリ・学習 | ❌ | ✅ 振り返り等 | **✅（.memory 等 + `enable_memory` / `enable_reflection`）** |
| LLM 2層 | ❌ | ✅ Deep+Quick | **✅（deep / quick / guru）** |
| 対応LLM | 主要ベンダー複数 | 更に多め+OpenRouter等 | **多数（`pyproject.toml` 参照）** |
| データ | Financial Datasets API 等 | yfinance 等 | **yfinance 中心** |
| バックテスト | ✅ | ❌ | **✅** |
| Web UI | ✅ | ❌ CLI | **✅** |
| ポートフォリオ | ✅ 多機能 | △ 単一銘柄寄り | **✅（現金/マージン/ショート 等）** |
| 複数銘柄 | ✅ | △ | **✅** |
| アーキテクチャ | DAG 系 | 議論ループ | **融合（Ultimate + HF + TA）** |
| 設計思想 | 多様な哲学の集約 | 組織的合意 | **Guru+TA+議論+メモリの一本化** |
| 拡張性 | 素朴 | パッケージ的 | **vendor 同梱型 monorepo（依存は大きい）** |
| Docker | △/不明 | ✅ | **✅ `docker-compose` + 永続 vol** |
| 出力言語 | 英語中心 | 複数可 | **✅ 設定可能** |
| 設定 | 低～コード | 高 | **高（`ARCHON_CONFIG`＋ API）** |

#### できること

| 機能 | AI Hedge Fund | TradingAgents | **ARCHON** |
| :--- | :--- | :--- | :--- |
| ファンダ | ✅ | ✅ | **✅** |
| テクニカル | ✅ | ✅ | **✅** |
| センチメント | ✅ | ✅ | **✅** |
| ニュース | △ 情勢内 | ✅ 専任 | **✅** |
| バリュエーション | ✅ | ❌ | **✅** |
| 著名投資家視点 | ✅ | ❌ | **✅** |
| エージェント間の議論 | ❌ | ✅ | **✅** |
| 過去の意思決定の振り返り | ❌ | ✅ | **✅** |
| ポートフォリオ全体 | ✅ | ❌ 単銘柄寄り | **✅** |
| バックテスト | ✅ | ❌ | **✅** |
| Web ダッシュボード | ✅ | ❌ | **✅** |
| ローカル LLM (Ollama) | ✅ | ✅ | **✅** |
| ショート | ✅ | △ | **✅** |
| マージン | ✅ | ❌ | **✅** |
| 取引ログ永続化 | △ | ✅ 詳細JSON | **✅/△** |
| プロバイダ別推論制御 | ❌ | ✅ | **✅** |

- ルートの網羅E2E用 `test.py` はありません。オフライン用は `poetry run python scripts/smoke_test.py` を参照。  
- 起動は **Docker Compose** または `scripts/run.*` 等。**単体 EXE 配布は想定していません**（上記 [Quick Start](#quick-start)）。

---

## License

MIT

## Acknowledgments

- [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund)
- [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)
- [TradingAgents paper (arXiv:2412.20138)](https://arxiv.org/abs/2412.20138)
