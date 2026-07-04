#!/bin/bash
# ============================================================
# NodePress — Health Monitoring
# ============================================================
# Usage:
#   bash scripts/monitor.sh                    # Quick health check
#   bash scripts/monitor.sh --watch            # Continuous monitoring (refresh every 10s)
#   bash scripts/monitor.sh --slack-webhook    # Send alert to Slack on failure
#   bash scripts/monitor.sh --json             # Output as JSON
#   bash scripts/monitor.sh --help             # Show this help
# ============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Defaults ─────────────────────────────────────────────────
WATCH=false
WATCH_INTERVAL=10
JSON_OUTPUT=false
SLACK_WEBHOOK=""
COMPOSE_FILE="docker-compose.prod.yml"

# ── Parse Arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch)          WATCH=true; shift ;;
    --interval)       WATCH_INTERVAL="$2"; shift 2 ;;
    --json)           JSON_OUTPUT=true; shift ;;
    --slack-webhook)  SLACK_WEBHOOK="$2"; shift 2 ;;
    --help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# ── Health Check Function ────────────────────────────────────
check_health() {
  local ALL_PASSING=true
  local JSON_DATA="{}"
  local TIMESTAMP
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  # ── Header ──────────────────────────────────────────────────
  if ! $JSON_OUTPUT && ! $WATCH; then
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║         NodePress — Health Check             ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════╝${NC}"
    echo "  Timestamp: ${TIMESTAMP}"
    echo ""
  fi

  # ── 1. API Health ───────────────────────────────────────────
  local API_STATUS=""
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-api'; then
    API_STATUS=$(docker compose -f "${COMPOSE_FILE}" exec -T api curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/healthz 2>/dev/null || echo "failed")
  else
    API_STATUS="stopped"
  fi

  if [[ "${API_STATUS}" == "200" ]]; then
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "healthy" '.api = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ API         ● Healthy${NC}"
  else
    ALL_PASSING=false
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "unhealthy" '.api = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${RED}✖ API         ○ DOWN (HTTP ${API_STATUS})${NC}"
  fi

  # ── 2. Admin Health ─────────────────────────────────────────
  local ADMIN_STATUS=""
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-admin'; then
    ADMIN_STATUS=$(docker compose -f "${COMPOSE_FILE}" exec -T admin wget --no-verbose --tries=1 --spider http://localhost:3000/api/health 2>&1 | grep -c 'Remote file exists' || echo "failed")
  else
    ADMIN_STATUS="stopped"
  fi

  if [[ "${ADMIN_STATUS}" == "1" ]] || [[ "${ADMIN_STATUS}" == "200" ]]; then
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "healthy" '.admin = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ Admin      ● Healthy${NC}"
  else
    ALL_PASSING=false
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "unhealthy" '.admin = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${RED}✖ Admin      ○ DOWN${NC}"
  fi

  # ── 3. PostgreSQL ───────────────────────────────────────────
  local DB_STATUS=""
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-postgres'; then
    DB_STATUS=$(docker exec nodepress-postgres pg_isready -U "${POSTGRES_USER:-nodepress}" -d "${POSTGRES_DB:-nodepress}" 2>/dev/null | grep -c 'accepting connections' || echo "failed")
  else
    DB_STATUS="stopped"
  fi

  if [[ "${DB_STATUS}" == "1" ]] || [[ "${DB_STATUS}" == "0" ]]; then
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "healthy" '.database = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ PostgreSQL ● Healthy${NC}"
  else
    ALL_PASSING=false
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "unhealthy" '.database = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${RED}✖ PostgreSQL ○ DOWN${NC}"
  fi

  # ── 4. Redis ────────────────────────────────────────────────
  local REDIS_STATUS=""
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-redis'; then
    REDIS_STATUS=$(docker exec nodepress-redis redis-cli ping 2>/dev/null || echo "failed")
  else
    REDIS_STATUS="stopped"
  fi

  if [[ "${REDIS_STATUS}" == *"PONG"* ]]; then
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "healthy" '.redis = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ Redis      ● Healthy${NC}"
  else
    ALL_PASSING=false
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "unhealthy" '.redis = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${RED}✖ Redis      ○ DOWN${NC}"
  fi

  # ── 5. MinIO ────────────────────────────────────────────────
  local MINIO_STATUS=""
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-minio'; then
    MINIO_STATUS=$(docker exec nodepress-minio curl -sf -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live 2>/dev/null || echo "failed")
  else
    MINIO_STATUS="stopped"
  fi

  if [[ "${MINIO_STATUS}" == "200" ]]; then
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "healthy" '.minio = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ MinIO      ● Healthy${NC}"
  else
    ALL_PASSING=false
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "unhealthy" '.minio = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${RED}✖ MinIO      ○ DOWN${NC}"
  fi

  # ── 6. PgBouncer ────────────────────────────────────────────
  local PGBOUNCER_STATUS=""
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-pgbouncer'; then
    PGBOUNCER_STATUS=$(docker exec nodepress-pgbouncer pg_isready -h localhost -p 6432 -U "${POSTGRES_USER:-nodepress}" 2>/dev/null | grep -c 'accepting connections' || echo "failed")
  else
    PGBOUNCER_STATUS="stopped"
  fi

  if [[ "${PGBOUNCER_STATUS}" == "1" ]] || [[ "${PGBOUNCER_STATUS}" == "0" ]]; then
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "healthy" '.pgbouncer = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ PgBouncer  ● Healthy${NC}"
  else
    ALL_PASSING=false
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "unhealthy" '.pgbouncer = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo -e "  ${RED}✖ PgBouncer  ○ DOWN${NC}"
  fi

  # ── 7. System Resources ─────────────────────────────────────
  if command -v df &>/dev/null; then
    local DISK_USAGE
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "${DISK_USAGE}%" '.disk_usage = $v' 2>/dev/null || true)

    if [[ "${DISK_USAGE}" -gt 90 ]]; then
      ! $JSON_OUTPUT && echo -e "  ${RED}✖ Disk      ○ ${DISK_USAGE}% (CRITICAL)${NC}"
      ALL_PASSING=false
    elif [[ "${DISK_USAGE}" -gt 80 ]]; then
      ! $JSON_OUTPUT && echo -e "  ${YELLOW}⚠ Disk      ● ${DISK_USAGE}% (Warning)${NC}"
    else
      ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ Disk      ● ${DISK_USAGE}%${NC}"
    fi
  fi

  if command -v free &>/dev/null; then
    local MEM_USAGE
    MEM_USAGE=$(free | awk '/Mem/ {printf "%.0f", $3/$2 * 100}')
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "${MEM_USAGE}%" '.memory_usage = $v' 2>/dev/null || true)

    if [[ "${MEM_USAGE}" -gt 90 ]]; then
      ! $JSON_OUTPUT && echo -e "  ${RED}✖ Memory    ○ ${MEM_USAGE}% (CRITICAL)${NC}"
      ALL_PASSING=false
    elif [[ "${MEM_USAGE}" -gt 80 ]]; then
      ! $JSON_OUTPUT && echo -e "  ${YELLOW}⚠ Memory    ● ${MEM_USAGE}% (Warning)${NC}"
    else
      ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ Memory    ● ${MEM_USAGE}%${NC}"
    fi
  fi

  # ── 8. Container Status ─────────────────────────────────----
  local CONTAINERS
  CONTAINERS=$(docker compose -f "${COMPOSE_FILE}" ps --format "{{.Name}}:{{.Status}}" 2>/dev/null | grep -c "Up" || echo "0")
  local TOTAL_CONTAINERS
  TOTAL_CONTAINERS=$(docker compose -f "${COMPOSE_FILE}" ps --format "{{.Name}}" 2>/dev/null | wc -l || echo "0")
  JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "${CONTAINERS}/${TOTAL_CONTAINERS}" '.containers = $v' 2>/dev/null || true)
  ! $JSON_OUTPUT && echo -e "  ${GREEN}✓ Containers ● ${CONTAINERS}/${TOTAL_CONTAINERS} running${NC}"

  # ── Summary ─────────────────────────────────────────────────
  JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "${TIMESTAMP}" '.timestamp = $v' 2>/dev/null || true)

  if $ALL_PASSING; then
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "healthy" '.status = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo ""
    ! $JSON_OUTPUT && echo -e "  ${GREEN}${BOLD}✅ ALL SYSTEMS OPERATIONAL${NC}"
    ! $JSON_OUTPUT && echo ""
  else
    JSON_DATA=$(echo "${JSON_DATA}" | jq --arg v "degraded" '.status = $v' 2>/dev/null || true)
    ! $JSON_OUTPUT && echo ""
    ! $JSON_OUTPUT && echo -e "  ${RED}${BOLD}❌ SERVICE DEGRADED — Check logs: docker compose -f ${COMPOSE_FILE} logs${NC}"
    ! $JSON_OUTPUT && echo ""

    # Slack alert
    if [[ -n "${SLACK_WEBHOOK}" ]]; then
      curl -sf -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"⚠ NodePress Alert: Service degraded on $(hostname) at ${TIMESTAMP}\"}" \
        "${SLACK_WEBHOOK}" 2>/dev/null || true
    fi
  fi

  if $JSON_OUTPUT; then
    echo "${JSON_DATA}" | jq '.' 2>/dev/null || echo "${JSON_DATA}"
  fi
}

# ── Watch Mode ───────────────────────────────────────────────
if $WATCH; then
  while true; do
    clear 2>/dev/null || true
    check_health
    sleep "${WATCH_INTERVAL}"
  done
else
  check_health
fi
