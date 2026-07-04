# NodePress — System Requirements

> Hardware and software requirements for running NodePress in production.

---

## Minimum Requirements (Low Traffic — <1K daily visitors)

| Resource    | Requirement         |
| ----------- | ------------------- |
| **vCPU**    | 2 cores             |
| **RAM**     | 4 GB                |
| **Storage** | 20 GB SSD           |
| **Network** | 100 Mbps            |
| **Docker**  | 24+ with Compose v2 |

**Suitable for:** Personal blogs, small business websites, development/staging instances.

---

## Recommended Requirements (Medium Traffic — 1K–50K daily visitors)

| Resource    | Requirement         |
| ----------- | ------------------- |
| **vCPU**    | 4 cores             |
| **RAM**     | 8 GB                |
| **Storage** | 50 GB SSD           |
| **Network** | 1 Gbps              |
| **Docker**  | 24+ with Compose v2 |

**Suitable for:** Business websites, content-heavy sites, e-commerce blogs.

---

## High Traffic Requirements (50K–500K+ daily visitors)

| Resource    | Requirement                    |
| ----------- | ------------------------------ |
| **vCPU**    | 8+ cores                       |
| **RAM**     | 16+ GB                         |
| **Storage** | 100+ GB SSD (NVMe recommended) |
| **Network** | 1+ Gbps                        |
| **Docker**  | 24+ with Compose v2            |

**Suitable for:** High-traffic publications, media sites, SaaS platforms.

> **Note:** For high traffic, consider horizontal scaling with multiple API instances behind a load balancer and a dedicated managed database (AWS RDS, Cloud SQL).

---

## Supported Platforms

| Provider             | Recommended Plan                 | Notes                             |
| -------------------- | -------------------------------- | --------------------------------- |
| **DigitalOcean**     | Premium Droplet (4 vCPU, 8GB)    | Simple setup, good docs           |
| **Linode / Akamai**  | Dedicated CPU (4 vCPU, 8GB)      | Better CPU performance            |
| **Vultr**            | Cloud Compute (4 vCPU, 8GB)      | Wide region coverage              |
| **AWS EC2**          | t3.medium (2 vCPU, 4GB)          | For minimum; t3.large recommended |
| **Hetzner**          | CX52 (8 vCPU, 16GB)              | Best value for high traffic       |
| **OVHcloud**         | Value VPS (4 vCPU, 8GB)          | Good European coverage            |
| **Any VPS**          | Any provider with Docker support | Minimum 2 vCPU, 4GB RAM           |
| **Dedicated Server** | Any                              | For maximum performance           |

---

## Software Requirements

### Required

| Software           | Version     | Notes                                                 |
| ------------------ | ----------- | ----------------------------------------------------- |
| **Docker**         | 24+         | Container runtime                                     |
| **Docker Compose** | v2 (plugin) | Orchestration (`docker compose` not `docker-compose`) |
| **Linux Kernel**   | 5.x+        | For modern Docker features                            |
| **Systemd**        | Any         | For auto-start on boot                                |

### Recommended (Optional)

| Software                 | Purpose                                                       |
| ------------------------ | ------------------------------------------------------------- |
| **Nginx**                | Alternative reverse proxy (if not using Traefik)              |
| **Fail2ban**             | Brute-force protection                                        |
| **UFW / iptables**       | Firewall configuration                                        |
| **Prometheus + Grafana** | Advanced monitoring                                           |
| **Loki / ELK Stack**     | Centralized logging                                           |
| **Caddy**                | Alternative auto-SSL (simpler than Traefik for single domain) |

---

## Operating System Support

| OS                   | Status         | Notes                          |
| -------------------- | -------------- | ------------------------------ |
| **Ubuntu 22.04 LTS** | ✅ Recommended | Best Docker support            |
| **Ubuntu 24.04 LTS** | ✅ Recommended | Latest LTS                     |
| **Debian 12**        | ✅ Supported   | Stable, minimal                |
| **Debian 11**        | ✅ Supported   |                                |
| **CentOS Stream 9**  | ✅ Supported   |                                |
| **Rocky Linux 9**    | ✅ Supported   | RHEL-compatible                |
| **AlmaLinux 9**      | ✅ Supported   | RHEL-compatible                |
| **Fedora 40+**       | ⚠️ Tested      | Not recommended for production |
| **macOS**            | ⚠️ Dev only    | Docker Desktop                 |
| **Windows Server**   | ⚠️ Tested      | WSL2 backend required          |

---

## Disk Space Breakdown

| Component            | Estimated Size   | Notes                              |
| -------------------- | ---------------- | ---------------------------------- |
| **NodePress Images** | ~2 GB            | API + Admin Docker images          |
| **PostgreSQL Data**  | ~1 GB + growth   | Depends on content volume          |
| **MinIO (Media)**    | ~500 MB + growth | Depends on uploads                 |
| **Redis Data**       | ~256 MB          | Configurable via `REDIS_MAXMEMORY` |
| **Backups**          | ~1 GB per backup | Depends on database + media size   |
| **Logs**             | ~500 MB          | Rotated every 10MB × 3 files       |

**Minimum total:** ~20 GB SSD
**Recommended total:** ~50 GB SSD

---

## Network Ports

| Port     | Service       | Public      | Notes                                     |
| -------- | ------------- | ----------- | ----------------------------------------- |
| **80**   | HTTP          | ✅ Required | Let's Encrypt HTTP challenge              |
| **443**  | HTTPS         | ✅ Required | Production traffic                        |
| **22**   | SSH           | ✅ Required | Server administration (use key-only auth) |
| **5432** | PostgreSQL    | ❌ Closed   | Internal only                             |
| **6432** | PgBouncer     | ❌ Closed   | Internal only                             |
| **6379** | Redis         | ❌ Closed   | Internal only                             |
| **9000** | MinIO API     | ❌ Closed   | Internal (served via Traefik on 443)      |
| **9001** | MinIO Console | ❌ Closed   | Internal admin UI                         |
| **3001** | API Server    | ❌ Closed   | Internal (served via Traefik on 443)      |
| **3000** | Admin Panel   | ❌ Closed   | Internal (served via Traefik on 443)      |

---

## Performance Expectations

| Metric                      | Min Spec | Recommended | High Traffic |
| --------------------------- | -------- | ----------- | ------------ |
| **API Response Time (p95)** | <500ms   | <200ms      | <100ms       |
| **Page Load Time**          | <3s      | <1.5s       | <800ms       |
| **Concurrent Users**        | ~100     | ~500        | ~5000+       |
| **Requests Per Second**     | ~50      | ~250        | ~2500+       |
| **Database Queries/sec**    | ~200     | ~1000       | ~10000+      |

---

## Scaling Strategy

### Vertical Scaling (Scale Up)

Increase server resources (CPU, RAM) for the existing instance. The easiest approach — no architecture changes needed. Practical up to 16 vCPU / 32 GB RAM.

### Horizontal Scaling (Scale Out)

1. **Separate services** onto different servers (database, API, cache)
2. **Multiple API instances** behind Traefik load balancer
3. **Read replicas** for PostgreSQL
4. **Redis Cluster** for distributed caching
5. **CDN** (CloudFront, Cloudflare) for media delivery

### Managed Services Migration

For production at scale, consider migrating from Docker containers to managed services:

| Docker Service | Managed Alternative                 |
| -------------- | ----------------------------------- |
| PostgreSQL     | AWS RDS Aurora, Cloud SQL           |
| Redis          | AWS ElastiCache, Redis Cloud        |
| MinIO          | AWS S3, Cloudflare R2, Backblaze B2 |
| Traefik        | AWS ALB, Cloudflare, Nginx          |

---

## Quick Start

```bash
# 1. Provision a server (Ubuntu 24.04 LTS recommended)
# 2. Install Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone NodePress
git clone https://github.com/superdevids/nodepress.git /opt/nodepress
cd /opt/nodepress

# 4. Configure environment
cp .env.production .env
nano .env  # Set all REQUIRED values

# 5. Deploy
bash scripts/setup-ssl.sh --domain yourdomain.com --email admin@yourdomain.com
bash scripts/deploy.sh --domain yourdomain.com --email admin@yourdomain.com

# 6. Verify
bash scripts/post-deploy.sh --domain yourdomain.com
```
