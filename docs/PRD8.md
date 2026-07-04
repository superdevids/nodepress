# PRD v8: NodePress — Simplifikasi Instalasi untuk Semua Orang

## Installation Simplification for Everyone

**Version:** 8.0  
**Date:** July 4, 2026  
**Status:** Final

---

## 1. Executive Summary

Saat ini NodePress punya 3 cara instalasi yang membingungkan. User harus paham tentang Docker, Node.js, pnpm, PostgreSQL — terlalu banyak prerequisite. Target PRD8: **SATU cara instalasi yang work untuk SEMUA orang.** Klik → Buka browser → Selesai.

### Target Pengguna:

1. **Non-technical user** (content editor, marketing) — nggak pernah buka terminal
2. **Developer** — biasa pakai command line tapi nggak mau ribet
3. **Designer** — mau coba CMS tanpa setup ribet

---

## 2. Current Problems

| Problem                   | Detail                                      | Dampak                               |
| ------------------------- | ------------------------------------------- | ------------------------------------ |
| 3 opsi instalasi          | A: Local, B: Docker, C: Combo               | User bingung pilih yang mana         |
| Butuh 3 prerequisite      | Node.js 20+, pnpm 9+, Docker                | Non-technical user langsung menyerah |
| Setup script minim        | `setup.sh` cuma 53 lines, no error handling | Kalau gagal, user bingung            |
| No auto-detect            | Script nggak deteksi environment            | User harus tahu apa yang kurang      |
| No one-click installer    | Nggak ada `install.bat` / `install.exe`     | User Windows biasa expect .exe       |
| Install wizard incomplete | Ada di web tapi aksesnya setelah setup      | Harus bisa langsung dari browser     |

---

## 3. Solution: One-Click Installation

### The Goal:

```
Download → Double-click → Browser opens → Follow wizard → DONE! 🎉
```

### How:

#### Layer 1: One-Click Installer Scripts (NEW)

- `install.bat` — Windows: auto-detect everything, guide installation
- `install.sh` — Linux/Mac: same functionality
- `start.bat` / `start.sh` — Simple start after install

#### Layer 2: Enhanced Install Wizard (Already exists, ENHANCE)

- Auto-detect: Docker installed? Node.js? PostgreSQL?
- Guide user step-by-step with plain language
- Show progress visually
- Handle errors gracefully with solutions

#### Layer 3: Simplified README (UPDATE)

- One installation path only
- Simple language
- Screenshots
- Video link

---

## 4. Auto-Detect Logic

The installer will detect:

```
1. Check: Is Docker installed?
   ├─ YES → Use Docker (easiest, recommended)
   │   docker compose up -d
   │   → Open browser → Install Wizard
   │
   └─ NO → Check: Is Node.js 20+ installed?
       ├─ YES → Use Local development
       │   pnpm install → pnpm db:migrate → pnpm dev
       │   → Open browser → Install Wizard
       │
       └─ NO → Show error + download links
           "You need Docker OR Node.js to continue:"
           - Download Docker: https://docker.com
           - Download Node.js: https://nodejs.org
```

---

## 5. New Files to Create

| File                 | Purpose                       | For           |
| -------------------- | ----------------------------- | ------------- |
| `install.bat`        | Windows one-click installer   | Windows users |
| `install.sh`         | Linux/Mac one-click installer | Unix users    |
| `start.bat`          | Windows quick start           | Windows users |
| `start.sh`           | Linux/Mac quick start         | Unix users    |
| `GETTING-STARTED.md` | Visual step-by-step guide     | Everyone      |
| `QUICK-START.md`     | 30-second quick reference     | Developers    |

---

## 6. Installer Behavior

### install.bat (Windows)

```batch
@echo off
title NodePress Installer
echo ====================================
echo   NodePress - One-Click Installer
echo ====================================
echo.

:: Detect Docker
where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [FOUND] Docker Desktop
    echo.
    echo Starting NodePress with Docker...
    docker compose up -d
    echo.
    echo ✅ NodePress is running!
    echo Open: http://localhost:3000
    pause
    start http://localhost:3000
    exit /b
)

:: Detect Node.js
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [FOUND] Node.js
    echo Installing dependencies...
    call pnpm install
    call pnpm db:migrate
    call pnpm dev
    exit /b
)

:: Nothing found
echo ❌ You need Docker Desktop or Node.js to run NodePress.
echo.
echo Option 1: Install Docker Desktop (EASIEST)
echo   https://www.docker.com/products/docker-desktop/
echo.
echo Option 2: Install Node.js
echo   https://nodejs.org/ (version 20+)
echo.
pause
```

### install.sh (Unix)

```bash
#!/bin/bash
echo "NodePress - One-Click Installer"
echo "================================"

# Detect Docker
if command -v docker &> /dev/null; then
    echo "[FOUND] Docker"
    docker compose up -d
    echo "✅ NodePress is running!"
    echo "Open: http://localhost:3000"
    open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null
    exit 0
fi

# Detect Node.js
if command -v node &> /dev/null; then
    echo "[FOUND] Node.js"
    pnpm install && pnpm db:migrate && pnpm dev
    exit 0
fi

echo "❌ Please install Docker Desktop or Node.js 20+"
echo "Docker: https://www.docker.com/products/docker-desktop/"
echo "Node: https://nodejs.org/"
```

---

## 7. Success Metrics

| Metric                    | Before                                             | Target                |
| ------------------------- | -------------------------------------------------- | --------------------- |
| Steps to install          | 5-7 (clone, install, config, migrate, seed, start) | 1 (double-click)      |
| Prerequisites needed      | 3 (Node, pnpm, Docker)                             | 1 (Docker OR Node)    |
| Time to first content     | ~15 minutes                                        | <3 minutes            |
| Commands to type          | 5+                                                 | 0 (double-click only) |
| Documentation readability | Technical jargon                                   | Plain language        |

---

## 8. Acceptance Criteria

- [ ] Non-technical user can install by double-clicking ONE file
- [ ] Installer auto-detects Docker and Node.js
- [ ] If neither is installed, shows CLEAR download links
- [ ] Browser opens automatically after install
- [ ] Install wizard is the first thing user sees
- [ ] README has ONE clear installation path
- [ ] Error messages are in plain language
- [ ] Windows and Mac/Linux both supported
