#!/bin/bash
# ============================================================
# NodePress — Restore from Backup
# ============================================================
# Usage:
#   bash scripts/restore.sh ./backups/nodepress_backup_20240101_120000
#   bash scripts/restore.sh --list                          # List available backups
#   bash scripts/restore.sh --latest                        # Restore latest backup
#   bash scripts/restore.sh --help                          # Show this help
#
# Arguments:
#   backup-path       Path to backup file (without extension) or --latest
#   --list            List all available backups
#   --latest          Restore the most recent backup
#   --force           Skip confirmation prompt
#   --skip-media      Skip media file restoration
#   --help            Show this help
# ============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Defaults ─────────────────────────────────────────────────
BACKUP_PATH=""
DO_LIST=false
DO_LATEST=false
FORCE=false
SKIP_MEDIA=false
BACKUP_DIR="./backups"
COMPOSE_FILE="docker-compose.prod.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

# ── Parse Arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)       DO_LIST=true;     shift ;;
    --latest)     DO_LATEST=true;   shift ;;
    --force)      FORCE=true;       shift ;;
    --skip-media) SKIP_MEDIA=true;  shift ;;
    --help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    -*)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
    *)
      BACKUP_PATH="$1"
      shift
      ;;
  esac
done

cd "${PROJECT_DIR}"

# ── List Backups ─────────────────────────────────────────────
if $DO_LIST; then
  echo -e "${BLUE}Available backups:${NC}"
  echo ""
  for manifest in "${BACKUP_DIR}"/*.manifest; do
    if [[ -f "${manifest}" ]]; then
      echo -e "  ${CYAN}Backup:${NC} $(basename "${manifest}" .manifest)"
      cat "${manifest}" | grep -E '^(timestamp|date):' | sed 's/^/    /'
      echo ""
    fi
  done
  exit 0
fi

# ── Latest Backup ────────────────────────────────────────────
if $DO_LATEST; then
  LATEST=$(find "${BACKUP_DIR}" -name "nodepress_backup_*.sql.gz" -type f 2>/dev/null | sort -r | head -1)
  if [[ -z "${LATEST}" ]]; then
    echo -e "${RED}  ✖ No backups found in ${BACKUP_DIR}${NC}"
    exit 1
  fi
  BACKUP_PATH="${LATEST%.sql.gz}"
  echo -e "${GREEN}  ✓ Latest backup: $(basename "${BACKUP_PATH}")${NC}"
fi

# ── Validate Backup Path ────────────────────────────────────
if [[ -z "${BACKUP_PATH}" ]]; then
  echo -e "${RED}  ✖ No backup specified. Use a path, --latest, or --list${NC}"
  echo "  Usage: bash scripts/restore.sh <backup-path>"
  exit 1
fi

# Strip .sql.gz if provided
BACKUP_PATH="${BACKUP_PATH%.sql.gz}"
BACKUP_BASENAME=$(basename "${BACKUP_PATH}")
BACKUP_DIR_ABS=$(cd "$(dirname "${BACKUP_PATH}")" 2>/dev/null && pwd || echo "${PROJECT_DIR}/${BACKUP_DIR}")
BACKUP_FILE="${BACKUP_DIR_ABS}/${BACKUP_BASENAME}.sql.gz"
MEDIA_FILE="${BACKUP_DIR_ABS}/${BACKUP_BASENAME}_media.tar.gz"
MANIFEST_FILE="${BACKUP_DIR_ABS}/${BACKUP_BASENAME}.manifest"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo -e "${RED}  ✖ Backup file not found: ${BACKUP_FILE}${NC}"
  echo "  Available backups:"
  find "${PROJECT_DIR}/${BACKUP_DIR}" -name "nodepress_backup_*.sql.gz" -exec basename {} \; 2>/dev/null
  exit 1
fi

# ── Confirmation ─────────────────────────────────────────────
echo -e "${RED}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║         WARNING: Database Restore             ║${NC}"
echo -e "${RED}║  This will OVERWRITE the current database.    ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════╝${NC}"
echo ""

if [[ -f "${MANIFEST_FILE}" ]]; then
  echo -e "${BLUE}Backup details:${NC}"
  cat "${MANIFEST_FILE}"
  echo ""
fi

if ! $FORCE; then
  echo -e -n "${YELLOW}Are you sure you want to restore this backup? [y/N] ${NC}"
  read -r CONFIRM
  if [[ ! "${CONFIRM}" =~ ^[Yy]$ ]]; then
    echo -e "${RED}  ✖ Restore cancelled${NC}"
    exit 1
  fi
fi

# ── Stop Services ────────────────────────────────────────────
echo ""
echo -e "${BLUE}[1/5]${NC} Stopping services..."
docker compose -f "${COMPOSE_FILE}" stop api admin worker 2>/dev/null || true
echo -e "${GREEN}  ✓ Services stopped${NC}"

# ── Restore Database ─────────────────────────────────────────
echo -e "${BLUE}[2/5]${NC} Restoring database from: ${BACKUP_BASENAME}.sql.gz"

DB_USER="${POSTGRES_USER:-nodepress}"
DB_NAME="${POSTGRES_DB:-nodepress}"

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-postgres'; then
  # Drop and recreate database
  docker exec -i nodepress-postgres psql -U "${DB_USER}" -d postgres \
    -c "DROP DATABASE IF EXISTS \"${DB_NAME}\";" \
    -c "CREATE DATABASE \"${DB_NAME}\" OWNER \"${DB_USER}\";" 2>/dev/null

  # Restore from gzipped dump
  gunzip -c "${BACKUP_FILE}" | docker exec -i nodepress-postgres psql -U "${DB_USER}" -d "${DB_NAME}" 2>/dev/null
  echo -e "${GREEN}  ✓ Database restored${NC}"
elif command -v psql &>/dev/null && command -v pg_restore &>/dev/null; then
  # Local postgres restore
  gunzip -c "${BACKUP_FILE}" | psql -U "${DB_USER}" -d "${DB_NAME}" 2>/dev/null
  echo -e "${GREEN}  ✓ Database restored${NC}"
else
  echo -e "${RED}  ✖ Cannot restore database — no Docker or PostgreSQL client available${NC}"
  exit 1
fi

# ── Restore Media Files ──────────────────────────────────────
if ! $SKIP_MEDIA && [[ -f "${MEDIA_FILE}" ]] && [[ -s "${MEDIA_FILE}" ]]; then
  echo -e "${BLUE}[3/5]${NC} Restoring media files..."

  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-minio'; then
    docker run --rm \
      --volumes-from nodepress-minio \
      -v "${BACKUP_DIR_ABS}:/backup" \
      alpine tar xzf "/backup/$(basename "${MEDIA_FILE}")" \
      -C /data 2>/dev/null
    echo -e "${GREEN}  ✓ Media files restored to MinIO${NC}"
  elif [[ -d "${PROJECT_DIR}/storage/uploads" ]]; then
    tar xzf "${MEDIA_FILE}" -C "${PROJECT_DIR}" 2>/dev/null
    echo -e "${GREEN}  ✓ Media files restored to storage/uploads${NC}"
  else
    echo -e "${YELLOW}  ⚠ Media files saved but cannot restore target${NC}"
  fi
else
  echo -e "${YELLOW}[3/5]${NC} Skipping media restoration"
fi

# ── Restart Services ─────────────────────────────────────────
echo -e "${BLUE}[4/5]${NC} Restarting services..."
docker compose -f "${COMPOSE_FILE}" up -d
echo -e "${GREEN}  ✓ Services restarted${NC}"

# ── Health Check ─────────────────────────────────────────────
echo -e "${BLUE}[5/5]${NC} Running health check..."

sleep 10
for i in {1..20}; do
  if docker compose -f "${COMPOSE_FILE}" exec -T api curl -sf http://localhost:3001/healthz &>/dev/null; then
    echo -e "${GREEN}  ✓ API is healthy${NC}"
    break
  fi
  if [[ $i -eq 20 ]]; then
    echo -e "${YELLOW}  ⚠ API health check timed out — check logs:${NC}"
    echo "    docker compose -f ${COMPOSE_FILE} logs --tail=30 api"
  fi
  sleep 3
done

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Restore Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Backup:${NC}    ${BACKUP_BASENAME}"
echo -e "  ${CYAN}Database:${NC}  Restored from SQL dump"
if [[ -f "${MEDIA_FILE}" ]] && [[ -s "${MEDIA_FILE}" ]]; then
  echo -e "  ${CYAN}Media:${NC}     Restored"
fi
echo ""
echo -e "  ${CYAN}Dashboard:${NC} Access via your domain / http://localhost:3000"
echo ""
