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

Open <http://localhost:3000> (Docker UI via nginx) or <http://localhost:5173> (local dev with Vite). API is on port **8000**; Docker maps `FRONTEND_PORT` (default **3000**) to the frontend container and `BACKEND_PORT` (default **8000**) to the backend.

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

---

## License

MIT

## Acknowledgments

- [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund)
- [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)
- [TradingAgents paper (arXiv:2412.20138)](https://arxiv.org/abs/2412.20138)
