@echo off
cd /d "%~dp0"
title NodePress Installer — 5-Minute Setup

:: ── Color Support ──────────────────────────────────────────────
set "ESC="
for /f "delims=." %%a in ('"prompt $E. & for %%b in (1) do rem"') do set "ESC=%%a"

set "green=%ESC%[32m"
set "yellow=%ESC%[33m"
set "blue=%ESC%[34m"
set "cyan=%ESC%[36m"
set "red=%ESC%[31m"
set "bold=%ESC%[1m"
set "dim=%ESC%[2m"
set "reset=%ESC%[0m"

cls
echo.
echo %cyan%╔══════════════════════════════════════════════════════════╗%reset%
echo %cyan%║%reset%  %bold%🚀  NodePress — 5-Minute Installer%reset%                %cyan%║%reset%
echo %cyan%║%reset%  WordPress-compatible CMS for Windows                 %cyan%║%reset%
echo %cyan%╚══════════════════════════════════════════════════════════╝%reset%
echo.
echo This installer will set up everything you need to run NodePress.
echo No technical knowledge required!
echo.
echo %blue%[1/5]%reset% Checking your system...
echo.

:: ── Step 1: Check if running as Admin ──────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo   %yellow%⚠%reset% Not running as Administrator.
    echo   %yellow%  Some features may require admin privileges.%reset%
    echo   %dim%  Right-click install.bat and select "Run as administrator"%reset%
    echo.
)

:: ── Step 2: Check/Install Node.js ─────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   %yellow%⚠ Node.js is not installed.%reset%
    echo.
    echo   %blue%→ Installing Node.js via winget...%reset%
    echo.
    
    :: Check if winget is available (Windows 10+)
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements
        if %errorlevel% neq 0 (
            echo   %red%✗ winget install failed.%reset%
            goto :install_nodejs_manual
        )
        echo   %green%✓ Node.js installed via winget.%reset%
        
        :: Refresh PATH
        for /f "tokens=*" %%a in ('"%ProgramFiles%\Nodejs\node.exe" -v 2^>nul') do set "NODE_VER=%%a"
    ) else (
        :install_nodejs_manual
        echo   %yellow%  Opening Node.js download page...%reset%
        start https://nodejs.org/
        echo   %yellow%  Please download and install Node.js (LTS version 20+),%reset%
        echo   %yellow%  then run this installer again.%reset%
        echo.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%a in ('node -v') do set "NODE_VER=%%a"
    echo   %green%✓ Node.js %NODE_VER%%reset%
)

:: ── Step 3: Check Docker (optional) ───────────────────────────
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo   %green%✓ Docker Desktop detected%reset%
    set "HAS_DOCKER=1"
) else (
    echo   %yellow%⚠ Docker not found%reset%
    echo     %dim%Docker makes database setup easy. We'll use local PostgreSQL instead.%reset%
    set "HAS_DOCKER=0"
)

echo.
echo %blue%[2/5]%reset% Installing dependencies...
echo.

:: ── Step 4: Install npm packages ──────────────────────────────
echo   %dim%This may take a minute or two on first run...%reset%
call npm install --loglevel=error
if %errorlevel% neq 0 (
    echo.
    echo   %red%✗ npm install failed.%reset%
    echo     Possible causes:
    echo     - No internet connection
    echo     - Firewall blocking npm
    echo     - Node.js version mismatch
    echo.
    pause
    exit /b 1
)
echo   %green%✓ Dependencies installed%reset%

echo.
echo %blue%[3/5]%reset% Configuring environment...
echo.

:: ── Step 5: Create .env if needed ─────────────────────────────
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        
        :: Generate secure secrets
        echo   %dim%Generating security keys...%reset%
        for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(48).toString('base64').slice(0,48))"') do set "JWT_SECRET=%%a"
        for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(48).toString('base64').slice(0,48))"') do set "JWT_REFRESH_SECRET=%%a"
        for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set "ENCRYPTION_KEY=%%a"
        
        :: Update .env with generated secrets
        powershell -Command "(Get-Content .env) -replace '^JWT_SECRET=.*', 'JWT_SECRET=%JWT_SECRET%' -replace '^JWT_REFRESH_SECRET=.*', 'JWT_REFRESH_SECRET=%JWT_REFRESH_SECRET%' -replace '^ENCRYPTION_KEY=.*', 'ENCRYPTION_KEY=%ENCRYPTION_KEY%' -replace ':6432/', ':5432/' | Set-Content .env"
        echo   %green%✓ .env created with secure secrets%reset%
    ) else (
        echo   %green%✓ Creating .env%reset%
        node -e "
            const fs = require('fs');
            const crypto = require('crypto');
            const env = [
                '# NodePress Configuration - Auto-generated',
                'JWT_SECRET=' + crypto.randomBytes(48).toString('base64').slice(0,48),
                'JWT_REFRESH_SECRET=' + crypto.randomBytes(48).toString('base64').slice(0,48),
                'ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'),
                '',
                'DATABASE_URL=postgresql://nodepress:nodepress@localhost:5432/nodepress',
                'DATABASE_DIRECT_URL=postgresql://nodepress:nodepress@localhost:5432/nodepress',
                'REDIS_URL=redis://localhost:6379',
                '',
                'APP_URL=http://localhost:3000',
                'API_URL=http://localhost:3001',
                'NEXT_PUBLIC_API_URL=http://localhost:3001',
                'CORS_ORIGINS=http://localhost:3000,http://localhost:3001',
                '',
                'S3_ENDPOINT=http://localhost:9000',
                'S3_REGION=us-east-1',
                'S3_ACCESS_KEY=nodepress',
                'S3_SECRET_KEY=nodepress123',
                'S3_BUCKET=nodepress-media',
                'S3_PUBLIC_URL=http://localhost:9000/nodepress-media',
                '',
                'NODE_ENV=development',
                'NODEPRESS_DEBUG=true',
                'LOG_LEVEL=debug',
            ].join('\n');
            fs.writeFileSync('.env', env);
            console.log('✓ .env created');
        "
    )
) else (
    echo   %green%✓ .env already exists%reset%
)

:: ── Start Docker containers if available ──────────────────────
if "%HAS_DOCKER%"=="1" (
    echo.
    echo %blue%[4/5]%reset% Starting PostgreSQL database...
    echo.
    
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo   %dim%Starting PostgreSQL, Redis, and MinIO...%reset%
        docker compose up -d postgres pgbouncer redis minio minio-init 2>nul
        
        if %errorlevel% equ 0 (
            echo   %green%✓ Database services started%reset%
            echo   %dim%Waiting for PostgreSQL to be ready...%reset%
            timeout /t 5 /nobreak >nul
        ) else (
            echo   %yellow%⚠ Docker services failed to start%reset%
        )
    ) else (
        echo   %yellow%⚠ Docker Desktop is not running%reset%
        echo     %dim%Start Docker Desktop and run this installer again.%reset%
    )
) else (
    echo.
    echo %blue%[4/5]%reset% Database setup...
    echo.
    echo   %yellow%⚠ Docker not found — using local PostgreSQL if available%reset%
    echo     %dim%You can also run: node scripts\quick-install.js%reset%
    echo     %dim%for guided database setup.%reset%
)

echo.
echo %blue%[5/5]%reset% Starting NodePress...
echo.
echo %green%╔══════════════════════════════════════════════════════════╗%reset%
echo %green%║%reset%  %bold%✅ Setup Complete! Starting NodePress...%reset%              %green%║%reset%
echo %green%╚══════════════════════════════════════════════════════════╝%reset%
echo.
echo   %cyan%🌐%reset% Admin Panel:  %bold%http://localhost:3000%reset%
echo   %cyan%📖%reset% API:          %bold%http://localhost:3001%reset%
echo.
echo   The Install Wizard will open in your browser automatically.
echo   Follow the 5-step wizard to set up:
echo     1. Database connection  ^(click "Test Connection"^)
echo     2. Create admin account ^(email + password^)
echo     3. Site settings        ^(name your site^)
echo     4. Choose plugins       ^(SEO, Comments, Security...^)
echo     5. Done!                ^(start creating content!^)
echo.
echo   %dim%If the browser doesn't open, visit http://localhost:3000%reset%
echo.

:: ── Open browser once NodePress is ready ──────────────────────
start "" http://localhost:3000

:: ── Start NodePress ───────────────────────────────────────────
echo   %dim%Starting dev server...%reset%
echo.
node start.js

:: If we get here, NodePress was closed
echo.
echo %yellow%NodePress has stopped.%reset%
echo %yellow%Run %bold%npm start%reset% %yellow%to start again.%reset%
echo.
pause
