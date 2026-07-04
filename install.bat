@echo off
title NodePress Installer v1.0
cd /d "%~dp0"

setlocal enabledelayedexpansion

for /f %%i in ('echo prompt $E ^| cmd') do set "ESC=%%i"

cls
echo ============================================================
echo.           %ESC%[96m%sNodePress - One-Click Installer%s%ESC%[0m
echo.           %ESC%[93mWordPress-compatible CMS for Node.js%ESC%[0m
echo ============================================================
echo.
echo This installer will set up everything automatically!
echo Just sit back and relax.
echo.

echo %ESC%[96m[Step 1/2]%ESC%[0m Installing dependencies...
echo.
call pnpm install
if !ERRORLEVEL! NEQ 0 (
    echo   %ESC%[91m[sError]%ESC%[0m Failed to install dependencies.
    echo   Try running: pnpm install
    pause
    exit /b 1
)
echo   %ESC%[92m[OK]%ESC%[0m Dependencies installed!
echo.

echo %ESC%[96m[Step 2/2]%ESC%[0m Starting NodePress...
echo.
echo   This will set up your database, run migrations,
echo   seed default data, and start the dev server.
echo.
call npm start
if !ERRORLEVEL! NEQ 0 (
    pause
    exit /b !ERRORLEVEL!
)

pause
