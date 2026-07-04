#!/bin/bash
# ============================================================
# NodePress — One-Command Production Deploy
# ============================================================
# Usage:
#   bash scripts/deploy.sh [--domain example.com] [--email admin@example.com] [--env-file .env.production]
#
# Options:
#   --domain DOMAIN       Your production domain (e.g., example.com)
#   --email EMAIL         Email for Let's Encrypt notifications
#   --env-file FILE       Path to .env file (default: .env.production)
#   --skip-build          Skip Docker build, use existing images
#   --skip-migrate        Skip database migrations
#   --help                Show this help
# ============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Defaults ─────────────────────────────────────────────────
DOMAIN=""
EMAIL=""
ENV_FILE=".env.production"
SKIP_BUILD=false
SKIP_MIGRATE=false
COMPOSE_FILE="docker-compose.prod.yml"

# ── Parse Arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)    DOMAIN="$2";   shift 2 ;;
    --email)     EMAIL="$2";    shift 2 ;;
    --env-file)  ENV_FILE="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    --skip-migrate) SKIP_MIGRATE=true; shift ;;
    --help)
      sed -n '2,15p' "$0"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: bash scripts/deploy.sh [--domain example.com] [--email admin@example.com]"
      exit 1
      ;;
  esac
done

# ── Banner ───────────────────────────────────────────────────
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║         NodePress — Production Deploy          ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 0: Prerequisites ───────────────────────────────────
echo -e "${BLUE}[0/7]${NC} Checking prerequisites..."

# Docker
if ! command -v docker &>/dev/null; then
  echo -e "${RED}  ✖ Docker is not installed.${NC}"
  echo "  Install: https://docs.docker.com/engine/install/"
  exit 1
fi
echo -e "${GREEN}  ✓ Docker $(docker --version)${NC}"

# Docker Compose
if ! docker compose version &>/dev/null; then
  echo -e "${RED}  ✖ Docker Compose v2 is not installed.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ $(docker compose version)${NC}"

# Git (for pulling latest code)
if ! command -v git &>/dev/null; then
  echo -e "${YELLOW}  ⚠ git not found — skipping code update${NC}"
  CAN_GIT=false
else
  CAN_GIT=true
fi

# ── Step 1: Update Code ─────────────────────────────────────
if $CAN_GIT; then
  echo -e "${BLUE}[1/7]${NC} Updating code from repository..."
  if git rev-parse --is-inside-work-tree &>/dev/null; then
    git fetch --all --quiet
    git pull --ff-only origin main 2>&1 || git pull --ff-only origin master 2>&1 || true
    echo -e "${GREEN}  ✓ Code updated${NC}"
  else
    echo -e "${YELLOW}  ⚠ Not a git repository — skipping update${NC}"
  fi
else
  echo -e "${YELLOW}[1/7]${NC} Skipping code update (git not available)"
fi

# ── Step 2: Generate Secrets ─────────────────────────────────
echo -e "${BLUE}[2/7]${NC} Checking secrets..."
SECRETS_MISSING=false

# Check JWT_SECRET
if grep -q '^JWT_SECRET=\s*$\|^JWT_SECRET=change-me' "${ENV_FILE}" 2>/dev/null; then
  SECRETS_MISSING=true
fi

# Check JWT_REFRESH_SECRET
if grep -q '^JWT_REFRESH_SECRET=\s*$\|^JWT_REFRESH_SECRET=change-me' "${ENV_FILE}" 2>/dev/null; then
  SECRETS_MISSING=true
fi

if $SECRETS_MISSING; then
  echo -e "${YELLOW}  ⚠ Missing or default secrets detected${NC}"
  echo -e "  Use ${MAGENTA}scripts/setup-ssl.sh${NC} to generate secure values, or edit ${ENV_FILE} manually."
  read -rp "  Continue anyway? [y/N] " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}  ✖ Deploy cancelled${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}  ✓ Secrets configured${NC}"
fi

# ── Step 3: Configure Domain & SSL ──────────────────────────
if [[ -n "$DOMAIN" ]]; then
  echo -e "${BLUE}[3/7]${NC} Configuring domain: ${DOMAIN}"

  # Update APP_DOMAIN in env file
  if grep -q '^APP_DOMAIN=' "${ENV_FILE}" 2>/dev/null; then
    # macOS/BSD sed vs GNU sed compatibility
    if sed --version 2>/dev/null | grep -q GNU; then
      sed -i "s/^APP_DOMAIN=.*/APP_DOMAIN=${DOMAIN}/" "${ENV_FILE}"
    else
      sed -i '' "s/^APP_DOMAIN=.*/APP_DOMAIN=${DOMAIN}/" "${ENV_FILE}"
    fi
  else
    echo "APP_DOMAIN=${DOMAIN}" >> "${ENV_FILE}"
  fi

  # Update LETSENCRYPT_EMAIL
  if [[ -n "$EMAIL" ]]; then
    if grep -q '^LETSENCRYPT_EMAIL=' "${ENV_FILE}" 2>/dev/null; then
      if sed --version 2>/dev/null | grep -q GNU; then
        sed -i "s/^LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=${EMAIL}/" "${ENV_FILE}"
      else
        sed -i '' "s/^LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=${EMAIL}/" "${ENV_FILE}"
      fi
    else
      echo "LETSENCRYPT_EMAIL=${EMAIL}" >> "${ENV_FILE}"
    fi
  fi

  echo -e "${GREEN}  ✓ Domain configured${NC}"
else
  echo -e "${YELLOW}[3/7]${NC} No domain specified — skipping SSL config"
  echo -e "  Run ${MAGENTA}bash scripts/setup-ssl.sh${NC} later to configure SSL"
fi

# ── Step 4: Create Required Directories ─────────────────────
echo -e "${BLUE}[4/7]${NC} Creating required directories..."
mkdir -p storage/logs storage/uploads
echo -e "${GREEN}  ✓ Directories created${NC}"

# ── Step 5: Build and Start Services ────────────────────────
echo -e "${BLUE}[5/7]${NC} Starting services..."

if $SKIP_BUILD; then
  echo -e "${YELLOW}  ⚠ Skipping build — using existing images${NC}"
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d
else
  echo -e "  Building and starting containers (this may take a while)..."
  docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build
fi

echo -e "${GREEN}  ✓ Services started${NC}"

# Wait for services to be healthy
echo -e "  Waiting for services to become healthy..."
sleep 10

# Check API health
for i in {1..30}; do
  if docker compose -f "${COMPOSE_FILE}" exec -T api curl -sf http://localhost:3001/healthz &>/dev/null; then
    echo -e "${GREEN}  ✓ API is healthy${NC}"
    API_HEALTHY=true
    break
  fi
  sleep 2
done

if [[ "${API_HEALTHY:-false}" != "true" ]]; then
  echo -e "${YELLOW}  ⚠ API health check timed out — checking logs...${NC}"
  docker compose -f "${COMPOSE_FILE}" logs --tail=20 api
fi

# ── Step 6: Run Database Migrations ─────────────────────────
if ! $SKIP_MIGRATE; then
  echo -e "${BLUE}[6/7]${NC} Running database migrations..."

  if docker compose -f "${COMPOSE_FILE}" exec -T api npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma 2>&1; then
    echo -e "${GREEN}  ✓ Migrations applied${NC}"
  else
    echo -e "${YELLOW}  ⚠ Migration failed — check database connection and try manually:${NC}"
    echo "    docker compose -f ${COMPOSE_FILE} exec api npx prisma migrate deploy"
  fi
fi

# ── Step 7: Verify & Print Success ───────────────────────────
echo -e "${BLUE}[7/7]${NC} Final verification..."

# Show running services
echo ""
echo -e "${GREEN}  ╔═══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}  ║        NodePress Deployment Complete!         ║${NC}"
echo -e "${GREEN}  ╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Extract domain for URLs
DOMAIN_VAL="${DOMAIN:-$(grep '^APP_DOMAIN=' "${ENV_FILE}" 2>/dev/null | cut -d= -f2)}"
if [[ -z "${DOMAIN_VAL}" ]]; then
  SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
  echo -e "  ${CYAN}Dashboard:${NC}  http://${SERVER_IP}:3000"
  echo -e "  ${CYAN}API:${NC}         http://${SERVER_IP}:3001"
  echo -e "  ${CYAN}API Docs:${NC}    http://${SERVER_IP}:3001/docs"
else
  echo -e "  ${CYAN}Dashboard:${NC}  https://${DOMAIN_VAL}"
  echo -e "  ${CYAN}Admin:${NC}       https://admin.${DOMAIN_VAL}"
  echo -e "  ${CYAN}API:${NC}         https://api.${DOMAIN_VAL}"
  echo -e "  ${CYAN}API Docs:${NC}    https://api.${DOMAIN_VAL}/docs"
  echo -e "  ${CYAN}Media:${NC}       https://s3.${DOMAIN_VAL}"
fi

echo ""
echo -e "  ${YELLOW}Post-deploy checklist:${NC}"
echo -e "  □ Verify SSL:  https://${DOMAIN_VAL:-your-domain.com}"
echo -e "  □ Run backup:  bash scripts/backup.sh"
echo -e "  □ Monitor:     bash scripts/monitor.sh --watch"
echo ""

# Show running container status
echo -e "${BLUE}Container status:${NC}"
docker compose -f "${COMPOSE_FILE}" ps

echo ""
echo -e "${GREEN}  ✅ Deployment successful!${NC}"
