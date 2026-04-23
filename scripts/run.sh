#!/usr/bin/env bash
set -e

# ─── ARCHON — Quick Start ───
# Usage: ./scripts/run.sh
# Installs deps, starts backend + frontend, opens browser.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
cd "$ROOT"

echo "============================================"
echo "  ARCHON — AI Trading System"
echo "============================================"

command -v python3 >/dev/null 2>&1 || { echo "Error: python3 not found"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Error: node not found (install Node.js 18+)"; exit 1; }

if ! command -v poetry >/dev/null 2>&1; then
    echo "Installing Poetry..."
    python3 -m pip install --user poetry
    export PATH="$HOME/.local/bin:$PATH"
fi

if [ ! -f "vendors/ai-hedge-fund/pyproject.toml" ]; then
    echo "Initializing git submodules..."
    git submodule update --init --recursive
fi

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ">>> Please edit .env and add your API keys <<<"
fi

echo "Installing backend dependencies..."
poetry install --no-interaction

echo "Installing frontend dependencies..."
cd frontend
npm install
cd "$ROOT"

echo "Starting backend (port 8000)..."
poetry run uvicorn serve:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Waiting for backend..."
for i in $(seq 1 30); do
    if curl -s "http://127.0.0.1:8000/api/archon/health" >/dev/null 2>&1; then
        echo "Backend ready!"
        break
    fi
    sleep 1
done

echo "Starting frontend (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd "$ROOT"

sleep 3

echo ""
echo "============================================"
echo "  ARCHON is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo "============================================"

if command -v open >/dev/null 2>&1; then
    open "http://localhost:5173"
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:5173"
fi

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
