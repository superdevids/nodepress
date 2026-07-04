#!/bin/bash
# ============================================================
# NodePress — SSL/HTTPS Setup (Let's Encrypt via Certbot)
# ============================================================
# Usage:
#   bash scripts/setup-ssl.sh --domain example.com --email admin@example.com
#   bash scripts/setup-ssl.sh --domain example.com --email admin@example.com --staging
#   bash scripts/setup-ssl.sh --help
#
# Options:
#   --domain DOMAIN       Your production domain (required)
#   --email EMAIL         Email for Let's Encrypt (required)
#   --staging             Use Let's Encrypt staging (avoids rate limits during testing)
#   --force-renew         Force renewal of existing certificates
#   --dns PROVIDER        DNS challenge provider for wildcard certs (cloudflare, route53, etc.)
#   --generate-secrets    Generate JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
#   --help                Show this help
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
DOMAIN=""
EMAIL=""
STAGING=false
FORCE_RENEW=false
DNS_PROVIDER=""
GENERATE_SECRETS=false
ENV_FILE=".env.production"

# ── Parse Arguments ──────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)         DOMAIN="$2";         shift 2 ;;
    --email)          EMAIL="$2";          shift 2 ;;
    --staging)        STAGING=true;        shift ;;
    --force-renew)    FORCE_RENEW=true;    shift ;;
    --dns)            DNS_PROVIDER="$2";   shift 2 ;;
    --generate-secrets) GENERATE_SECRETS=true; shift ;;
    --env-file)       ENV_FILE="$2";       shift 2 ;;
    --help)
      sed -n '2,16p' "$0"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# ── Validate ─────────────────────────────────────────────────
if [[ -z "${DOMAIN}" ]]; then
  echo -e "${RED}  ✖ --domain is required${NC}"
  echo "  Usage: bash scripts/setup-ssl.sh --domain example.com --email admin@example.com"
  exit 1
fi

if [[ -z "${EMAIL}" ]]; then
  echo -e "${RED}  ✖ --email is required${NC}"
  echo "  Usage: bash scripts/setup-ssl.sh --domain example.com --email admin@example.com"
  exit 1
fi

# ── Banner ───────────────────────────────────────────────────
echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════════╗"
echo "  ║      NodePress — SSL/HTTPS Setup              ║"
echo "  ╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Method 1: Traefik (Docker Compose) — Auto Let's Encrypt ──
echo -e "${BLUE}[1/4]${NC} Checking Traefik setup..."

if [[ -f "docker-compose.prod.yml" ]]; then
  echo -e "${GREEN}  ✓ docker-compose.prod.yml found${NC}"

  # Update env file with domain and email
  if [[ -f "${ENV_FILE}" ]]; then
    # Update or add APP_DOMAIN
    if grep -q '^APP_DOMAIN=' "${ENV_FILE}"; then
      sed -i "s/^APP_DOMAIN=.*/APP_DOMAIN=${DOMAIN}/" "${ENV_FILE}"
    else
      echo "APP_DOMAIN=${DOMAIN}" >> "${ENV_FILE}"
    fi

    # Update or add LETSENCRYPT_EMAIL
    if grep -q '^LETSENCRYPT_EMAIL=' "${ENV_FILE}"; then
      sed -i "s/^LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=${EMAIL}/" "${ENV_FILE}"
    else
      echo "LETSENCRYPT_EMAIL=${EMAIL}" >> "${ENV_FILE}"
    fi

    echo -e "${GREEN}  ✓ Domain and email configured in ${ENV_FILE}${NC}"
  else
    echo -e "${YELLOW}  ⚠ ${ENV_FILE} not found — creating...${NC}"
    echo "APP_DOMAIN=${DOMAIN}" > "${ENV_FILE}"
    echo "LETSENCRYPT_EMAIL=${EMAIL}" >> "${ENV_FILE}"
  fi
else
  echo -e "${YELLOW}  ⚠ docker-compose.prod.yml not found${NC}"
fi

# ── Method 2: Standalone Certbot (Fallback) ─────────────────
echo -e "${BLUE}[2/4]${NC} Setting up Let's Encrypt certificates..."

CERTBOT_MODE="http"
CERTBOT_ARGS=""

if $STAGING; then
  CERTBOT_ARGS="${CERTBOT_ARGS} --staging"
  echo -e "${YELLOW}  ⚠ Using Let's Encrypt STAGING environment${NC}"
fi

if $FORCE_RENEW; then
  CERTBOT_ARGS="${CERTBOT_ARGS} --force-renewal"
fi

# Check for existing Traefik certificate
TRAEFIK_CERT_STORAGE="/letsencrypt/acme.json"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-traefik'; then
  echo -e "${GREEN}  ✓ Traefik is running — certificates managed automatically${NC}"
  echo -e "${GREEN}  ✓ SSL will be obtained on first HTTPS request${NC}"
  echo ""
  echo -e "  First, ensure DNS A records point to your server:"
  echo -e "    ${DOMAIN}             → A record → <SERVER_IP>"
  echo -e "    admin.${DOMAIN}      → A record → <SERVER_IP>"
  echo -e "    api.${DOMAIN}        → A record → <SERVER_IP>"
  echo -e "    s3.${DOMAIN}         → A record → <SERVER_IP>"
  echo -e "    traefik.${DOMAIN}    → A record → <SERVER_IP>"
  echo ""
  echo -e "  Then restart Traefik:"
  echo -e "    docker compose -f docker-compose.prod.yml up -d traefik"
  echo ""
elif command -v certbot &>/dev/null; then
  echo -e "  Using standalone Certbot..."
  echo -e "  ${YELLOW}Note: Port 80 must be free for HTTP-01 challenge${NC}"

  # Stop any service on port 80 temporarily
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress'; then
    echo -e "  Stopping services on port 80..."
    docker compose -f docker-compose.prod.yml stop traefik 2>/dev/null || true
  fi

  # Request certificate
  certbot certonly --standalone \
    --preferred-challenges http \
    --domains "${DOMAIN}" \
    --domains "admin.${DOMAIN}" \
    --domains "api.${DOMAIN}" \
    --domains "s3.${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive \
    ${CERTBOT_ARGS}

  echo -e "${GREEN}  ✓ Certificates obtained${NC}"

  # Create a combined PEM for Traefik (if needed)
  CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
  if [[ -d "${CERT_DIR}" ]]; then
    echo -e "${GREEN}  ✓ Certificates stored at: ${CERT_DIR}${NC}"
  fi

  # Restart services
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress'; then
    docker compose -f docker-compose.prod.yml up -d
  fi

  # ── Auto-Renewal Cron ──────────────────────────────────────
  echo -e "${BLUE}[3/4]${NC} Setting up auto-renewal cron job..."

  CRON_JOB="0 3 * * * root certbot renew --quiet --post-hook 'docker compose -f ${PWD}/docker-compose.prod.yml restart traefik'"
  CRON_FILE="/etc/cron.d/nodepress-certbot"

  if [[ -d "/etc/cron.d" ]]; then
    echo "${CRON_JOB}" | sudo tee "${CRON_FILE}" > /dev/null
    sudo chmod 644 "${CRON_FILE}"
    echo -e "${GREEN}  ✓ Cron job installed at ${CRON_FILE}${NC}"
    echo -e "  ${YELLOW}  ⚠ Certificates renew automatically at 3:00 AM daily${NC}"
  else
    echo -e "${YELLOW}  ⚠ /etc/cron.d not found — add this to crontab manually:${NC}"
    echo "  ${CRON_JOB}"
  fi
else
  echo -e "${YELLOW}  ⚠ Certbot not installed${NC}"
  echo "  To install Certbot:"
  echo "    apt-get install certbot    # Ubuntu/Debian"
  echo "    yum install certbot        # CentOS/RHEL"
  echo ""
  echo "  Alternatively, Traefik handles SSL automatically."
  echo "  Just set APP_DOMAIN and LETSENCRYPT_EMAIL in your .env file."
fi

# ── Generate Secrets ────────────────────────────────────────
if $GENERATE_SECRETS; then
  echo -e "${BLUE}[4/4]${NC} Generating secure secrets..."

  # Generate secrets
  JWT_SECRET=$(openssl rand -base64 48)
  JWT_REFRESH_SECRET=$(openssl rand -base64 48)
  ENCRYPTION_KEY=$(openssl rand -hex 32)

  # Update env file
  if [[ -f "${ENV_FILE}" ]]; then
    # Replace or append each secret
    for VAR in "JWT_SECRET" "JWT_REFRESH_SECRET" "ENCRYPTION_KEY"; do
      VAL="${!VAR}"
      if grep -q "^${VAR}=" "${ENV_FILE}"; then
        if sed --version 2>/dev/null | grep -q GNU; then
          sed -i "s|^${VAR}=.*|${VAR}=${VAL}|" "${ENV_FILE}"
        else
          sed -i '' "s|^${VAR}=.*|${VAR}=${VAL}|" "${ENV_FILE}"
        fi
      else
        echo "${VAR}=${VAL}" >> "${ENV_FILE}"
      fi
    done
    echo -e "${GREEN}  ✓ Secrets generated and saved to ${ENV_FILE}${NC}"
  else
    echo -e "${YELLOW}  ⚠ ${ENV_FILE} not found${NC}"
    echo "  JWT_SECRET=${JWT_SECRET}"
    echo "  JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
    echo "  ENCRYPTION_KEY=${ENCRYPTION_KEY}"
  fi
fi

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   SSL/HTTPS Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Domain:${NC}      ${DOMAIN}"
echo -e "  ${CYAN}Dashboard:${NC}   https://${DOMAIN}"
echo -e "  ${CYAN}Admin:${NC}       https://admin.${DOMAIN}"
echo -e "  ${CYAN}API:${NC}         https://api.${DOMAIN}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Ensure DNS records point to this server's IP"
echo -e "  2. Run: docker compose -f docker-compose.prod.yml up -d"
echo -e "  3. Verify: curl -I https://${DOMAIN}"
echo ""

# Remind about cert renewal
if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'nodepress-traefik'; then
  echo -e "  ${YELLOW}Certs auto-renew daily at 3:00 AM via cron.${NC}"
  echo ""
fi
