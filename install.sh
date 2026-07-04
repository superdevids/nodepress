#!/usr/bin/env bash
set -e

# ============================================================
# NodePress - One-Click Installer (Linux / macOS)
# Modern CMS built with TypeScript
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

OS="unknown"
case "$(uname -s)" in
    Linux*)  OS="Linux" ;;
    Darwin*) OS="Mac"   ;;
esac

clear
echo "============================================================"
echo -e "           ${CYAN}🚀 NodePress - One-Click Installer${NC}"
echo -e "           ${YELLOW}Modern CMS for Everyone${NC}"
echo "============================================================"
echo ""
echo "This installer will set up everything to run NodePress."
echo "No technical knowledge required!"
echo ""

# ============================================================
# STEP 1: Detect environment
# ============================================================
echo -e "${BLUE}[1/3]${NC} Checking your system..."
echo ""

# --- Docker path ---
if command -v docker &> /dev/null; then
    echo -e "  ${GREEN}✅${NC} Docker detected! Using Docker (easiest method)."
    echo ""
    echo -e "  ${CYAN}Starting NodePress with Docker...${NC}"
    echo ""

    if [ ! -f .env ]; then
        echo -e "  ${YELLOW}📝${NC} Creating .env from .env.example..."
        cp .env.example .env
    fi

    docker compose up -d

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "  ${GREEN}✅${NC} ${WHITE}SUCCESS!${NC} NodePress is now running!"
        echo ""
        echo -e "  ${CYAN}🌐${NC} Open your browser to: ${GREEN}http://localhost:3000${NC}"
        echo ""
        echo -e "  ${YELLOW}Follow the Install Wizard (5 steps, ~2 minutes):${NC}"
        echo "    1. Database connection  (click \"Test Connection\")"
        echo "    2. Create admin account (email + password)"
        echo "    3. Site settings        (name your site)"
        echo "    4. Choose plugins       (SEO, Comments, Security...)"
        echo "    5. Done!                (start creating!)"
        echo ""

        # Open browser automatically
        if [ "$OS" = "Mac" ]; then
            open http://localhost:3000
        elif command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000 2>/dev/null &
        fi

        echo "============================================================"
        echo "  Your browser should open automatically."
        echo "  If not, visit: http://localhost:3000"
        echo "============================================================"
        exit 0
    else
        echo ""
        echo -e "  ${RED}❌${NC} Docker failed to start."
        echo ""
        echo -e "  ${YELLOW}Common fixes:${NC}"
        echo "    1. Make sure Docker Desktop is running"
        echo "    2. Restart Docker Desktop and try again"
        echo ""
        exit 1
    fi
fi

# --- Fallback: local Node.js setup ---
echo -e "  ${RED}❌${NC} Docker not found on your system."
echo ""
echo -e "  ${YELLOW}No problem! We'll use the Local setup instead.${NC}"
echo "  You just need Node.js (like a normal program installer)."
echo ""

if ! command -v node &> /dev/null; then
    echo -e "  ${RED}❌${NC} Neither Docker nor Node.js found."
    echo ""
    echo -e "  ${YELLOW}📥 You need to install ONE of these:${NC}"
    echo ""
    echo -e "  ${GREEN}Option A:${NC} Docker Desktop ${WHITE}(RECOMMENDED — easiest)${NC}"
    echo "    1. Download: https://www.docker.com/products/docker-desktop/"
    echo "    2. Install Docker Desktop"
    echo "    3. Run this installer again"
    echo ""
    echo -e "  ${GREEN}Option B:${NC} Node.js"
    echo "    1. Download: https://nodejs.org/ (version 20 or later)"
    echo "    2. Install Node.js"
    echo "    3. Run this installer again"
    echo ""

    if [ "$OS" = "Mac" ]; then
        open https://www.docker.com/products/docker-desktop/
    fi

    exit 1
fi

echo -e "  ${GREEN}✅${NC} Node.js detected! Setting up NodePress..."
echo ""

# --- .env ---
if [ ! -f .env ]; then
    echo -e "  ${YELLOW}📝${NC} Creating .env from .env.example..."
    cp .env.example .env
fi

echo ""

# --- Install dependencies (using npm) ---
echo -e "  ${CYAN}🛠️${NC} Installing NodePress dependencies..."
echo ""
npm install

# --- Database ---
echo ""
echo -e "  ${CYAN}🗄️${NC} Setting up database..."
echo ""
npm run db:migrate

echo ""
echo -e "  ${CYAN}🌱${NC} Seeding database with sample data..."
echo ""
npm run db:seed

echo ""
echo -e "  ${GREEN}============================================================${NC}"
echo -e "  ${GREEN}  ✅ SUCCESS! NodePress is ready!${NC}"
echo -e "  ${GREEN}============================================================${NC}"
echo ""
echo -e "  ${CYAN}🌐${NC} Admin Panel: ${GREEN}http://localhost:3000${NC}"
echo -e "  ${CYAN}📖${NC} API Docs:    ${GREEN}http://localhost:3001/docs${NC}"
echo ""
echo -e "  ${YELLOW}Login: admin@nodepress.local / admin${NC}"
echo ""
echo -e "  ${CYAN}Starting NodePress now...${NC}"
echo ""

# Open browser automatically
echo -e "  ${CYAN}Opening browser...${NC}"
if [ "$OS" = "Mac" ]; then
    open http://localhost:3000 &
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000 2>/dev/null &
fi

npm run dev
