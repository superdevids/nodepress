# NodePress

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

## Quick Start

```bash
# Clone & install
git clone https://github.com/superdevids/nodepress.git
cd nodepress
pnpm install

# Start development environment
docker compose up -d    # PostgreSQL, Redis, MinIO
pnpm db:migrate         # Run database migrations
pnpm db:seed            # Seed default data
pnpm dev                # Start API (3001) + Admin (3000)

# Or single command
docker compose up       # Everything in containers
```

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

## WordPress Parity: 98%

147 features mapped → 144 implemented. See [docs/WORDPRESS-COMPARISON.md](docs/WORDPRESS-COMPARISON.md)

## Documentation

| Document                                                       | Description                             |
| -------------------------------------------------------------- | --------------------------------------- |
| [docs/PRD1.md](docs/PRD1.md)                                   | Core Product Requirements v1.0          |
| [docs/PRD2.md](docs/PRD2.md)                                   | Security, Performance, Scalability v2.0 |
| [docs/PRD3.md](docs/PRD3.md)                                   | Gap Analysis - 147 items (historical)   |
| [docs/PRD4.md](docs/PRD4.md)                                   | Final Audit & Remediation Analysis      |
| [docs/AUDIT-REPORT-COMPLETE.md](docs/AUDIT-REPORT-COMPLETE.md) | Codebase audit - 298 issues fixed       |
| [docs/WORDPRESS-COMPARISON.md](docs/WORDPRESS-COMPARISON.md)   | NodePress vs WordPress comparison       |

## License

MIT
