@echo off
title NodePress Installer v1.0
cd /d "%~dp0"

setlocal enabledelayedexpansion

:: Enable ANSI escape sequences on Windows 10+
for /f %%i in ('echo prompt $E ^| cmd') do set "ESC=%%i"

cls
echo ============================================================
echo.           %ESC%[96m🚀 NodePress - One-Click Installer%ESC%[0m
echo.           %ESC%[93mWordPress-compatible CMS for Everyone%ESC%[0m
echo ============================================================
echo.
echo This installer will set up everything to run NodePress.
echo No technical knowledge required!
echo.

:: ============================================================
:: Check if Docker Desktop is available
:: ============================================================
echo %ESC%[94m[1/3]%ESC%[0m Checking your system...
echo.

where docker >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    echo   %ESC%[92m✅%ESC%[0m Docker detected! Using Docker (easiest method).
    echo.
    echo   %ESC%[96mStarting NodePress with Docker...%ESC%[0m
    echo.

    if not exist ".env" (
        echo   %ESC%[93m📝%ESC%[0m Creating .env from .env.example...
        copy .env.example .env >nul
    )

    docker compose up -d

    if !ERRORLEVEL! EQU 0 (
        echo.
        echo   %ESC%[92m✅%ESC%[0m %ESC%[97mSUCCESS!%ESC%[0m NodePress is now running!
        echo.
        echo   %ESC%[96m🌐%ESC%[0m Open your browser to: %ESC%[92mhttp://localhost:3000%ESC%[0m
        echo.
        echo   %ESC[93mFollow the Install Wizard (5 steps, ~2 minutes):%ESC[0m
        echo     1. Database connection  (click "Test Connection")
        echo     2. Create admin account (email + password)
        echo     3. Site settings        (name your site)
        echo     4. Choose plugins       (SEO, Comments, Security...)
        echo     5. Done!                (start creating!)
        echo.
        echo ============================================================
        echo   Press any key to open your browser and start using NodePress!
        echo ============================================================
        pause >nul
        start http://localhost:3000
        exit /b 0
    ) else (
        echo.
        echo   %ESC%[91m❌%ESC%[0m Docker failed to start.
        echo.
        echo   %ESC[93mCommon fixes:%ESC[0m
        echo     1. Is Docker Desktop RUNNING? Check your system tray
        echo     2. Restart Docker Desktop and try again
        echo     3. Right-click install.bat ^> "Run as administrator"
        echo.
        pause
        exit /b 1
    )
)

:: ============================================================
:: Docker not found — check Node.js
:: ============================================================
echo   %ESC%[91m❌%ESC%[0m Docker not found on your system.
echo.
echo   %ESC[93mNo problem! We'll use the Local setup instead.%ESC[0m
echo   You just need Node.js (like a normal program installer).
echo.

where node >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo   %ESC%[91m❌%ESC%[0m Node.js not found either.
    echo.
    echo   %ESC[93m📥 You need to install ONE of these:%ESC[0m
    echo.
    echo   %ESC[92mOption A:%ESC[0m Docker Desktop %ESC[90m(RECOMMENDED - Easiest)%ESC[0m
    echo     1. Go to: https://www.docker.com/products/docker-desktop/
    echo     2. Download and install Docker Desktop
    echo     3. Run this installer again
    echo.
    echo   %ESC[92mOption B:%ESC[0m Node.js
    echo     1. Go to: https://nodejs.org/ (download version 20 or later)
    echo     2. Install Node.js (just keep clicking Next)
    echo     3. Run this installer again
    echo.
    echo ============================================================
    pause
    start https://www.docker.com/products/docker-desktop/
    exit /b 1
)

echo   %ESC%[92m✅%ESC%[0m Node.js detected! Setting up NodePress...
echo.

:: ============================================================
:: Check / Install pnpm
:: ============================================================
where pnpm >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo   %ESC%[93m📥%ESC%[0m Installing pnpm package manager...
    npm install -g pnpm
    if !ERRORLEVEL! NEQ 0 (
        echo   %ESC%[91m❌%ESC%[0m Failed to install pnpm.
        echo   Open Command Prompt as Administrator and type:
        echo   npm install -g pnpm
        pause
        exit /b 1
    )
    echo   %ESC%[92m✅%ESC%[0m pnpm installed!
) else (
    echo   %ESC%[92m✅%ESC%[0m pnpm detected!
)

:: ============================================================
:: Copy .env if missing
:: ============================================================
if not exist ".env" (
    echo   %ESC%[93m📝%ESC%[0m Creating .env from .env.example...
    copy .env.example .env >nul
)

echo.
echo   %ESC%[96m🛠️%ESC%[0m Installing NodePress dependencies...
echo.
call pnpm install
if !ERRORLEVEL! NEQ 0 (
    echo   %ESC%[91m❌%ESC%[0m Failed to install dependencies.
    echo   Try running: pnpm install
    pause
    exit /b 1
)
echo   %ESC%[92m✅%ESC%[0m Dependencies installed!
echo.

echo   %ESC%[96m🗄️%ESC%[0m Setting up database...
echo.
call pnpm db:migrate
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo   %ESC%[93m⚠️%ESC%[0m Database setup had an issue.
    echo.
    echo   Make sure PostgreSQL is running and the .env file
    echo   has the correct DATABASE_URL.
    echo.
    echo   %ESC[93mTip:%ESC[0m Install Docker Desktop and run this installer
    echo   again — it handles everything automatically!
    echo.
    pause
    exit /b 1
)

echo   %ESC%[92m✅%ESC%[0m Database ready!
echo.

echo   %ESC%[96m🌱%ESC%[0m Seeding database with sample data...
echo.
call pnpm db:seed
echo.

echo   %ESC%[92m============================================================%ESC%[0m
echo   %ESC%[92m  ✅ SUCCESS! NodePress is ready!%ESC%[0m
echo   %ESC%[92m============================================================%ESC%[0m
echo.
echo   %ESC%[96m🌐%ESC%[0m Admin Panel: %ESC%[92mhttp://localhost:3000%ESC%[0m
echo   %ESC%[96m📖%ESC%[0m API Docs:    %ESC%[92mhttp://localhost:3001/docs%ESC%[0m
echo.
echo   %ESC[93mLogin: admin@nodepress.local / admin%ESC[0m
echo.
echo   %ESC[96mStarting NodePress now...%ESC[0m
echo.
call pnpm dev

pause
