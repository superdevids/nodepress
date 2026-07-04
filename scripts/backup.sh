#!/bin/bash
# ============================================================
# NodePress — Automated Production Backup with Rotation
# ============================================================
# Usage:
#   bash scripts/backup.sh                          # Local backup
#   bash scripts/backup.sh --s3-bucket my-backups    # Backup to S3
#   bash scripts/backup.sh --help                    # Show help
#
# Options:
#   --s3-bucket BUCKET   Upload to S3-compatible storage after backup
#   --keep-daily N       Number of daily backups to keep (default: 7)
#   --keep-weekly N      Number of weekly backups to keep (default: 4)
#   --keep-monthly N     Number of monthly backups to keep (default: 3)
#   --backup-dir DIR     Local backup directory (default: ./backups)
#   --no-upload          Skip upload even if S3 bucket is configured
#   --help               Show this help
# ============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Defaults ─────────────────────────────────────────────────
S3_BUCKET=""
BACKUP_DIR="./backups"
KEEP_DAILY=7
KEEP_WEEKLY=4
KEEP_MONTHLY=3
NO_UPLOAD=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="nodepress_backup_${TIMESTAMP}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"

# ── Parse Arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --s3-bucket)   S3_BUCKET="$2";  shift 2 ;;
    --keep-daily)   KEEP_DAILY="$2";  shift 2 ;;
    --keep-weekly)  KEEP_WEEKLY="$2";  shift 2 ;;
    --keep-monthly) KEEP_MONTHLY="$2"; shift 2 ;;
    --backup-dir)   BACKUP_DIR="$2";  shift 2 ;;
    --no-upload)    NO_UPLOAD=true;   shift ;;
    --help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# ── Load Environment ─────────────────────────────────────────
if [[ -f "${PROJECT_DIR}/${ENV_FILE}" ]]; then
  set -a
  source "${PROJECT_DIR}/${ENV_FILE}"
  set +a
fi

# ── Setup ────────────────────────────────────────────────────
BACKUP_DIR_ABS="${PROJECT_DIR}/${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR_ABS}"
cd "${PROJECT_DIR}"

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}   NodePress Backup — ${TIMESTAMP}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# ── Step 1: Database Dump ────────────────────────────────────
echo -e "${BLUE}[1/4]${NC} Dumping PostgreSQL database..."

DB_USER="${POSTGRES_USER:-nodepress}"
DB_PASS="${POSTGRES_PASSWORD:-nodepress}"
DB_NAME="${POSTGRES_DB:-nodepress}"
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_DUMP_FILE="${BACKUP_DIR_ABS}/${BACKUP_NAME}.sql.gz"

# Try docker exec first, fall back to local pg_dump
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-postgres'; then
  docker exec nodepress-postgres pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --no-comments \
    2>/dev/null | gzip > "${DB_DUMP_FILE}"
  echo -e "${GREEN}  ✓ Database dumped via Docker${NC}"
elif command -v pg_dump &>/dev/null; then
  PGPASSWORD="${DB_PASS}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --clean \
    --if-exists \
    --no-owner \
    2>/dev/null | gzip > "${DB_DUMP_FILE}"
  echo -e "${GREEN}  ✓ Database dumped via pg_dump${NC}"
else
  echo -e "${RED}  ✖ Cannot dump database — no Docker or pg_dump available${NC}"
  exit 1
fi

# Verify dump
if [[ ! -s "${DB_DUMP_FILE}" ]]; then
  echo -e "${RED}  ✖ Database dump is empty — backup failed${NC}"
  rm -f "${DB_DUMP_FILE}"
  exit 1
fi

DB_SIZE=$(du -h "${DB_DUMP_FILE}" | cut -f1)
echo -e "${GREEN}  ✓ Database dump size: ${DB_SIZE}${NC}"

# ── Step 2: Archive Media Files ──────────────────────────────
echo -e "${BLUE}[2/4]${NC} Archiving media files..."
MEDIA_ARCHIVE="${BACKUP_DIR_ABS}/${BACKUP_NAME}_media.tar.gz"

# Check MinIO volume for media
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-minio'; then
  # Use MinIO client if available, or mount volume directly
  docker run --rm \
    --volumes-from nodepress-minio:ro \
    -v "${BACKUP_DIR_ABS}:/backup" \
    alpine tar czf "/backup/$(basename "${MEDIA_ARCHIVE}")" \
    -C /data . 2>/dev/null && \
  mv "${BACKUP_DIR_ABS}/$(basename "${MEDIA_ARCHIVE}")" "${MEDIA_ARCHIVE}" 2>/dev/null || {
    echo -e "${YELLOW}  ⚠ Could not archive MinIO volume directly${NC}"
    echo -e "  ${YELLOW}  ⚠ Backing up database only${NC}"
    touch "${MEDIA_ARCHIVE}"
  }
elif [[ -d "${PROJECT_DIR}/storage/uploads" ]]; then
  tar czf "${MEDIA_ARCHIVE}" \
    -C "${PROJECT_DIR}" \
    storage/uploads 2>/dev/null
fi

if [[ -s "${MEDIA_ARCHIVE}" ]]; then
  MEDIA_SIZE=$(du -h "${MEDIA_ARCHIVE}" | cut -f1)
  echo -e "${GREEN}  ✓ Media archive size: ${MEDIA_SIZE}${NC}"
else
  echo -e "${YELLOW}  ⚠ No media files archived${NC}"
  rm -f "${MEDIA_ARCHIVE}"
fi

# ── Step 3: Create Manifest ──────────────────────────────────
echo -e "${BLUE}[3/4]${NC} Creating backup manifest..."
MANIFEST="${BACKUP_DIR_ABS}/${BACKUP_NAME}.manifest"

{
  echo "nodepress_backup"
  echo "timestamp: ${TIMESTAMP}"
  echo "date: $(date -R)"
  echo "node_version: $(node --version 2>/dev/null || echo 'unknown')"
  echo "postgres_version: $(docker exec nodepress-postgres psql -U ${DB_USER} -d ${DB_NAME} -c 'SELECT version();' -t 2>/dev/null | head -1 | xargs || echo 'unknown')"
  echo "hostname: $(hostname)"
  echo "backup_files:"
  echo "  - ${BACKUP_NAME}.sql.gz ($(du -h "${DB_DUMP_FILE}" 2>/dev/null | cut -f1))"
  if [[ -s "${MEDIA_ARCHIVE}" ]]; then
    echo "  - ${BACKUP_NAME}_media.tar.gz ($(du -h "${MEDIA_ARCHIVE}" 2>/dev/null | cut -f1))"
  fi
} > "${MANIFEST}"

echo -e "${GREEN}  ✓ Manifest created${NC}"

# ── Step 4: Upload to S3 ─────────────────────────────────────
if [[ -n "${S3_BUCKET}" ]] && ! $NO_UPLOAD; then
  echo -e "${BLUE}[4/4]${NC} Uploading to S3 bucket: ${S3_BUCKET}..."

  UPLOAD_SUCCESS=false

  # Try aws CLI
  if command -v aws &>/dev/null; then
    aws s3 cp "${DB_DUMP_FILE}" "s3://${S3_BUCKET}/database/" --only-show-errors 2>/dev/null
    aws s3 cp "${MANIFEST}" "s3://${S3_BUCKET}/manifests/" --only-show-errors 2>/dev/null
    if [[ -s "${MEDIA_ARCHIVE}" ]]; then
      aws s3 cp "${MEDIA_ARCHIVE}" "s3://${S3_BUCKET}/media/" --only-show-errors 2>/dev/null
    fi
    UPLOAD_SUCCESS=true
    echo -e "${GREEN}  ✓ Uploaded via aws CLI${NC}"
  elif command -v mc &>/dev/null; then
    # Try MinIO client
    mc cp "${DB_DUMP_FILE}" "local/${S3_BUCKET}/database/" 2>/dev/null || true
    mc cp "${MANIFEST}" "local/${S3_BUCKET}/manifests/" 2>/dev/null || true
    if [[ -s "${MEDIA_ARCHIVE}" ]]; then
      mc cp "${MEDIA_ARCHIVE}" "local/${S3_BUCKET}/media/" 2>/dev/null || true
    fi
    UPLOAD_SUCCESS=true
    echo -e "${GREEN}  ✓ Uploaded via mc CLI${NC}"
  else
    echo -e "${YELLOW}  ⚠ No S3-compatible CLI found (install awscli or mc)${NC}"
    echo -e "  ${YELLOW}  ⚠ Backup saved locally at: ${BACKUP_DIR_ABS}${NC}"
  fi

  if $UPLOAD_SUCCESS; then
    echo -e "${GREEN}  ✓ Upload complete${NC}"
  fi
else
  echo -e "${BLUE}[4/4]${NC} Skipping S3 upload (no bucket configured)"
fi

# ── Rotation ──────────────────────────────────────────────────
echo ""
echo -e "${BLUE}Rotating old backups...${NC}"
ROTATED=0

# Daily rotation (keep last N days)
find "${BACKUP_DIR_ABS}" -name "nodepress_backup_*.sql.gz" -mtime +${KEEP_DAILY} -delete 2>/dev/null || true
find "${BACKUP_DIR_ABS}" -name "nodepress_backup_*.manifest" -mtime +${KEEP_DAILY} -delete 2>/dev/null || true
find "${BACKUP_DIR_ABS}" -name "nodepress_backup_*_media.tar.gz" -mtime +${KEEP_DAILY} -delete 2>/dev/null || true
ROTATED=$((ROTATED + 1))

# Weekly rotation (Sundays): keep KEEP_WEEKLY
find "${BACKUP_DIR_ABS}" -name "nodepress_backup_*.sql.gz" -mtime +$((KEEP_WEEKLY * 7)) -delete 2>/dev/null || true
ROTATED=$((ROTATED + 1))

# Monthly rotation (1st of month): keep KEEP_MONTHLY
find "${BACKUP_DIR_ABS}" -name "nodepress_backup_*.sql.gz" -mtime +$((KEEP_MONTHLY * 30)) -delete 2>/dev/null || true
ROTATED=$((ROTATED + 1))

echo -e "${GREEN}  ✓ Rotation complete (${ROTATED} tiers)${NC}"

# ── Cleanup Empty Media Archive ──────────────────────────────
if [[ -f "${MEDIA_ARCHIVE}" ]] && [[ ! -s "${MEDIA_ARCHIVE}" ]]; then
  rm -f "${MEDIA_ARCHIVE}"
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Backup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Location:${NC}  ${BACKUP_DIR_ABS}/${BACKUP_NAME}.*"
echo -e "  ${CYAN}Database:${NC}  ${DB_SIZE} (gzipped SQL)"
echo -e "  ${CYAN}Media:${NC}     ${MEDIA_SIZE:-N/A}"
if [[ -n "${S3_BUCKET}" ]]; then
  echo -e "  ${CYAN}S3 Bucket:${NC} s3://${S3_BUCKET}/"
fi
echo ""
echo -e "  ${YELLOW}To restore:${NC} bash scripts/restore.sh ${BACKUP_DIR_ABS}/${BACKUP_NAME}"
echo ""
