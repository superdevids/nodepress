# NodePress

> **Updated:** July 4, 2026 — Consistency fixes applied per PRD5 audit findings.
> **WordPress-compatible CMS built with Node.js / TypeScript**
> Monorepo · NestJS · Next.js · Prisma · PostgreSQL · Tailwind CSS

NodePress is a modern, headless-first Content Management System that brings the WordPress content model and plugin ecosystem to the JavaScript/TypeScript world. Built from the ground up with type safety, container-native deployment, and GraphQL-first APIs.

## Architecture

```
apps/
├── api/          → NestJS REST + GraphQL API (port 3001)
├── admin/        → Next.js 14 Admin Panel (port 3000)
└── web-starter/  → Next.js Public Site Template (port 3002)

packages/
├── core/         → Business logic engine (content, plugin, theme, auth, security)
├── db/           → Prisma schema + migrations (PostgreSQL)
├── editor/       → Tiptap/ProseMirror block editor
├── plugin-sdk/   → Plugin development SDK
├── cli/          → Command-line interface
├── ui/           → Shared Tailwind component library
├── config/       → Shared configuration + Tailwind preset
└── testing/      → Test utilities & factories

plugins/ (13 WordPress-equivalent plugins)
├── seo/          → Yoast-equivalent (meta tags, sitemap, schema.org)
├── cache-redis/  → W3 Total Cache-equivalent (Redis caching)
├── comments/     → Akismet-equivalent (Gravatar, moderation, anti-spam)
├── forms/        → Contact Form 7-equivalent (builder, Stripe, CSV)
├── file-editor/  → Theme/Plugin file editor (Monaco, git diff)
├── analytics/    → MonsterInsights-equivalent (GA4, dashboard)
├── security/     → Wordfence-equivalent (firewall, audit, 2FA)
├── social-sharing/→ Social Warfare-equivalent (8 networks, share counts)
├── backup/       → UpdraftPlus-equivalent (schedule, S3/GDrive)
├── newsletter/   → MailPoet-equivalent (campaigns, subscribers)
├── redirection/  → Redirection-equivalent (301/302, 404 tracker)
├── performance/  → WP Rocket-equivalent (cache, minify, CDN)
└── multilingual/ → WPML-equivalent (11 languages, auto-translate)
```

## 🚀 Quick Start (1 Command)

### Option A: Local Development

```bash
# First time setup (install + migrate + seed)
pnpm setup

# Start developing (API:3001 + Admin:3000)
pnpm dev
```

### Option B: Docker (Everything in containers)

```bash
# Single command - starts infrastructure + apps
docker compose up
```

### Option C: One-Command Setup + Dev

```bash
# Setup + Start in one go
pnpm go
```

### Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- **pnpm 9+** (`npm i -g pnpm`)
- **Docker** (for PostgreSQL + Redis + MinIO)

### What You Get

| Service            | URL                        | Default Credentials           |
| ------------------ | -------------------------- | ----------------------------- |
| Admin Panel        | http://localhost:3000      | admin@nodepress.local / admin |
| REST API           | http://localhost:3001      | —                             |
| API Docs (Swagger) | http://localhost:3001/docs | —                             |
| PostgreSQL         | localhost:5432             | nodepress / nodepress         |
| Redis              | localhost:6379             | —                             |
| MinIO (S3)         | http://localhost:9000      | nodepress / nodepress123      |

## Tech Stack

| Layer         | Technology                               |
| ------------- | ---------------------------------------- |
| Language      | TypeScript (strict, end-to-end)          |
| API Framework | NestJS 10                                |
| Admin UI      | Next.js 14 (App Router)                  |
| Database      | PostgreSQL 16 + Prisma ORM               |
| Cache/Queue   | Redis 7 + BullMQ                         |
| Block Editor  | Tiptap (ProseMirror)                     |
| Styling       | Tailwind CSS (WordPress-inspired preset) |
| Auth          | JWT + Passport + 2FA (TOTP)              |
| Testing       | Vitest + Playwright                      |
| CI/CD         | GitHub Actions                           |
| Deployment    | Docker + Kubernetes                      |

## WordPress Parity: ~90%

147 features mapped → 132 implemented (~90%). See [docs/WORDPRESS-COMPARISON.md](docs/WORDPRESS-COMPARISON.md)

> **Test Status:** ~5 test files exist. Test coverage is a work in progress — target is 190+ tests. See [docs/PRD5.md](docs/PRD5.md) (latest) for the audit roadmap.

## Documentation

| Document                                                       | Description                             |
| -------------------------------------------------------------- | --------------------------------------- |
| [docs/PRD1.md](docs/PRD1.md)                                   | Core Product Requirements v1.0          |
| [docs/PRD2.md](docs/PRD2.md)                                   | Security, Performance, Scalability v2.0 |
| [docs/PRD3.md](docs/PRD3.md)                                   | Gap Analysis - 147 items (historical)   |
| [docs/PRD4.md](docs/PRD4.md)                                   | Final Audit & Remediation Analysis      |
| [docs/PRD5.md](docs/PRD5.md)                                   | Final Audit & Remediation v5.0 (latest) |
| [docs/AUDIT-REPORT-COMPLETE.md](docs/AUDIT-REPORT-COMPLETE.md) | Codebase audit - 298 issues fixed       |
| [docs/WORDPRESS-COMPARISON.md](docs/WORDPRESS-COMPARISON.md)   | NodePress vs WordPress comparison       |

## License

MIT
