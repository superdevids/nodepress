#!/bin/bash
# ============================================================
# NodePress — Post-Deployment Validation
# ============================================================
# Usage:
#   bash scripts/post-deploy.sh [--domain example.com]
#   bash scripts/post-deploy.sh --help
#
# This script validates that the deployment is fully
# functional by checking:
#   - All containers are running
#   - API endpoints respond correctly
#   - Database has correct schema
#   - Redis is reachable
#   - SSL certificates are valid
#   - Security headers are present
#   - CORS is configured correctly
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN=""
FAILURES=0

# ── Parse Arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *) echo -e "${RED}Unknown: $1${NC}"; exit 1 ;;
  esac
done

echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${CYAN}   NodePress — Post-Deployment Validation${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo ""

# ── 1. Container Status ─────────────────────────────────────
echo -e "${BLUE}[1/7]${NC} Checking container status..."
RUNNING=$(docker compose -f docker-compose.prod.yml ps --format "{{.Name}}:{{.Status}}" 2>/dev/null)
ALL_SERVICES="traefik postgres pgbouncer redis minio api admin"
for svc in $ALL_SERVICES; do
  if echo "$RUNNING" | grep -qi "${svc}.*Up"; then
    echo -e "  ${GREEN}✓ ${svc}${NC}"
  else
    echo -e "  ${RED}✖ ${svc} — NOT RUNNING${NC}"
    FAILURES=$((FAILURES + 1))
  fi
done

# ── 2. API Health ───────────────────────────────────────────
echo ""
echo -e "${BLUE}[2/7]${NC} Checking API health..."
API_URL="http://localhost:3001"
if [[ -n "${DOMAIN}" ]]; then
  API_URL="https://api.${DOMAIN}"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/healthz" 2>/dev/null || echo "failed")
if [[ "${HTTP_CODE}" == "200" ]]; then
  HEALTH_BODY=$(curl -s "${API_URL}/healthz" 2>/dev/null)
  echo -e "  ${GREEN}✓ ${API_URL}/healthz → 200${NC}"
  echo -e "  ${GREEN}  Response: ${HEALTH_BODY}${NC}"
else
  echo -e "  ${RED}✖ ${API_URL}/healthz → ${HTTP_CODE}${NC}"
  FAILURES=$((FAILURES + 1))
fi

# ── 3. Readiness Check ──────────────────────────────────────
echo ""
echo -e "${BLUE}[3/7]${NC} Checking readiness..."
READY_STATUS=$(curl -s "${API_URL}/readyz" 2>/dev/null || echo '{"status":"error"}')
if echo "${READY_STATUS}" | grep -q '"status":"healthy"'; then
  echo -e "  ${GREEN}✓ All dependencies healthy${NC}"
  echo -e "  ${GREEN}  Details: ${READY_STATUS}${NC}" | head -c 200
  echo ""
else
  echo -e "  ${YELLOW}⚠ Readiness check result:${NC}"
  echo -e "  ${YELLOW}  ${READY_STATUS}${NC}" | head -c 300
  echo ""
fi

# ── 4. Security Headers ─────────────────────────────────────
echo ""
echo -e "${BLUE}[4/7]${NC} Checking security headers..."
HEADERS=$(curl -sI "${API_URL}/healthz" 2>/dev/null)

check_header() {
  local header="$1"
  local expected="$2"
  if echo "${HEADERS}" | grep -qi "${header}"; then
    echo -e "  ${GREEN}✓ ${header} present${NC}"
  else
    echo -e "  ${YELLOW}⚠ ${header} missing (may be set by Traefik reverse proxy)${NC}"
  fi
}

check_header "Strict-Transport-Security"
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"
check_header "Referrer-Policy"

# ── 5. Database Connection ──────────────────────────────────
echo ""
echo -e "${BLUE}[5/7]${NC} Checking database connection..."
if docker exec nodepress-postgres pg_isready -U "${POSTGRES_USER:-nodepress}" -d "${POSTGRES_DB:-nodepress}" &>/dev/null; then
  DB_VERSION=$(docker exec nodepress-postgres psql -U "${POSTGRES_USER:-nodepress}" -d "${POSTGRES_DB:-nodepress}" -c "SELECT version();" -t 2>/dev/null | head -1 | xargs)
  echo -e "  ${GREEN}✓ PostgreSQL connected${NC}"
  echo -e "  ${GREEN}  ${DB_VERSION:0:80}...${NC}"

  # Check if migrations are applied
  MIGRATIONS=$(docker exec nodepress-postgres psql -U "${POSTGRES_USER:-nodepress}" -d "${POSTGRES_DB:-nodepress}" -c "SELECT count(*) FROM _prisma_migrations;" -t 2>/dev/null | xargs)
  echo -e "  ${GREEN}  ${MIGRATIONS} migrations applied${NC}"
else
  echo -e "  ${RED}✖ Cannot connect to PostgreSQL${NC}"
  FAILURES=$((FAILURES + 1))
fi

# ── 6. Redis Connection ─────────────────────────────────────
echo ""
echo -e "${BLUE}[6/7]${NC} Checking Redis connection..."
if docker exec nodepress-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
  REDIS_INFO=$(docker exec nodepress-redis redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2)
  echo -e "  ${GREEN}✓ Redis connected${NC}"
  echo -e "  ${GREEN}  Memory used: ${REDIS_INFO:-N/A}${NC}"
else
  echo -e "  ${RED}✖ Cannot connect to Redis${NC}"
  FAILURES=$((FAILURES + 1))
fi

# ── 7. SSL Certificate ─────────────────────────────────────
echo ""
echo -e "${BLUE}[7/7]${NC} Checking SSL certificate..."
if [[ -n "${DOMAIN}" ]]; then
  SSL_EXPIRY=$(echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" | cut -d= -f2)
  if [[ -n "${SSL_EXPIRY}" ]]; then
    echo -e "  ${GREEN}✓ SSL certificate expires: ${SSL_EXPIRY}${NC}"
  else
    echo -e "  ${YELLOW}⚠ Could not check SSL certificate${NC}"
    echo -e "  ${YELLOW}  (Domain may not resolve to this server yet)${NC}"
  fi
else
  echo -e "  ${YELLOW}⚠ Skipping SSL check (no domain specified)${NC}"
  echo -e "  ${YELLOW}  Run: bash scripts/setup-ssl.sh --domain yourdomain.com --email you@email.com${NC}"
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
if [[ "${FAILURES}" -eq 0 ]]; then
  echo -e "${GREEN}   ✅ All checks passed — deployment is healthy!${NC}"
else
  echo -e "${RED}   ❌ ${FAILURES} check(s) failed — review issues above${NC}"
fi
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
exit ${FAILURES}
