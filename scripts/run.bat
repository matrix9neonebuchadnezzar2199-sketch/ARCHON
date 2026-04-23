@echo off
setlocal

echo ============================================
echo   ARCHON - AI Trading System
echo ============================================

cd /d "%~dp0\.."

python --version >nul 2>&1 || (echo Error: python not found & exit /b 1)
node --version >nul 2>&1 || (echo Error: node not found & exit /b 1)

where poetry >nul 2>&1 || (
    echo Installing Poetry...
    python -m pip install poetry
)

if not exist "vendors\ai-hedge-fund\pyproject.toml" (
    echo Initializing git submodules...
    git submodule update --init --recursive
)

if not exist ".env" (
    echo Creating .env from .env.example...
    copy /Y .env.example .env
    echo ^>^>^> Please edit .env and add your API keys ^<^<^<
)

echo Installing backend dependencies...
poetry install --no-interaction

echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo Starting backend (port 8000)...
start "ARCHON Backend" cmd /c "poetry run uvicorn serve:app --host 0.0.0.0 --port 8000"

echo Waiting for backend...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s http://127.0.0.1:8000/api/archon/health >nul 2>&1 && goto backend_ready
goto wait_loop
:backend_ready
echo Backend ready!

echo Starting frontend (port 5173)...
cd frontend
start "ARCHON Frontend" cmd /c "npm run dev"
cd ..

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo   ARCHON is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API docs: http://localhost:8000/docs
echo ============================================

start http://localhost:5173

pause
endlocal
