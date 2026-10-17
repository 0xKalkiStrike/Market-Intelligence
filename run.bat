@echo off
setlocal

set ROOT=%~dp0

echo =========================================================
echo MARKET INTELLIGENCE PLATFORM - PHASE 1 STARTUP SCRIPT
echo =========================================================
echo.

echo Cleaning up any previous processes on ports 8000 & 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 :3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting backend service (FastAPI) on http://localhost:8000 ...
start "Backend Service - FastAPI" cmd /k "cd /d "%ROOT%backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo Starting frontend service (Next.js) on http://localhost:3000 ...
start "Frontend Service - Next.js" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo =========================================================
echo SERVICES LAUNCHED SUCCESSFULLY
echo =========================================================
echo Frontend UI:  http://localhost:3000
echo API Docs:     http://localhost:8000/docs
echo Health Check: http://localhost:8000/api/health
echo =========================================================
endlocal
