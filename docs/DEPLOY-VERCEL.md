# 🚀 NodePress Vercel Deployment Guide

> **Comprehensive guide for deploying NodePress on Vercel + external services.**
>
> Last tested: July 2026 | NodePress v1.0.0-beta.2 | Node.js 20+

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What CAN Be Deployed to Vercel](#2-what-can-be-deployed-to-vercel)
3. [What CANNOT Be Deployed to Vercel](#3-what-cannot-be-deployed-to-vercel)
4. [Reference Architecture](#4-reference-architecture)
5. [Vercel Deployment (Admin + Web-Starter)](#5-vercel-deployment-admin--web-starter)
   - [5.1 Prerequisites](#51-prerequisites)
   - [5.2 Environment Variables](#52-environment-variables)
   - [5.3 vercel.json Configuration](#53-verceljson-configuration)
   - [5.4 Step-by-Step Deployment](#54-step-by-step-deployment)
   - [5.5 Custom Domain Setup](#55-custom-domain-setup)
   - [5.6 Image Optimization & Remote Patterns](#56-image-optimization--remote-patterns)
6. [NestJS API Deployment (Non-Vercel)](#6-nestjs-api-deployment-non-vercel)
   - [6.1 Option A: Railway.app (Recommended)](#61-option-a-railwayapp-recommended)
   - [6.2 Option B: Render.com](#62-option-b-rendercom)
   - [6.3 Option C: Fly.io](#63-option-c-flyio)
   - [6.4 Option D: DigitalOcean App Platform](#64-option-d-digitalocean-app-platform)
   - [6.5 Option E: AWS Elastic Beanstalk](#65-option-e-aws-elastic-beanstalk)
   - [6.6 API Dockerfile for Non-Vercel Deployments](#66-api-dockerfile-for-non-vercel-deployments)
7. [External Services](#7-external-services)
   - [7.1 PostgreSQL: Neon.tech (Recommended)](#71-postgresql-neontech-recommended)
   - [7.2 PostgreSQL: Supabase](#72-postgresql-supabase)
   - [7.3 PostgreSQL: Railway Managed DB](#73-postgresql-railway-managed-db)
   - [7.4 Redis: Upstash (Recommended)](#74-redis-upstash-recommended)
   - [7.5 Redis: Redis Cloud](#75-redis-redis-cloud)
   - [7.6 S3 Storage: Options Comparison](#76-s3-storage-options-comparison)
   - [7.7 Background Workers](#77-background-workers)
8. [Monorepo Build Configuration](#8-monorepo-build-configuration)
9. [Environment Variables Master List](#9-environment-variables-master-list)
10. [Cost Comparison](#10-cost-comparison)
11. [CI/CD Pipeline Setup](#11-cicd-pipeline-setup)
12. [Production Readiness Checklist](#12-production-readiness-checklist)
13. [Troubleshooting](#13-troubleshooting)
14. [Appendix: Migration from Docker Compose](#14-appendix-migration-from-docker-compose)

---

## 1. Architecture Overview

NodePress is a monorepo (pnpm workspaces + Turborepo) with **3 runtime components** that must be deployed separately in a Vercel-based architecture:

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Edge)                     │
│                                                      │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │   apps/admin         │  │  apps/web-starter    │   │
│  │   Next.js 14 SSR     │  │  Next.js 14 SSR      │   │
│  │   @nodepressjs/admin │  │  @nodepressjs/web    │   │
│  └────────┬────────────┘  └────────┬────────────┘   │
│           │                        │                 │
│           │    Next.js API Routes  │                 │
│           │    (proxied to NestJS) │                 │
└───────────┼────────────────────────┼─────────────────┘
            │                        │
            │    HTTPS / API Calls   │
            ▼                        ▼
┌─────────────────────────────────────────────────────┐
│          Railway / Render / Fly.io                  │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  apps/api  (NestJS + Express)               │    │
│  │  - REST API (graphql, REST)                 │    │
│  │  - JWT Auth Middleware                      │    │
│  │  - Rate Limiting, Helmet, CORS              │    │
│  │  - BullMQ Queue Producer                    │    │
│  └──────┬──────────────┬──────────────────────┘    │
│         │              │                            │
│         ▼              ▼                            │
│  ┌──────────┐  ┌──────────────┐                    │
│  │ Worker   │  │ No cron yet │                    │
│  │ BullMQ   │  │ (BullMQ)    │                    │
│  │ Consumer │  │             │                    │
│  └──────────┘  └──────────────┘                    │
└──────────┼──────────────┼──────────────────────────┘
           │              │
           ▼              ▼
┌─────────────────────────────────────────────────────┐
│              Managed Cloud Services                  │
│                                                      │
│  ┌────────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Neon.tech  │  │ Upstash  │  │ AWS S3 / R2   │   │
│  │ PostgreSQL │  │ Redis    │  │ Object Store  │   │
│  │ 16 + pg_   │  │ 7.x      │  │ (S3 API)      │   │
│  │ trgm ext   │  │ + TLS    │  │               │   │
│  └────────────┘  └──────────┘  └───────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
Browser ──HTTPS──► Vercel Edge ──► Next.js (SSR/SSG)
                        │
                        │ API Calls (fetch)
                        ▼
              NestJS API (Railway/Render)
                        │
               ┌────────┼────────┐
               ▼        ▼        ▼
           PostgreSQL  Redis     S3
           (Neon)    (Upstash)  (R2/S3)
```

### Key Principles

- **Vercel** handles all user-facing Next.js applications (admin panel + public site)
- **NestJS API** runs as a traditional Node.js server on a PaaS (Railway, Render, Fly.io)
- **PostgreSQL** uses a managed cloud database service
- **Redis** uses a managed Redis service (serverless Redis like Upstash)
- **S3 Storage** uses cloud object storage (AWS S3, Cloudflare R2, or Vercel Blob)
- **Background Workers** run alongside the API on the same PaaS or as separate services

---

## 2. What CAN Be Deployed to Vercel

### ✅ `apps/admin` — Next.js Admin Panel

| Aspect             | Status                             |
| ------------------ | ---------------------------------- |
| Framework          | ✅ Next.js 14 (App Router)         |
| SSR/SSG            | ✅ Full support                    |
| API Routes         | ✅ Can proxy to NestJS backend     |
| Middleware         | ✅ Supported                       |
| Image Optimization | ✅ `next/image` supported          |
| ISR                | ✅ Incremental Static Regeneration |
| Monorepo           | ✅ Via `rootDirectory` config      |

**Key Config**: `next.config.ts` already sets `transpilePackages` for workspace dependencies.

### ✅ `apps/web-starter` — Next.js Public Site

| Aspect             | Status                         |
| ------------------ | ------------------------------ |
| Framework          | ✅ Next.js 14 (Pages Router)   |
| SSR/SSG            | ✅ Full support                |
| API Routes         | ✅ Can proxy to NestJS backend |
| Image Optimization | ✅ Supported                   |
| Monorepo           | ✅ Via `rootDirectory` config  |

---

## 3. What CANNOT Be Deployed to Vercel

| Component              | Reason                                                                                                                                                                                                                                                                            | Alternative                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| ❌ `apps/api` (NestJS) | Express-based NestJS requires a persistent Node.js server. Vercel Serverless Functions have a 10s timeout for Hobby, 30s for Pro (insufficient for GraphQL, file uploads). Express-specific features (`compression`, `helmet`, `express-rate-limit`) don't map to Edge Functions. | Railway / Render / Fly.io                         |
| ❌ BullMQ Workers      | Requires long-running process + persistent Redis connection                                                                                                                                                                                                                       | Railway Worker service / Docker on Fly.io         |
| ❌ PostgreSQL          | Vercel doesn't offer managed PostgreSQL                                                                                                                                                                                                                                           | Neon.tech / Supabase / Railway DB                 |
| ❌ Redis               | Vercel doesn't offer managed Redis                                                                                                                                                                                                                                                | Upstash / Redis Cloud / Railway DB                |
| ❌ MinIO / S3          | Vercel Blob only for simple file storage; full S3 API needed                                                                                                                                                                                                                      | AWS S3 / Cloudflare R2 / Vercel Blob (partial)    |
| ❌ Prisma Migrations   | Running migrations requires direct database access                                                                                                                                                                                                                                | Run as part of CI/CD or API startup script        |
| ❌ WebSocket / SSE     | Vercel Serverless doesn't support persistent connections                                                                                                                                                                                                                          | Not used by NodePress currently, but worth noting |

---

## 4. Reference Architecture

### Recommended Stack (Production)

```
┌────────────────────────────────────────────────────────────┐
│                        Vercel                               │
│  Domain: admin.yourdomain.com                               │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ @nodepressjs/   │  │ @nodepressjs/    │                 │
│  │ admin (Next.js) │  │ web-starter      │                 │
│  │                 │  │ (Next.js)        │                 │
│  └────────┬────────┘  └────────┬─────────┘                 │
└───────────┼─────────────────────┼───────────────────────────┘
            │                     │
            │   NEXT_PUBLIC_API_URL = https://api.yourdomain.com
            ▼                     ▼
┌────────────────────────────────────────────────────────────┐
│              Railway.app (Project: nodepress-api)           │
│                                                             │
│  Service 1: API (NestJS)           Service 2: Worker       │
│  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │ Port 3001               │  │ SERVICE_TYPE=worker    │  │
│  │ node dist/apps/api/main │  │ node dist/apps/api/... │  │
│  │ Health check: /api/v1/  │  │ (BullMQ consumer)     │  │
│  │  health                 │  │                        │  │
│  └────────┬────────────────┘  └───────────┬────────────┘  │
│           │                                │               │
│           ▼                                ▼               │
│  ┌────────────────┐              ┌──────────────────┐     │
│  │ Railway PG     │              │ Upstash Redis    │     │
│  │ PostgreSQL 16  │              │ (External)       │     │
│  │ (Managed DB)   │              │                  │     │
│  └────────────────┘              └──────────────────┘     │
│                                                             │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌──────────────────────┐
              │ AWS S3 / Cloudflare  │
              │ R2 (Media Storage)   │
              └──────────────────────┘
```

---

## 5. Vercel Deployment (Admin + Web-Starter)

### 5.1 Prerequisites

1. **Vercel Account** — [vercel.com/signup](https://vercel.com/signup)
2. **Vercel CLI** (optional, for local testing):
   ```bash
   npm i -g vercel
   ```
3. **Domain** (optional) — for custom domain setup
4. **GitHub Repository** — connected to Vercel
5. **External Services** (create before deployment):
   - [Neon.tech](https://neon.tech) — PostgreSQL database
   - [Upstash](https://upstash.com) — Redis instance
   - [AWS S3](https://aws.amazon.com/s3/) or [Cloudflare R2](https://cloudflare.com) — Storage bucket

### 5.2 Environment Variables

These must be set in **both** Vercel projects (admin + web-starter):

```bash
# Environment (Vercel auto-sets NODE_ENV=production)
NODE_ENV=production

# Next.js public API URL (pointing to your NestJS backend)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# API URL for server-side calls (may differ from public URL)
API_URL=https://api.yourdomain.com

# Application URL (this app's own URL)
APP_URL=https://admin.yourdomain.com
# or for web-starter: APP_URL=https://yourdomain.com

# Image remote patterns (already in next.config, but verify)
# No env vars needed for images — config is in next.config.ts
```

> **Important**: The `NEXT_PUBLIC_API_URL` is used in browser-side code via `fetch()` calls. It **must** be publicly accessible from the browser.

### 5.3 vercel.json Configuration

#### Admin App (`apps/admin/vercel.json`)

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && npx turbo run build --filter=@nodepressjs/admin...",
  "installCommand": "cd ../.. && pnpm install --no-frozen-lockfile",
  "outputDirectory": ".next",
  "ignoreCommand": "npx turbo-ignore @nodepressjs/admin"
}
```

#### Web-Starter App (`apps/web-starter/vercel.json`)

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && npx turbo run build --filter=@nodepressjs/web-starter...",
  "installCommand": "cd ../.. && pnpm install --no-frozen-lockfile",
  "outputDirectory": ".next",
  "ignoreCommand": "npx turbo-ignore @nodepressjs/web-starter"
}
```

#### ⚠️ Critical: Prisma Client Generation

The Prisma client must be generated during the build. The `turbo.json` pipeline already handles this via the build dependency chain, but you may also add a postinstall script by adding to root `package.json`:

```json
{
  "scripts": {
    "vercel-build": "cd packages/db && npx prisma generate && cd ../.. && npx turbo run build --filter=@nodepressjs/admin..."
  }
}
```

Alternatively, the `packages/db/package.json` build script already runs `prisma generate`, so Turborepo will handle it as long as the dependency chain is correct.

### 5.4 Step-by-Step Deployment

#### Via Vercel Dashboard (Recommended)

**For Admin App:**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Configure project:
   - **Project Name**: `nodepress-admin`
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/admin`
   - **Build Command**: `cd ../.. && npx turbo run build --filter=@nodepressjs/admin...`
   - **Install Command**: `cd ../.. && pnpm install --no-frozen-lockfile`
   - **Output Directory**: `.next`
4. Add environment variables (see section 5.2)
5. Click **Deploy**

**For Web-Starter App:**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the same repository
3. Configure project:
   - **Project Name**: `nodepress-web`
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web-starter`
   - **Build Command**: `cd ../.. && npx turbo run build --filter=@nodepressjs/web-starter...`
   - **Install Command**: `cd ../.. && pnpm install --no-frozen-lockfile`
   - **Output Directory**: `.next`
4. Add environment variables (see section 5.2)
5. Click **Deploy**

#### Via Vercel CLI

```bash
# Login to Vercel
vercel login

# Deploy Admin App
cd apps/admin
vercel --prod \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -e API_URL=https://api.yourdomain.com \
  -e APP_URL=https://admin.yourdomain.com

# Deploy Web-Starter App
cd apps/web-starter
vercel --prod \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  -e API_URL=https://api.yourdomain.com \
  -e APP_URL=https://yourdomain.com
```

### 5.5 Custom Domain Setup

1. In Vercel dashboard, go to your project → **Domains**
2. Add your domain (e.g., `admin.yourdomain.com` or `yourdomain.com`)
3. Follow Vercel's DNS configuration instructions
4. For the main site, consider:
   - `yourdomain.com` → web-starter
   - `admin.yourdomain.com` → admin panel
   - `api.yourdomain.com` → NestJS API (via Railway/Render)

### 5.6 Image Optimization & Remote Patterns

The `next.config.ts` files already define remote patterns for images. For Vercel deployment:

**Admin (`apps/admin/next.config.ts`)**:

```typescript
images: {
  remotePatterns: [
    // For S3-compatible storage (AWS S3, Cloudflare R2, etc.)
    {
      protocol: "https",
      hostname: "*.s3.amazonaws.com",
    },
    {
      protocol: "https",
      hostname: "*.r2.cloudflarestorage.com",
    },
    // Your custom S3/CNAME domain
    {
      protocol: "https",
      hostname: "media.yourdomain.com",
    },
  ],
},
```

> ⚠️ **IMPORTANT**: Remove the `localhost:9000` development pattern from the production config!

---

## 6. NestJS API Deployment (Non-Vercel)

### 6.1 Option A: Railway.app (Recommended)

**Why Railway**: Best balance of simplicity, features, and price. Native PostgreSQL and Redis support, easy worker deployment, automatic HTTPS, and GitHub integration.

#### Setup Steps

1. **Create Railway Account** at [railway.app](https://railway.app)
2. **Create New Project** → **Deploy from GitHub repo**
3. **Configure as a Web Service**:

```bash
# Railway Service Settings
Root Directory: apps/api
Build Command: cd ../.. && pnpm install && npx turbo run build --filter=@nodepressjs/api...
Start Command: node apps/api/dist/main
Health Check Path: /api/v1/health
Port: 3001
```

4. **Add Environment Variables** (see section 9)
5. **Add PostgreSQL** — Railway → New → Database → PostgreSQL
   - Railway automatically provides `DATABASE_URL` and `DATABASE_DIRECT_URL`
   - Ensure `pg_trgm` and `uuid-ossp` extensions are enabled:
     ```sql
     CREATE EXTENSION IF NOT EXISTS pg_trgm;
     CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
     ```
6. **Add Worker Service** (for BullMQ):
   - Same repo, same image
   - Command: `node apps/api/dist/workers/index.js` (or similar worker entry point)
   - Environment variable: `SERVICE_TYPE=worker`

#### Railway Configuration Files

**`apps/api/railway.json`** (optional but recommended):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && pnpm install --no-frozen-lockfile && npx turbo run build --filter=@nodepressjs/api..."
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/api/v1/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

**`apps/api/nixpacks.toml`** (if Nixpacks builder is used):

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "pnpm"]

[phases.install]
cmds = ["cd ../.. && pnpm install --no-frozen-lockfile"]

[phases.build]
cmds = ["cd ../.. && npx turbo run build --filter=@nodepressjs/api..."]

[start]
cmd = "node apps/api/dist/main"
```

### 6.2 Option B: Render.com

**Setup**:

1. Create account at [render.com](https://render.com)
2. **New Web Service** → Connect GitHub repo
3. Configure:

```yaml
# Render Blueprint (render.yaml)
services:
  - type: web
    name: nodepress-api
    env: node
    region: oregon
    plan: starter
    buildCommand: cd ../.. && pnpm install --no-frozen-lockfile && npx turbo run build --filter=@nodepressjs/api...
    startCommand: node apps/api/dist/main
    healthCheckPath: /api/v1/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: DATABASE_URL
        fromDatabase:
          name: nodepress-db
          property: connectionString
      - key: DATABASE_DIRECT_URL
        fromDatabase:
          name: nodepress-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: nodepress-redis
          property: connectionString

  - type: worker
    name: nodepress-worker
    env: node
    plan: starter
    buildCommand: cd ../.. && pnpm install --no-frozen-lockfile && npx turbo run build --filter=@nodepressjs/api...
    startCommand: node apps/api/dist/workers/index.js
    envVars:
      - key: SERVICE_TYPE
        value: worker
      - key: REDIS_URL
        fromService:
          type: redis
          name: nodepress-redis
          property: connectionString

databases:
  - name: nodepress-db
    plan: starter
    postgresMajorVersion: 16

redis:
  - name: nodepress-redis
    plan: starter
```

### 6.3 Option C: Fly.io

**Setup**:

1. Install `flyctl` and login: `fly auth login`
2. Create `apps/api/fly.toml`:

```toml
app = "nodepress-api"
primary_region = "iad"

[build]
  image = "node:20-alpine"

[env]
  NODE_ENV = "production"
  PORT = "3001"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[services]]
  protocol = "tcp"
  internal_port = 3001
  [[services.ports]]
    port = 443
    handlers = ["tls"]
  [[services.ports]]
    port = 80
    handlers = ["http"]
  [[services.http_checks]]
    interval = "30s"
    timeout = "5s"
    path = "/api/v1/health"
    method = "GET"
```

3. **Dockerfile for Fly.io** (use the existing `Dockerfile` at project root with `--target=api`):

```bash
fly launch --dockerfile Dockerfile --build-target api
```

4. Set secrets:

```bash
fly secrets set \
  JWT_SECRET=... \
  JWT_REFRESH_SECRET=... \
  ENCRYPTION_KEY=... \
  DATABASE_URL=postgresql://... \
  DATABASE_DIRECT_URL=postgresql://... \
  REDIS_URL=redis://... \
  S3_ENDPOINT=https://... \
  S3_ACCESS_KEY=... \
  S3_SECRET_KEY=... \
  S3_BUCKET=nodepress-media \
  S3_PUBLIC_URL=https://... \
  NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  API_URL=https://api.yourdomain.com \
  APP_URL=https://admin.yourdomain.com \
  CORS_ORIGINS=https://admin.yourdomain.com,https://yourdomain.com
```

### 6.4 Option D: DigitalOcean App Platform

**Setup**:

1. Create account at [digitalocean.com](https://digitalocean.com)
2. **Create App** → Import from GitHub
3. Configure:

```yaml
# .do/app.yaml
alerts:
  - rule: DEPLOYMENT_FAILED
  - rule: DOMAIN_FAILED

databases:
  - engine: PG
    name: nodepress-db
    num_nodes: 1
    size: db-s-dev-database
    version: '16'

services:
  - environment_slug: node-js
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: ${nodepress-db.DATABASE_URL}
      - key: DATABASE_DIRECT_URL
        value: ${nodepress-db.DATABASE_URL}
    git:
      branch: main
      repo_clone_url: https://github.com/yourorg/nodepress.git
    health_check:
      http_path: /api/v1/health
    http_port: 3001
    instance_count: 1
    instance_size_slug: apps-s-1vcpu-1gb
    name: nodepress-api
    run_command: node apps/api/dist/main
    source_dir: apps/api
    build_command: cd ../.. && pnpm install --no-frozen-lockfile && npx turbo run build --filter=@nodepressjs/api...
```

### 6.5 Option E: AWS Elastic Beanstalk

Best for teams already on AWS with higher budgets.

**Setup**:

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init -p node.js nodepress-api`
3. Create `apps/api/.ebextensions/options.config`:

```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: 'node apps/api/dist/main'
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: '3001'
```

4. The existing `Dockerfile` at root can be used with `--target=api` for container-based deployment.

### 6.6 API Dockerfile for Non-Vercel Deployments

The existing `Dockerfile` at the project root already has a multi-stage build. For PaaS deployment, you can either:

**Option 1: Use Dockerfile with build target**

```bash
docker build --target=api -t nodepress-api .
```

**Option 2: Use the PaaS build system** (recommended for Railway/Render)

- Most PaaS platforms will detect Node.js and use their own build system
- Configure `buildCommand` and `startCommand` as shown above

For platforms that need a Dockerfile specifically for the API:

**`apps/api/Dockerfile.api`**:

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.1.4
WORKDIR /app

# Copy workspace manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/ packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages
RUN pnpm exec turbo run build --filter=@nodepressjs/db --filter=@nodepressjs/core --filter=@nodepressjs/config --filter=@nodepressjs/plugin-sdk

# Build API
COPY apps/api/ apps/api/
RUN pnpm exec turbo run build --filter=@nodepressjs/api

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
```

---

## 7. External Services

### 7.1 PostgreSQL: Neon.tech (Recommended)

**Why Neon**: Generous free tier (500MB, 100hr compute/month), serverless with auto-pause, `pg_trgm` extensions supported, branching for preview deployments.

| Plan       | Storage | Compute      | Price  |
| ---------- | ------- | ------------ | ------ |
| Free       | 500MB   | 100 hr/month | $0     |
| Launch     | 10GB    | 300 hr/month | $19/mo |
| Scale      | 50GB    | 750 hr/month | $69/mo |
| Enterprise | Custom  | Custom       | Custom |

**Setup**:

```bash
# 1. Create project at https://neon.tech
# 2. Get connection string
# 3. Enable required extensions:
psql "postgresql://..." -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql "postgresql://..." -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

# 4. Set environment variables:
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/nodepress?sslmode=require&pgbouncer=true"
DATABASE_DIRECT_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/nodepress?sslmode=require"
```

> **Note**: The `?pgbouncer=true` parameter tells Neon to use its built-in connection pooler (replaces the PgBouncer service from docker-compose).

### 7.2 PostgreSQL: Supabase

**Why Supabase**: 500MB free, built-in auth, auto-API, dashboard, great for prototyping.

| Plan | Storage | Price  |
| ---- | ------- | ------ |
| Free | 500MB   | $0     |
| Pro  | 8GB     | $25/mo |
| Team | 16GB    | $75/mo |

> **Note**: Supabase uses a different PostgreSQL config. The `pg_trgm` extension is available.

### 7.3 PostgreSQL: Railway Managed DB

**Why Railway**: Tightly integrated with Railway API hosting. One-click provisioning, automatic backups, private networking.

| Plan      | Storage | Price  |
| --------- | ------- | ------ |
| Starter   | 1GB     | $5/mo  |
| Developer | 5GB     | $20/mo |
| Pro       | 20GB    | $50/mo |

> **Setup**: From Railway dashboard, click "New" → "Database" → "Add PostgreSQL". Railway provides `DATABASE_URL` and `DATABASE_PRIVATE_URL`.

### 7.4 Redis: Upstash (Recommended)

**Why Upstash**: Serverless Redis with REST API, generous free tier (100MB, 10,000 cmds/day), auto-scaling, TLS-enabled.

| Plan          | Storage | Commands  | Price                 |
| ------------- | ------- | --------- | --------------------- |
| Free          | 100MB   | 10K/day   | $0                    |
| Pay-as-you-go | 1GB     | 100K/day  | $0.15/GB + $0.50/100K |
| Pro           | 5GB     | Unlimited | $39/mo                |

**Setup**:

```bash
# 1. Create database at https://console.upstash.com
# 2. Get UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
# 3. Set environment variable:
REDIS_URL="rediss://default:token@us1-apt-redis-12345.upstash.io:6379"
```

> **Note**: The `rediss://` protocol enables TLS encryption (required by Upstash).

### 7.5 Redis: Redis Cloud

| Plan     | Storage | Price   |
| -------- | ------- | ------- |
| Free     | 30MB    | $0      |
| Fixed    | 1GB     | $15/mo  |
| Flexible | 2.5GB+  | $33/mo+ |

### 7.6 S3 Storage: Options Comparison

| Feature           | AWS S3             | Cloudflare R2       | Vercel Blob         |
| ----------------- | ------------------ | ------------------- | ------------------- |
| S3 API Compatible | ✅ Native          | ✅ Compatible       | ❌ (different API)  |
| Egress Free       | ❌ ($0.09/GB)      | ✅ (no egress fees) | ✅ (within Vercel)  |
| Free Tier         | 5GB (12 months)    | 10GB (permanent)    | 5GB                 |
| Pricing           | ~$0.023/GB         | ~$0.015/GB          | $0.04/GB after free |
| Public URL        | Optional           | Optional            | Built-in            |
| CDN               | CloudFront (extra) | Built-in            | Built-in            |

**Recommendation**: If using Vercel exclusively, **Cloudflare R2** is the most cost-effective option with full S3 API compatibility. If you want simplicity, **Vercel Blob** works but requires code changes to replace the S3 SDK calls.

**Setup for AWS S3**:

```bash
# Create bucket
aws s3api create-bucket --bucket nodepress-media --region us-east-1

# Set environment variables:
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_ACCESS_KEY=AKIA...
S3_SECRET_KEY=...
S3_BUCKET=nodepress-media
S3_PUBLIC_URL=https://nodepress-media.s3.us-east-1.amazonaws.com
```

**Setup for Cloudflare R2**:

```bash
# Create bucket via R2 dashboard
# Generate API token with read/write permissions

# Set environment variables:
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY=<r2-access-key>
S3_SECRET_KEY=<r2-secret-key>
S3_BUCKET=nodepress-media
S3_PUBLIC_URL=https://media.yourdomain.com  # or R2.dev domain
```

### 7.7 Background Workers

NodePress uses BullMQ for background jobs. These need a persistent process.

**Approach 1: Separate Worker Service on Railway/Render**

Deploy the same API codebase with a different start command:

```bash
# Worker entry point (create if not exists)
# apps/api/src/worker.ts or use the existing worker module
node apps/api/dist/main --worker
# Or set environment: SERVICE_TYPE=worker
```

**Approach 2: Inline Worker on Fly.io**

Use a `process` definition in `fly.toml`:

```toml
[processes]
  app = "node apps/api/dist/main"
  worker = "node apps/api/dist/worker-entry.js"
```

**Approach 3: Cron-based (for simpler jobs)**

If your background jobs are periodic, use cron instead of BullMQ:

- Vercel Cron Jobs (paid plan, for lightweight tasks)
- Railway Cron (coming soon)
- External cron service (e.g., cron-job.org)

**Important**: Worker processes require the same `REDIS_URL` environment variable as the API, since BullMQ uses Redis as its queue backend.

---

## 8. Monorepo Build Configuration

### How Turborepo Builds Work on Vercel

```
Root
├── pnpm-workspace.yaml  ← Vercel detects monorepo
├── turbo.json            ← Defines build pipeline
├── apps/
│   ├── admin/            ← vercel.json (rootDirectory configured)
│   └── web-starter/      ← vercel.json (rootDirectory configured)
└── packages/             ← Built as dependencies
```

The build flow:

1. Vercel runs `pnpm install --no-frozen-lockfile` from the root
2. Vercel runs `npx turbo run build --filter=@nodepressjs/admin...`
3. Turbo resolves dependencies: `@nodepressjs/db` → `@nodepressjs/core` → `@nodepressjs/admin`
4. Each package is built in order
5. Prisma client is generated during `@nodepressjs/db` build
6. Final Next.js build outputs to `apps/admin/.next`

### Critical Build Settings

**pnpm Configuration** (`.npmrc`):

```
# Already exists — verify these settings
auto-install-peers=true
strict-peer-dependencies=false
```

**Turborepo Cache**: Vercel caches `node_modules` between builds. If you encounter build issues, try:

```bash
# Force clean cache in Vercel dashboard:
# Project Settings → Build Cache → Clear Cache
```

### Prisma in Production

For Prisma migrations in a Vercel + external service architecture:

**Option 1: Run migrations during API deploy** (recommended)

- Add a pre-start script to the API service:

```bash
# In API start command:
npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma && node apps/api/dist/main
```

**Option 2: Run migrations via CI/CD** (safer)

```yaml
# .github/workflows/deploy.yml
- name: Run database migrations
  run: |
    cd packages/db
    npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_DIRECT_URL }}
```

> ⚠️ **Never** run `prisma migrate dev` in production — always use `prisma migrate deploy`.

---

## 9. Environment Variables Master List

### Required for ALL Components

| Variable             | Description                        | Example Value             |
| -------------------- | ---------------------------------- | ------------------------- |
| `NODE_ENV`           | Environment                        | `production`              |
| `JWT_SECRET`         | JWT signing key (48+ chars base64) | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | Refresh token key                  | `openssl rand -base64 48` |
| `ENCRYPTION_KEY`     | 32 hex chars (128-bit AES)         | `openssl rand -hex 32`    |

### Required for API Backend (Railway/Render/etc.)

| Variable              | Description             | Example                                               |
| --------------------- | ----------------------- | ----------------------------------------------------- |
| `DATABASE_URL`        | PostgreSQL via pooler   | `postgresql://user:pass@host:6432/db?sslmode=require` |
| `DATABASE_DIRECT_URL` | Direct PostgreSQL       | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `REDIS_URL`           | Redis connection        | `rediss://default:token@host:6379`                    |
| `S3_ENDPOINT`         | S3 API endpoint         | `https://s3.us-east-1.amazonaws.com`                  |
| `S3_REGION`           | S3 region               | `us-east-1`                                           |
| `S3_ACCESS_KEY`       | S3 access key           | (from AWS/R2 dashboard)                               |
| `S3_SECRET_KEY`       | S3 secret key           | (from AWS/R2 dashboard)                               |
| `S3_BUCKET`           | Bucket name             | `nodepress-media`                                     |
| `S3_PUBLIC_URL`       | Public media URL        | `https://cdn.yourdomain.com`                          |
| `API_URL`             | API self URL            | `https://api.yourdomain.com`                          |
| `APP_URL`             | Admin panel URL         | `https://admin.yourdomain.com`                        |
| `CORS_ORIGINS`        | Comma-separated origins | `https://admin.yourdomain.com,https://yourdomain.com` |
| `PORT`                | Server port             | `3001`                                                |

### Required for Vercel (Admin + Web-Starter)

| Variable              | Description                   | Set In        |
| --------------------- | ----------------------------- | ------------- |
| `NEXT_PUBLIC_API_URL` | Public API URL (from browser) | Both projects |
| `API_URL`             | API URL (from server)         | Both projects |
| `APP_URL`             | This app's own URL            | Each project  |

### Optional but Recommended

| Variable               | Description            | Default |
| ---------------------- | ---------------------- | ------- |
| `LOG_LEVEL`            | Logging verbosity      | `info`  |
| `JWT_EXPIRY`           | Access token TTL       | `15m`   |
| `REFRESH_TOKEN_EXPIRY` | Refresh token TTL      | `7d`    |
| `MAINTENANCE_MODE`     | Enable 503 maintenance | `false` |

---

## 10. Cost Comparison

### Monthly Cost Estimates (Production, Single Region)

| Component                 | Vercel + Services  | Railway All-in-One | Render All-in-One | Fly.io + Services | DigitalOcean    |
| ------------------------- | ------------------ | ------------------ | ----------------- | ----------------- | --------------- |
| **Admin (Next.js)**       | Vercel Pro: $20    | Included           | Included          | Included          | Included        |
| **Web-Starter (Next.js)** | Vercel Pro: $20    | Included           | Included          | Included          | Included        |
| **API (NestJS)**          | Railway: $5-25     | $5-25              | $7-19             | $5-15             | $12-24          |
| **Worker (BullMQ)**       | Railway: $5-12     | $5-12              | $7-12             | $5-12             | $12-24          |
| **PostgreSQL 16**         | Neon Launch: $19   | Railway PG: $5-20  | Render PG: $7-20  | Supabase Pro: $25 | DO DB: $15      |
| **Redis**                 | Upstash Paygo: ~$5 | Railway Redis: $5  | Render Redis: $7  | Upstash: ~$5      | DO Managed: $12 |
| **S3 Storage**            | R2: ~$1/10GB       | R2: ~$1/10GB       | R2: ~$1/10GB      | R2: ~$1/10GB      | Spaces: $5      |
| **Total (low)**           | **~$75/mo**        | **~$53/mo**        | **~$60/mo**       | **~$78/mo**       | **~$95/mo**     |
| **Total (mid)**           | **~$120/mo**       | **~$88/mo**        | **~$88/mo**       | **~$113/mo**      | **~$140/mo**    |
| **Total (high)**          | **~$210/mo**       | **~$112/mo**       | **~$112/mo**      | **~$138/mo**      | **~$170/mo**    |

### Free Tier Options (Development / Staging)

| Service           | Free Tier              | Limitations                              |
| ----------------- | ---------------------- | ---------------------------------------- |
| **Vercel**        | Hobby ($0)             | 100GB bandwidth, 6000 build mins/mo      |
| **Railway**       | Free trial ($5 credit) | Limited resources                        |
| **Render**        | Free web services      | Spins down after inactivity (cold start) |
| **Neon**          | 500MB, 100hr compute   | Pauses after inactivity                  |
| **Supabase**      | 500MB PostgreSQL       | 2GB bandwidth                            |
| **Upstash**       | 100MB Redis            | 10,000 commands/day                      |
| **Cloudflare R2** | 10GB storage           | No egress fees                           |

**Recommended Free-Tier Stack for Development**:

- **Vercel** (Hobby) — Admin + Web-Starter
- **Render** (Free) — NestJS API (note: spins down after 15 min idle)
- **Neon** (Free) — PostgreSQL
- **Upstash** (Free) — Redis
- **Cloudflare R2** (Free) — 10GB storage

---

## 11. CI/CD Pipeline Setup

### GitHub Actions Workflow

Create `.github/workflows/vercel-deploy.yml`:

```yaml
name: Vercel Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy-admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.1.4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --no-frozen-lockfile
      - run: npx turbo run build --filter=@nodepressjs/admin...
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.VERCEL_ADMIN_PROJECT_ID }}
          working-directory: apps/admin
          vercel-args: '--prod'

  deploy-web-starter:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.1.4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --no-frozen-lockfile
      - run: npx turbo run build --filter=@nodepressjs/web-starter...
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID}}
          vercel-project-id: ${{ secrets.VERCEL_WEB_PROJECT_ID }}
          working-directory: apps/web-starter
          vercel-args: '--prod'

  deploy-api:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: |
          # Deploy to Railway (requires Railway CLI + token)
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up --service api --detach
          railway up --service worker --detach

  run-migrations:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [deploy-api]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.1.4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --no-frozen-lockfile
      - name: Run Prisma Migrations
        run: npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
        env:
          DATABASE_URL: ${{ secrets.DATABASE_DIRECT_URL }}
```

### Vercel Automatic Deployments (Simpler)

**For the simplest setup**: Connect each Vercel project to GitHub directly (no GitHub Actions needed):

1. In Vercel Dashboard → Import Git Repository
2. Select the app's root directory (`apps/admin` or `apps/web-starter`)
3. Vercel auto-deploys on every push to the connected branch
4. Configure Preview Deployments for PRs

---

## 12. Production Readiness Checklist

- [ ] **All Next.js apps** deployed to Vercel with custom domains
- [ ] **NestJS API** deployed to Railway/Render/Fly.io with health check passing
- [ ] **PostgreSQL** on Neon/Supabase with `pg_trgm` and `uuid-ossp` extensions enabled
- [ ] **Redis** on Upstash with TLS connection verified
- [ ] **S3 Storage** bucket created and accessible
- [ ] **Prisma migrations** run against production database
- [ ] **Environment variables** set in all environments (no `.env` files in production)
- [ ] **JWT secrets** generated with `openssl rand -base64 48` (unique per deployment)
- [ ] **CORS origins** correctly set to your production domains
- [ ] **Image remote patterns** updated (remove localhost, add production S3 URL)
- [ ] **SSL/HTTPS** verified on all endpoints
- [ ] **CSP headers** configured (if using Helmet's CSP)
- [ ] **Database backups** configured (Neon/Railway auto-backup)
- [ ] **Health check endpoint** (`/api/v1/health`) added to monitoring
- [ ] **Rate limiting** configured (ThrottlerModule with Redis backend)
- [ ] **Alerting** set up (Vercel Status Checks + monitoring service)
- [ ] **`next.config.ts`** updated — no hardcoded localhost values
- [ ] **Worker process** deployed and processing BullMQ jobs
- [ ] **Logging** configured (LOG_LEVEL=info)
- [ ] **CDN** configured for static assets (Vercel does this automatically)

---

## 13. Troubleshooting

### Build Failures

| Symptom                    | Cause                                | Fix                                                                                               |
| -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `pnpm` not found           | Vercel doesn't have pnpm             | Ensure `pnpm-lock.yaml` exists at root. Vercel auto-detects.                                      |
| `turbo` not installed      | `turbo` not in dependencies          | Add `turbo` to root `package.json` devDependencies (already present)                              |
| `@nodepressjs/*` not found | Workspace packages not linked        | Ensure `pnpm-workspace.yaml` lists `packages/*`; use `--no-frozen-lockfile` during install        |
| Prisma client error        | Client not generated                 | Ensure `prisma generate` runs during `@nodepressjs/db` build                                      |
| `next.config` not found    | Dockerfile references wrong filename | Dockerfile references `next.config.js` but file is `.ts` or `.mjs` — Vercel handles this natively |

### Runtime Failures

| Symptom                  | Cause                       | Fix                                                                      |
| ------------------------ | --------------------------- | ------------------------------------------------------------------------ |
| API returns 502          | NestJS not reachable        | Check API health endpoint; verify CORS; check network                    |
| CORS errors in browser   | Wrong `CORS_ORIGINS`        | Set to exact production domains including protocol                       |
| `fetch` fails in browser | Wrong `NEXT_PUBLIC_API_URL` | Must be publicly accessible HTTPS URL                                    |
| Images not loading       | Remote pattern mismatch     | Update `images.remotePatterns` in `next.config.ts`                       |
| Connection refused       | Database not whitelisted    | Enable public access or Vercel IP whitelist                              |
| BullMQ jobs stuck        | Worker not running          | Deploy worker service; check Redis connection                            |
| Prisma migration errors  | Direct connection fails     | Use `DATABASE_DIRECT_URL` (not through PgBouncer)                        |
| Redis connection errors  | TLS mismatch                | Use `rediss://` for Upstash; set `rejectUnauthorized: false` only in dev |

### Common Vercel Issues

```
Error: The "default" project member is not authorized to use pnpm.
```

→ Solution: Ensure Vercel project has pnpm selected as package manager. In Vercel dashboard → Project Settings → General → Node.js Version → set to 20.x.

```
Error: Command "cd ../.. && pnpm install" exited with 1
```

→ Solution: Ensure `pnpm-lock.yaml` exists at root. If not, run `pnpm install` locally first and commit the lockfile.

```
Error: No output directory named ".next" found
```

→ Solution: Verify `outputDirectory` in `vercel.json` matches Next.js output. Ensure `rootDirectory` is set to `apps/admin` so `.next` is found at `apps/admin/.next`.

---

## 14. Appendix: Migration from Docker Compose

### What Changes from docker-compose.yml

| Docker Compose Service     | Vercel + PaaS Equivalent                                    |
| -------------------------- | ----------------------------------------------------------- |
| `postgres` (PostgreSQL 16) | Neon.tech / Supabase / Railway PG                           |
| `redis` (Redis 7 Alpine)   | Upstash / Redis Cloud / Railway Redis                       |
| `minio` (S3-compatible)    | AWS S3 / Cloudflare R2 / Vercel Blob                        |
| `pgbouncer`                | Built-in: Neon `?pgbouncer=true` or Railway connection pool |
| `api` (NestJS)             | Railway Web Service / Render Web Service                    |
| `admin` (Next.js)          | Vercel Project                                              |
| `traefik` (reverse proxy)  | Vercel Edge Network (auto HTTPS)                            |
| `worker` (BullMQ)          | Railway Worker / Render Worker Service                      |

### Removed from Production

- **PgBouncer** → Replaced by Neon's built-in pooler (or remove entirely for Railway)
- **Traefik** → Replaced by Vercel's global edge network (for frontend) and PaaS auto-TLS (for API)
- **MinIO** → Replaced by managed S3 service
- **Docker volumes** (persistent data) → Managed by cloud providers
- **`nodepress-network`** → Handled by cloud networking (private networking on Railway)

### Added for Production

- **Prisma migration strategy** — CI/CD pipeline for database migrations
- **Health checks** — `/api/v1/health` endpoint monitoring
- **Backup strategy** — Managed DB backups by provider
- **SSL certificates** — Auto-provisioned by Vercel + PaaS
- **CDN caching** — Vercel Edge Network

---

## Quick Reference: Architecture Decision Matrix

| Requirement         | Vercel Only          | Vercel + Railway  | Vercel + Render   | All Docker          |
| ------------------- | -------------------- | ----------------- | ----------------- | ------------------- |
| Admin Panel         | ✅                   | ✅                | ✅                | ✅                  |
| Public Site         | ✅                   | ✅                | ✅                | ✅                  |
| NestJS API          | ❌                   | ✅                | ✅                | ✅                  |
| PostgreSQL          | ❌                   | ✅ (Managed)      | ✅ (Managed)      | ✅ (Self-hosted)    |
| Redis               | ❌                   | ✅ (Managed)      | ✅ (Managed)      | ✅ (Self-hosted)    |
| S3 Storage          | ❌                   | ✅ (External)     | ✅ (External)     | ✅ (External/MinIO) |
| Workers             | ❌                   | ✅ (Separate svc) | ✅ (Separate svc) | ✅ (Same compose)   |
| Setup Complexity    | Simple               | Moderate          | Moderate          | Complex             |
| Maintenance         | Low                  | Low               | Low               | High                |
| Monthly Cost (prod) | ~$40 (frontend only) | ~$80-120          | ~$80-120          | ~$50-100 (VM)       |

---

_Generated for NodePress v1.0.0-beta.2 | Deployment analysis by Senior DevOps Engineer (AWS)_
