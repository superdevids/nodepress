@echo off
cd /d "%~dp0"
title NodePress Installer

echo ============================================================
echo            🚀  NodePress - Simple Installer
echo ============================================================
echo.

:: Install dependencies
echo [1/2] Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm install failed. Please check your internet connection.
    pause
    exit /b 1
)
echo ✅ Dependencies installed!
echo.

:: Start NodePress
echo [2/2] Starting NodePress...
echo.
start npm start

echo.
echo ============================================================
echo ✅ NodePress is starting!
echo    Your browser will open automatically.
echo.
echo    Admin Panel: http://localhost:3000
echo ============================================================
echo.
timeout /t 3 /nobreak >nul
start http://localhost:3000
