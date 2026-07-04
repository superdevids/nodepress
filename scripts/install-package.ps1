<#
.SYNOPSIS
    NodePress Windows Package Installer
.DESCRIPTION
    All-in-one Windows installer for NodePress.
    - Downloads Node.js if not installed (via winget)
    - Downloads PostgreSQL if not installed (via Docker or embedded)
    - Installs all dependencies
    - Creates .env with auto-generated secrets
    - Sets up the database
    - Opens browser to the Install Wizard
.NOTES
    A "5-minute installation" experience — designed for NodePress on Windows.
    Run this as Administrator for best results.
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "NodePress — Windows Installer"

$ROOT = Split-Path -Parent $PSScriptRoot
if (-not $ROOT) { $ROOT = (Get-Location).Path }

# ── Color Output ────────────────────────────────────────────────
function Write-Color {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Write-Step {
    param([string]$Text)
    Write-Host ""
    Write-Color "→ $Text" -Color Blue
}

function Write-Ok {
    param([string]$Text)
    Write-Color "  ✓ $Text" -Color Green
}

function Write-Warn {
    param([string]$Text)
    Write-Color "  ⚠ $Text" -Color Yellow
}

function Write-Err {
    param([string]$Text)
    Write-Color "  ✗ $Text" -Color Red
}

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Color "╔══════════════════════════════════════════════════════════╗" -Color Cyan
    Write-Color "║  $([char]0x1b)[1m🚀  NodePress — Windows Installer$([char]0x1b)[0m                ║" -Color Cyan
    Write-Color "║  Modern, open-source CMS — 5-minute setup                  ║" -Color Cyan
    Write-Color "╚══════════════════════════════════════════════════════════╝" -Color Cyan
    Write-Host ""
    Write-Color " This installer will set up everything you need to run NodePress." -Color White
    Write-Color " No technical knowledge required!" -Color Dim
    Write-Host ""
}

function Sleep-WithCountdown {
    param([int]$Seconds)
    for ($i = $Seconds; $i -gt 0; $i--) {
        Write-Host "`r  Waiting $i seconds..." -NoNewline -ForegroundColor Dim
        Start-Sleep -Seconds 1
    }
    Write-Host ""
}

# ── Step 0: Check Admin ─────────────────────────────────────────
function Test-Admin {
    $identity = [Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    return $identity.IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
}

# ── Step 1: Install Node.js ─────────────────────────────────────
function Install-NodeJS {
    Write-Step "Step 1/6: Checking Node.js"

    $nodePath = Get-Command "node" -ErrorAction SilentlyContinue
    if ($nodePath) {
        $version = & node -v
        $major = [int]($version -replace '[v.]', '').Substring(0, 2)
        if ($major -ge 20) {
            Write-Ok "Node.js $version detected"
            return $true
        } else {
            Write-Warn "Node.js $version is too old (need 20+)"
        }
    } else {
        Write-Warn "Node.js is not installed"
    }

    Write-Color "  Installing Node.js LTS via winget..." -Color Yellow

    # Check winget
    $wingetPath = Get-Command "winget" -ErrorAction SilentlyContinue
    if (-not $wingetPath) {
        Write-Err "winget not found. Please install Node.js manually."
        Write-Color "  Download: https://nodejs.org/" -Color Cyan
        Start-Process "https://nodejs.org/"
        $null = Read-Host "Press Enter after installing Node.js"
        return (Get-Command "node" -ErrorAction SilentlyContinue) -ne $null
    }

    try {
        $result = & winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Ok "Node.js installed via winget"
            # Refresh PATH for this session
            $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
            return $true
        } else {
            Write-Err "winget install failed"
            Write-Color "  Download from: https://nodejs.org/" -Color Cyan
            Start-Process "https://nodejs.org/"
            $null = Read-Host "Press Enter after installing Node.js"
            return (Get-Command "node" -ErrorAction SilentlyContinue) -ne $null
        }
    } catch {
        Write-Err "Error: $_"
        return $false
    }
}

# ── Step 2: Install Docker or PostgreSQL ────────────────────────
function Install-Database {
    Write-Step "Step 2/6: Setting up database"
    
    $dockerPath = Get-Command "docker" -ErrorAction SilentlyContinue
    
    if ($dockerPath) {
        try {
            $dockerRunning = & docker info --format "{{.ServerVersion}}" 2>$null
            if ($dockerRunning) {
                Write-Ok "Docker Desktop is running"
                Write-Color "  Starting PostgreSQL container..." -Color Blue
                
                $composeFile = Join-Path $ROOT "docker-compose.yml"
                if (Test-Path $composeFile) {
                    Set-Location $ROOT
                    $result = & docker compose up -d postgres pgbouncer 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Ok "PostgreSQL started on port 5432"
                        Sleep-WithCountdown 3
                        return $true
                    } else {
                        Write-Warn "Docker compose failed, trying manual setup"
                    }
                }
            } else {
                Write-Warn "Docker Desktop is installed but not running"
                Write-Color "  Please start Docker Desktop from the Start Menu" -Color Yellow
            }
        } catch {
            Write-Warn "Docker check failed"
        }
    } else {
        Write-Warn "Docker Desktop not found"
        Write-Color "  Installing Docker Desktop is recommended for easy setup." -Color Yellow
        
        $installDocker = Read-Host "Install Docker Desktop now? (Y/n)"
        if ($installDocker -ne "n") {
            $dockerScript = Join-Path $PSScriptRoot "install-docker.ps1"
            if (Test-Path $dockerScript) {
                & $dockerScript
            } else {
                Write-Color "  Download Docker Desktop from: https://www.docker.com/products/docker-desktop/" -Color Cyan
                Start-Process "https://www.docker.com/products/docker-desktop/"
                $null = Read-Host "Press Enter after installing Docker Desktop"
            }
            
            # Recheck after install
            $dockerPath = Get-Command "docker" -ErrorAction SilentlyContinue
            if ($dockerPath) {
                Write-Ok "Docker Desktop installed"
                return Install-Database # Retry
            }
        }
    }
    
    Write-Warn "Using local PostgreSQL (manual connection required)"
    Write-Color "  You'll enter database details in the Install Wizard." -Color Yellow
    return $false
}

# ── Step 3: Install npm Dependencies ────────────────────────────
function Install-Dependencies {
    Write-Step "Step 3/6: Installing dependencies"
    
    Set-Location $ROOT
    
    if (Test-Path (Join-Path $ROOT "node_modules")) {
        Write-Ok "node_modules already exists"
        return $true
    }
    
    Write-Color "  Running npm install (this may take a minute)..." -Color Blue
    Set-Location $ROOT
    $result = & npm install --loglevel=error 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Dependencies installed"
        return $true
    } else {
        Write-Err "npm install failed"
        Write-Color "  Check your internet connection and try again." -Color Yellow
        return $false
    }
}

# ── Step 4: Create .env ─────────────────────────────────────────
function Create-EnvFile {
    Write-Step "Step 4/6: Creating configuration"
    
    $envFile = Join-Path $ROOT ".env"
    $envExample = Join-Path $ROOT ".env.example"
    
    if (Test-Path $envFile) {
        Write-Ok ".env already exists"
        return $true
    }
    
    Write-Color "  Generating secure keys..." -Color Blue
    
    # Generate secrets using Node.js
    $nodeScript = @"
const crypto = require('crypto');
const keys = {
    jwt: crypto.randomBytes(48).toString('base64').slice(0, 48),
    jwtRefresh: crypto.randomBytes(48).toString('base64').slice(0, 48),
    encryption: crypto.randomBytes(32).toString('hex'),
    auth: crypto.randomBytes(48).toString('base64').slice(0, 48),
    secureAuth: crypto.randomBytes(48).toString('base64').slice(0, 48),
    loggedIn: crypto.randomBytes(48).toString('base64').slice(0, 48),
    nonce: crypto.randomBytes(48).toString('base64').slice(0, 48),
    secret: crypto.randomBytes(48).toString('base64').slice(0, 48),
};
console.log(JSON.stringify(keys));
"@
    
    try {
        $keysJson = & node -e $nodeScript 2>&1 | Out-String
        $keys = $keysJson | ConvertFrom-Json
        
        if (Test-Path $envExample) {
            $content = Get-Content $envExample -Raw
            $content = $content -replace '^JWT_SECRET=.*', "JWT_SECRET=$($keys.jwt)"
            $content = $content -replace '^JWT_REFRESH_SECRET=.*', "JWT_REFRESH_SECRET=$($keys.jwtRefresh)"
            $content = $content -replace '^ENCRYPTION_KEY=.*', "ENCRYPTION_KEY=$($keys.encryption)"
            $content = $content -replace ':6432/', ':5432/'
            Set-Content -Path $envFile -Value $content -Encoding UTF8
        } else {
            $envContent = @"
# NodePress Configuration - Auto-generated by Windows Installer
JWT_SECRET=$($keys.jwt)
JWT_REFRESH_SECRET=$($keys.jwtRefresh)
ENCRYPTION_KEY=$($keys.encryption)
AUTH_KEY=$($keys.auth)
SECURE_AUTH_KEY=$($keys.secureAuth)
LOGGED_IN_KEY=$($keys.loggedIn)
NONCE_KEY=$($keys.nonce)
SECRET_KEY=$($keys.secret)
AUTH_SALT=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64').slice(0,48))")
SECURE_AUTH_SALT=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64').slice(0,48))")
LOGGED_IN_SALT=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64').slice(0,48))")
NONCE_SALT=$(node -e "console.log(require('crypto').randomBytes(48).toString('base64').slice(0,48))")

DATABASE_URL=postgresql://nodepress:nodepress@localhost:5432/nodepress
DATABASE_DIRECT_URL=postgresql://nodepress:nodepress@localhost:5432/nodepress
REDIS_URL=redis://localhost:6379

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=nodepress
S3_SECRET_KEY=nodepress123
S3_BUCKET=nodepress-media
S3_PUBLIC_URL=http://localhost:9000/nodepress-media

APP_URL=http://localhost:3000
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

PORT=3001
NODE_ENV=development
NODEPRESS_DEBUG=true
LOG_LEVEL=debug
LOG_FILE=storage/logs/nodepress.log

JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
JWT_ISSUER=nodepress

MAINTENANCE_MODE=false
MAINTENANCE_ALLOWED_IPS=
"@
            Set-Content -Path $envFile -Value $envContent -Encoding UTF8
        }
        
        Write-Ok ".env created with auto-generated secrets"
        return $true
    } catch {
        # Fallback: copy example
        if (Test-Path $envExample) {
            Copy-Item $envExample $envFile
            Write-Ok ".env created from .env.example"
            Write-Warn "Please update JWT_SECRET before production use"
            return $true
        }
        Write-Err "Could not create .env"
        return $false
    }
}

# ── Step 5: Run Quick Install ───────────────────────────────────
function Run-QuickInstall {
    Write-Step "Step 5/6: Running database setup"
    
    $quickInstallScript = Join-Path $ROOT "scripts" "quick-install.js"
    
    if (Test-Path $quickInstallScript) {
        Write-Color "  Running quick install script..." -Color Blue
        Set-Location $ROOT
        & node $quickInstallScript
        return $LASTEXITCODE -eq 0
    }
    
    # Fallback: run Prisma directly
    Write-Color "  Generating Prisma client..." -Color Blue
    Set-Location $ROOT
    & npx prisma generate --schema=packages/db/prisma/schema.prisma 2>&1 | Out-Null
    
    Write-Color "  Creating database tables..." -Color Blue
    & npx prisma db push --schema=packages/db/prisma/schema.prisma --accept-data-loss 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Color "  Adding default data..." -Color Blue
        & npx ts-node --project packages/db/tsconfig.json packages/db/src/seed.ts 2>&1 | Out-Null
        Write-Ok "Database ready"
        return $true
    } else {
        Write-Warn "Database setup deferred — will run on first start"
        return $false
    }
}

# ── Step 6: Launch ──────────────────────────────────────────────
function Launch-NodePress {
    Write-Step "Step 6/6: Starting NodePress"
    
    Write-Color "" -Color White
    Write-Color "╔══════════════════════════════════════════════════════════╗" -Color Green
    Write-Color "║  ✅  NodePress is ready to go!                            ║" -Color Green
    Write-Color "╚══════════════════════════════════════════════════════════╝" -Color Green
    Write-Host ""
    Write-Color "  🌐 Admin Panel:  http://localhost:3000" -Color Cyan
    Write-Color "  📖 API:          http://localhost:3001" -Color Cyan
    Write-Host ""
    Write-Color "  Opening your browser to the Install Wizard..." -Color Yellow
    Write-Color "  Follow the 5-step wizard to complete setup:" -Color White
    Write-Color "    1. Database connection" -Color Dim
    Write-Color "    2. Create admin account" -Color Dim
    Write-Color "    3. Site settings" -Color Dim
    Write-Color "    4. Choose plugins" -Color Dim
    Write-Color "    5. Done!" -Color Dim
    Write-Host ""
    
    # Open browser
    Start-Process "http://localhost:3000"
    
    # Start dev server
    Set-Location $ROOT
    & node start.js
}

# ── Main ────────────────────────────────────────────────────────
function Main {
    Write-Banner
    
    # Pre-check: Administrator
    if (-not (Test-Admin)) {
        Write-Warn "Not running as Administrator"
        Write-Color "  Right-click and select 'Run as Administrator' for best results." -Color Yellow
        Write-Color "  Continuing anyway..." -Color Dim
        Write-Host ""
        Sleep-WithCountdown 3
    }
    
    # Step 1: Node.js
    $nodeOk = Install-NodeJS
    if (-not $nodeOk) {
        Write-Err "Node.js is required. Please install it and try again."
        $null = Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Step 2: Database
    $dbOk = Install-Database
    
    # Step 3: Dependencies
    $depOk = Install-Dependencies
    if (-not $depOk) {
        Write-Err "Failed to install dependencies"
        $null = Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Step 4: .env
    $envOk = Create-EnvFile
    
    # Step 5: Quick Install
    if ($dbOk) {
        $quickOk = Run-QuickInstall
    }
    
    # Step 6: Launch
    Launch-NodePress
}

# Run
Main
