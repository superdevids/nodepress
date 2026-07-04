# NodePress — Production Readiness Checklist

> Use this checklist before deploying NodePress to production. Each item must be verified and checked off to ensure a secure, reliable deployment.

---

## □ 1. Domain & DNS

- [ ] **Domain purchased** and DNS managed (any registrar)
- [ ] **DNS A/AAAA records** point to your server's public IP:
  - `@` / `yourdomain.com` → Admin panel (Next.js)
  - `admin.yourdomain.com` → Admin panel (alternative)
  - `api.yourdomain.com` → API server
  - `s3.yourdomain.com` → MinIO/S3 media storage
- [ ] **DNS CNAME**: `www` → `yourdomain.com` (optional redirect)
- [ ] **DNS TTL** set to 300–600s during initial setup (lower for faster propagation)
- [ ] **DNS propagation verified** using `dig +short yourdomain.com`

## □ 2. SSL / HTTPS

- [ ] **Let's Encrypt SSL** configured via Traefik (automatic)
- [ ] Or **Certbot standalone** certificates obtained
- [ ] **Auto-renewal cron** installed (if using Certbot)
- [ ] **HTTPS redirect** enforced (Traefik handles this)
- [ ] **HSTS headers** verified (included in `docker-compose.prod.yml`)
- [ ] Run: `bash scripts/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com`

## □ 3. PostgreSQL Security

- [ ] **Strong password** set (not `nodepress`) — min 32 chars
- [ ] **Port 5432 not exposed** to the internet (bind to `127.0.0.1`)
- [ ] **SSL enabled** (`POSTGRES_SSL=on` in production)
- [ ] **Max connections** limited to 200
- [ ] **PgBouncer** configured with transaction pooling
- [ ] **Automated backups** configured (see `scripts/backup.sh`)
- [ ] **PostgreSQL version:** 16+

## □ 4. Redis Security

- [ ] **Strong password** set (not `nodepress`) — min 32 chars
- [ ] **Port 6379 not exposed** to the internet (bind to `127.0.0.1`)
- [ ] **Maxmemory** set (default: 256mb)
- [ ] **Eviction policy:** `allkeys-lru`
- [ ] **AOF persistence** enabled (`--appendonly yes`)
- [ ] **Redis version:** 7+

## □ 5. Authentication Secrets

- [ ] **JWT_SECRET** generated with `openssl rand -base64 48`
- [ ] **JWT_REFRESH_SECRET** generated with `openssl rand -base64 48`
- [ ] **ENCRYPTION_KEY** generated with `openssl rand -hex 32`
- [ ] **All security salts/keys** generated (AUTH_KEY, AUTH_SALT, etc.)
- [ ] **Default credentials** removed from `.env`
- [ ] Run: `bash scripts/setup-ssl.sh --generate-secrets`

## □ 6. Rate Limiting

- [ ] **API rate limiting** configured (Traefik: avg 100/s, burst 200)
- [ ] **Login rate limiting** strict (5 attempts per minute)
- [ ] **Redis-backed** rate limiting enabled
- [ ] **Global rate limit:** 60 requests per minute per IP

## □ 7. CORS Configuration

- [ ] **CORS origins** restricted to actual domains
- [ ] No wildcard (`*`) origins in production
- [ ] Credentials enabled only for known origins
- [ ] Verify: `curl -H "Origin: https://evil.com" -I https://api.yourdomain.com`

## □ 8. Security Headers

- [ ] **Strict-Transport-Security** (HSTS) — max-age=31536000
- [ ] **X-Content-Type-Options:** nosniff
- [ ] **X-Frame-Options:** SAMEORIGIN
- [ ] **X-XSS-Protection:** 1; mode=block
- [ ] **Referrer-Policy:** strict-origin-when-cross-origin
- [ ] **Content-Security-Policy** (CSP) enabled
- [ ] Verify: `curl -sI https://yourdomain.com | grep -i '^x-\|^strict-\|^content-security'`

## □ 9. Backups Configuration

- [ ] **Automated daily backup** configured (cron)
- [ ] **Database dump** includes `--clean --if-exists`
- [ ] **Media files** included in backup
- [ ] **Backup retention** configured (7 daily, 4 weekly, 3 monthly)
- [ ] **Off-site storage** configured (S3 bucket)
- [ ] **Restore tested** — run `bash scripts/restore.sh --list`
- [ ] **Backup notifications** configured (Slack/email on failure)
- [ ] Run: `bash scripts/backup.sh` to test

## □ 10. Monitoring

- [ ] **Health checks** configured on all services
- [ ] **Docker auto-restart** (`unless-stopped`) on all services
- [ ] **Resource limits** configured (CPU, memory per container)
- [ ] **Disk usage monitoring** set up (>80% alert)
- [ ] **Memory usage monitoring** set up (>90% alert)
- [ ] **Container restart tracking** (watch for crash loops)
- [ ] **Slack/PagerDuty webhook** configured for alerts
- [ ] Run: `bash scripts/monitor.sh`

## □ 11. Logging

- [ ] **JSON file logging** with rotation (10MB max, 3 files)
- [ ] **Log level:** `info` (not `debug`) in production
- [ ] **Logs stored** in persistent volume
- [ ] **Docker log driver:** `json-file` with rotation
- [ ] **Centralized logging** considered (ELK, Loki, Datadog)

## □ 12. Auto-Healing

- [ ] **Restart policy:** `unless-stopped` on all services
- [ ] **Health checks** cause Docker to restart unhealthy containers
- [ ] **Read-only root filesystem** enforced on API and admin
- [ ] **No-new-privileges** security option enabled
- [ ] **OOM killer** handled by resource limits

## □ 13. Resource Limits

- [ ] **PostgreSQL:** 2 CPU, 1GB RAM (min: 0.5 CPU, 256MB)
- [ ] **Redis:** 1 CPU, 512MB RAM (min: 0.25 CPU, 128MB)
- [ ] **API:** 1 CPU, 512MB RAM (min: 0.25 CPU, 128MB)
- [ ] **Admin:** 1 CPU, 512MB RAM (min: 0.25 CPU, 128MB)
- [ ] **MinIO:** 2 CPU, 1GB RAM (min: 0.5 CPU, 256MB)
- [ ] **PgBouncer:** 0.5 CPU, 256MB RAM (min: 0.1 CPU, 64MB)

## □ 14. Database Connection Pooling

- [ ] **PgBouncer** running alongside PostgreSQL
- [ ] **Transaction pooling** mode enabled
- [ ] **Default pool size:** 25 connections
- [ ] **Reserve pool** of 5 connections for burst
- [ ] **API connects via PgBouncer** at port 6432
- [ ] **Migrations connect directly** to PostgreSQL at port 5432

## □ 15. CDN & Media Delivery

- [ ] **MinIO** configured for local S3-compatible storage
- [ ] **S3 Public URL** configured with CDN domain
- [ ] **CloudFront / Cloudflare** considered for media CDN
- [ ] **Bucket policy** set to allow public reads for media
- [ ] **Media upload size limits** configured

## □ 16. Docker & Infrastructure

- [ ] **Docker 24+** installed
- [ ] **Docker Compose v2** installed
- [ ] **.dockerignore** configured (excludes node_modules, .env, etc.)
- [ ] **Multi-stage builds** used (separate builder and production images)
- [ ] **Images not running as root** (non-root user)
- [ ] **Read-only root filesystem** where possible
- [ ] **Tmpfs** for writable directories

## □ 17. Pre-Deployment Verification

- [ ] Run: `bash scripts/deploy.sh --domain yourdomain.com --email admin@yourdomain.com`
- [ ] Run: `bash scripts/post-deploy.sh --domain yourdomain.com`
- [ ] Run: `bash scripts/monitor.sh`
- [ ] Verify API: `curl https://api.yourdomain.com/healthz`
- [ ] Verify dashboard: `curl -I https://yourdomain.com`
- [ ] Verify SSL: `curl -I https://yourdomain.com`
- [ ] Test login flow end-to-end
- [ ] Test media upload
- [ ] Test password reset

---

## Emergency Contacts

| Role             | Contact |
| ---------------- | ------- |
| DevOps Lead      | —       |
| Security Officer | —       |
| Database Admin   | —       |
| On-Call Engineer | —       |

## Post-Deployment

- [ ] Add server to monitoring dashboard
- [ ] Configure backup cron: `0 2 * * * cd /opt/nodepress && bash scripts/backup.sh --s3-bucket nodepress-backups`
- [ ] Schedule weekly DR drill
- [ ] Document incident response procedures
- [ ] Review logs after 24 hours
- [ ] Run `bash scripts/monitor.sh` after 1 week to baseline
