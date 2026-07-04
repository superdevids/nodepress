@echo off
cd /d "%~dp0"
title NodePress Installer

echo ============================================================
echo            🚀  NodePress - Simple Installer
echo ============================================================
echo.

:: Install dependencies
echo [1/2] Installing dependencies...
echo   This may take a few minutes on first run...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ npm install failed.
    echo   Possible causes:
    echo   - No internet connection
    echo   - Node.js not installed (download from https://nodejs.org)
    echo   - Firewall blocking npm
    echo.
    pause
    exit /b 1
)
echo ✅ Dependencies installed!
echo.

:: Start NodePress (in a new window so this window can open the browser)
echo [2/2] Starting NodePress...
echo.
start "" npm start

echo.
echo ============================================================
echo ✅ NodePress is starting up!
echo    Your browser will open automatically in a few seconds.
echo.
echo    Admin Panel: http://localhost:3000
echo    API:          http://localhost:3001
echo    API Docs:     http://localhost:3001/docs
echo.
echo    If the browser does not open, visit http://localhost:3000
echo ============================================================
echo.
timeout /t 3 /nobreak >nul
start http://localhost:3000
