<#
.SYNOPSIS
    NodePress Docker Desktop Auto-Install Helper
.DESCRIPTION
    Downloads and installs Docker Desktop for Windows silently,
    then runs NodePress. For users who don't have Docker yet.
.NOTES
    Run this script as Administrator for best results.
    Windows 10/11 required (WSL2 support needed).
#>

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "NodePress — Docker Desktop Installer"

# ── Colors ──────────────────────────────────────────────────────
function Write-Color {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Write-Step {
    param([string]$Text)
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

function Write-Error {
    param([string]$Text)
    Write-Color "  ✗ $Text" -Color Red
}

# ── Banner ──────────────────────────────────────────────────────
Clear-Host
Write-Color "╔══════════════════════════════════════════════════════════╗" -Color Cyan
Write-Color "║  🐳  NodePress — Docker Desktop Installer for Windows     ║" -Color Cyan
Write-Color "╚══════════════════════════════════════════════════════════╝" -Color Cyan
Write-Host ""

# ── Check if already installed ─────────────────────────────────
Write-Step "Checking for existing Docker installation..."

$dockerPath = Get-Command "docker" -ErrorAction SilentlyContinue
if ($dockerPath) {
    Write-Ok "Docker is already installed!"
    
    # Check if Docker is running
    try {
        $dockerInfo = docker info --format "{{.ServerVersion}}" 2>$null
        if ($dockerInfo) {
            Write-Ok "Docker Desktop is running (v$dockerInfo)"
            Write-Host ""
            Write-Color "NodePress is ready to use Docker!" -Color Green
            Write-Host ""
            Write-Color "Run the following to start NodePress:" -Color Yellow
            Write-Color "  npm start" -Color Cyan
            Write-Host ""
            exit 0
        } else {
            Write-Warn "Docker Desktop is installed but not running"
        }
    } catch {
        Write-Warn "Docker command found but daemon not responding"
    }
    
    Write-Host ""
    Write-Color "Please start Docker Desktop and try again." -Color Yellow
    Write-Color "Docker Desktop is usually in your Start Menu." -Color Yellow
    Write-Host ""
    pause
    exit 1
}

# ── System Requirements Check ──────────────────────────────────
Write-Step "Checking system requirements..."

# Check Windows version
$os = Get-WmiObject Win32_OperatingSystem
$buildVersion = [Environment]::OSVersion.Version.Build
if ($buildVersion -lt 19041) {
    Write-Error "Windows 10 version 2004 (Build 19041) or later is required for Docker Desktop."
    Write-Color "Please update Windows and try again." -Color Yellow
    pause
    exit 1
}
Write-Ok "Windows 10/11 (Build $buildVersion)"

# Check if WSL2 is available
$wsl = Get-Command "wsl" -ErrorAction SilentlyContinue
if (-not $wsl) {
    Write-Warn "WSL not found — Docker Desktop will install it automatically"
} else {
    Write-Ok "WSL detected"
}

# Check architecture
if (-not [Environment]::Is64BitOperatingSystem) {
    Write-Error "Docker Desktop requires a 64-bit operating system."
    pause
    exit 1
}
Write-Ok "64-bit system"

# Check RAM (recommend 8GB+)
$ram = (Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB
Write-Ok "RAM: $([math]::Round($ram, 1)) GB"
if ($ram -lt 4) {
    Write-Warn "Less than 4GB RAM detected — Docker may run slowly"
}

# ── Check Admin Rights ─────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Warn "Not running as Administrator"
    Write-Color "Restarting as Administrator..." -Color Yellow
    
    $scriptPath = $MyInvocation.MyCommand.Path
    if (-not $scriptPath) {
        $scriptPath = Join-Path $PSScriptRoot "install-docker.ps1"
    }
    
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
    exit 0
}
Write-Ok "Running as Administrator"

# ── Enable required Windows features ───────────────────────────
Write-Step "Enabling required Windows features..."

# Enable WSL
try {
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /quiet /norestart 2>$null
    Write-Ok "WSL feature enabled"
} catch {
    Write-Warn "Could not enable WSL feature (may already be enabled)"
}

# Enable Virtual Machine Platform
try {
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /quiet /norestart 2>$null
    Write-Ok "Virtual Machine Platform enabled"
} catch {
    Write-Warn "Could not enable Virtual Machine Platform"
}

# ── Download Docker Desktop ─────────────────────────────────---
Write-Step "Downloading Docker Desktop for Windows..."

$tempDir = "$env:TEMP\NodePress-Docker"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

$installerPath = "$tempDir\DockerDesktopInstaller.exe"
$downloadUrl = "https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe"

try {
    Write-Color "  (Downloading ~600MB — this may take a while...)" -Color Dim
    
    $webClient = New-Object System.Net.WebClient
    $downloadJob = $webClient.DownloadFileAsync($downloadUrl, $installerPath)
    
    # Show progress
    while ($webClient.IsBusy) {
        if (Test-Path $installerPath) {
            $fileSize = (Get-Item $installerPath).Length / 1MB
            Write-Host "`r  Downloaded: $([math]::Round($fileSize, 1)) MB" -NoNewline -ForegroundColor Dim
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host ""
    
    if (-not (Test-Path $installerPath)) {
        Write-Error "Download failed"
        
        Write-Color "  Please download Docker Desktop manually:" -Color Yellow
        Write-Color "  https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe" -Color Cyan
        Write-Host ""
        pause
        exit 1
    }
    
    $fileSize = (Get-Item $installerPath).Length / 1MB
    Write-Ok "Downloaded ($([math]::Round($fileSize, 1)) MB)"
} catch {
    Write-Error "Download failed: $_"
    
    Write-Color "  Please download Docker Desktop manually:" -Color Yellow
    Write-Color "  https://desktop.docker.com/win/stable/Docker%20Desktop%20Installer.exe" -Color Cyan
    Write-Host ""
    pause
    exit 1
}

# ── Install Docker Desktop ─────────────────────────────────────
Write-Step "Installing Docker Desktop (silent mode)..."
Write-Color "  This will take a few minutes. Docker will start automatically after install." -Color Dim

try {
    $installProcess = Start-Process -FilePath $installerPath -ArgumentList "install --quiet --accept-license" -Wait -PassThru -NoNewWindow
    
    if ($installProcess.ExitCode -eq 0) {
        Write-Ok "Docker Desktop installed successfully!"
    } elseif ($installProcess.ExitCode -eq 1641) {
        Write-Ok "Docker Desktop installed (restart required)"
        Write-Warn "A system restart is required to complete Docker installation."
        Write-Color "  After restart, run 'npm start' to launch NodePress." -Color Yellow
        Write-Host ""
        
        $restartNow = Read-Host "Restart now? (Y/n)"
        if ($restartNow -ne "n") {
            Restart-Computer
        }
        exit 0
    } else {
        Write-Error "Docker Desktop installer exited with code $($installProcess.ExitCode)"
        Write-Color "  Please install Docker Desktop manually:" -Color Yellow
        Write-Color "  https://www.docker.com/products/docker-desktop/" -Color Cyan
        pause
        exit 1
    }
} catch {
    Write-Error "Installation failed: $_"
    pause
    exit 1
}

# ── Wait for Docker to Start ───────────────────────────────────
Write-Step "Waiting for Docker Desktop to start..."
Write-Color "  This may take a minute or two on first launch..." -Color Dim

$dockerReady = $false
for ($i = 1; $i -le 60; $i++) {
    try {
        $version = docker version --format "{{.Server.Version}}" 2>$null
        if ($version) {
            $dockerReady = $true
            break
        }
    } catch {}
    
    if ($i % 10 -eq 0) {
        Write-Host "  Still waiting... ($i seconds)" -ForegroundColor Dim
    }
    Start-Sleep -Seconds 1
}

if (-not $dockerReady) {
    Write-Warn "Docker Desktop is still starting up."
    Write-Color "  Please wait for Docker Desktop to finish starting, then run:" -Color Yellow
    Write-Color "  npm start" -Color Cyan
    Write-Host ""
    pause
    exit 0
}

Write-Ok "Docker Desktop is running!"

# ── Cleanup ────────────────────────────────────────────────────
Write-Step "Cleaning up..."
Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
Write-Ok "Installer removed"

# ── Final Message ──────────────────────────────────────────────
Write-Host ""
Write-Color "╔══════════════════════════════════════════════════════════╗" -Color Green
Write-Color "║  ✅  Docker Desktop is ready!                              ║" -Color Green
Write-Color "╚══════════════════════════════════════════════════════════╝" -Color Green
Write-Host ""
Write-Color " Docker Desktop is installed and running." -Color White
Write-Host ""
Write-Color " Next step — install and start NodePress:" -Color Yellow
Write-Color "   npm start" -Color Cyan
Write-Host ""
Write-Color " Or run the quick installer:" -Color Yellow
Write-Color "   node scripts\quick-install.js" -Color Cyan
Write-Host ""
Write-Color " Your admin panel will be at:" -Color White
Write-Color "   http://localhost:3000" -Color Cyan
Write-Host ""

pause
