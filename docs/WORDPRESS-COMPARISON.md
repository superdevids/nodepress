# NodePress vs WordPress — Honest Comparison

**Version:** 1.0.0-beta.2  
**Date:** July 2026  
**Status:** ⚠️ This document reflects current development state. NodePress is beta software.

---

## ⚠️ CURRENT STATUS — Read This First

**NodePress is ~90% feature-complete but NOT production-ready.**

This document compares NodePress to WordPress. We're proud of what we've built, but we want to be transparent about where things stand.

**What's actually working well:**

- ✅ Content management (posts, pages, custom types)
- ✅ Media library with S3 storage
- ✅ REST API (85+ endpoints) + GraphQL API
- ✅ Authentication (JWT, 2FA, 6 user roles)
- ✅ Security (CSP, CORS, rate limiting, Helmet)
- ✅ 13 plugins (SEO, Comments, Forms, Analytics, etc.)
- ✅ Plugin system with hooks/filters
- ✅ Docker development environment
- ✅ CLI with 30+ commands

**What needs work:**

- ⚠️ **Install Wizard** — API exists, front-end UI still being built
- ⚠️ **Forgot Password** — Backend works, reset page pending
- ⚠️ **Block Editor** — Tiptap-based, works but has edge cases
- ⚠️ **Test Coverage** — 24 test files (target: 190+)
- ⚠️ **Production Deployment** — Docker Compose exists, not fully verified
- ⚠️ **Web Starter Theme** — Basic routes exist, needs production polish

**What doesn't exist yet (v2.0+):**

- ❌ Multisite / Network mode
- ❌ E-commerce / WooCommerce replacement
- ❌ Page builder (Elementor-style)
- ❌ Content approval workflows

---

## Quick Summary

| Dimension          | WordPress            | NodePress                  |
| ------------------ | -------------------- | -------------------------- |
| **Release Year**   | 2003                 | 2026 (beta)                |
| **Market Share**   | 43%+ of web          | New platform               |
| **Plugins**        | 60,000+              | 13 official + SDK          |
| **Language**       | PHP                  | TypeScript                 |
| **Database**       | MySQL                | PostgreSQL                 |
| **Ecosystem**      | Mature               | Growing                    |
| **Performance**    | Good                 | Better (modern stack)      |
| **Hosting**        | Any shared host      | Requires Node.js host      |
| **Learning Curve** | Shallow (non-coders) | Steeper (TypeScript teams) |

---

## Architecture Comparison

| Feature   | WordPress               | NodePress                 |
| --------- | ----------------------- | ------------------------- |
| Runtime   | PHP 8.x (FPM)           | Node.js 20+               |
| Language  | PHP (dynamic)           | TypeScript (strict)       |
| Database  | MySQL 8.x               | PostgreSQL 16             |
| ORM       | wpdb (custom PHP)       | Prisma (type-safe)        |
| APIs      | REST + GraphQL (plugin) | REST + GraphQL (built-in) |
| Admin UI  | PHP + jQuery + React    | Next.js 14 (React 18)     |
| Caching   | Redis (plugin)          | Redis 7 (built-in)        |
| Queue     | WP-Cron (unreliable)    | BullMQ (persistent)       |
| Search    | MySQL FULLTEXT          | PostgreSQL tsvector       |
| Container | Third-party             | Official Docker Compose   |

---

## Feature Comparison

### Content Management

| Feature              | WordPress    | NodePress                                    |
| -------------------- | ------------ | -------------------------------------------- |
| Posts & Pages        | ✅ Mature    | ✅ Working                                   |
| Custom Post Types    | ✅           | ✅ Code + UI registration                    |
| Custom Fields (ACF)  | ✅ (premium) | ✅ 13 field types, built-in                  |
| Categories & Tags    | ✅           | ✅                                           |
| Revisions            | ✅           | ✅ With diff/compare UI                      |
| Scheduled Publishing | ✅           | ✅ BullMQ cron-based                         |
| Block Editor         | ✅ Gutenberg | ⚠️ Tiptap (22 extensions, edge cases)        |
| Shortcodes           | ✅           | ✅ Registered handlers                       |
| oEmbed               | ✅           | ✅ 40+ providers                             |
| Content Locking      | ✅           | ✅ Redis-based                               |
| Trash / Restore      | ✅           | ✅ 30-day auto-purge                         |
| Menu Management      | ✅           | ✅ Drag-drop builder                         |
| Widget Areas         | ✅           | ⚠️ Sidebar support, admin wiring in progress |
| Page Templates       | ✅           | ✅ Full hierarchy + Next.js layouts          |

### Media

| Feature                | WordPress   | NodePress                    |
| ---------------------- | ----------- | ---------------------------- |
| Media Library          | ✅          | ✅ Grid/list views           |
| Image Editing          | ✅          | ✅ Crop, resize, focal point |
| Image Sizes            | ✅          | ✅ Configurable breakpoints  |
| S3 Storage             | ✅ (plugin) | ✅ Built-in S3 support       |
| Drag & Drop Upload     | ✅          | ✅ Chunked upload            |
| File Type Restrictions | ✅          | ✅ Allowlist/blocklist       |

### Users & Security

| Feature        | WordPress     | NodePress                           |
| -------------- | ------------- | ----------------------------------- |
| User Roles     | ✅ 5 built-in | ✅ 6 roles (granular)               |
| Custom Roles   | ✅            | ✅ Capability toggles               |
| 2FA            | ⚠️ Plugin     | ✅ Built-in TOTP                    |
| Rate Limiting  | ⚠️ Plugin     | ✅ Built-in Redis sliding window    |
| Audit Logging  | ⚠️ Plugin     | ✅ Built-in immutable log           |
| CSP / CORS     | ⚠️ Manual     | ✅ Built-in configurable            |
| Password Reset | ✅            | ⚠️ API works, frontend page pending |

### Developer Features

| Feature         | WordPress                 | NodePress                          |
| --------------- | ------------------------- | ---------------------------------- |
| REST API        | ✅ Manual registration    | ✅ Auto-generated per CPT          |
| GraphQL         | ⚠️ Plugin needed          | ✅ Built-in, code-first            |
| Webhooks        | ⚠️ Plugin                 | ✅ HMAC-signed, retry, dead-letter |
| CLI             | ✅ WP-CLI (150+ commands) | ✅ `nodepress` CLI (30+ commands)  |
| Import/Export   | ✅ WXR                    | ✅ WXR + JSON + CSV                |
| Permalinks      | ✅                        | ✅ Full WordPress patterns         |
| Health Check    | ⚠️ Plugin                 | ✅ Built-in diagnostics            |
| Migration Tools | N/A                       | ✅ WXR importer, ACF migrator      |

---

## Known Gaps

### Features NodePress Has But Needs Polish

| Feature                       | Issue                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| **Plugin Data Persistence**   | Plugins can store data via Prisma but some default to in-memory |
| **Admin Panel Polish**        | Bulk actions, empty states, notifications need UI work          |
| **Forgot Password Flow**      | Backend works; frontend reset page is in development            |
| **Install Wizard**            | API ready; 5-step setup UI is being built                       |
| **Email System**              | SMTP config exists; no email verification flow yet              |
| **Rate Limiting Persistence** | Some rate-limit state resets on restart                         |
| **Observability**             | Structured logging exists; Prometheus metrics not wired         |

### Features WordPress Has That NodePress Doesn't

| Feature                        | Planned        |
| ------------------------------ | -------------- |
| Multisite (Network)            | v2.0           |
| E-commerce (WooCommerce)       | v2.0           |
| Page Builder (Elementor-style) | v2.0           |
| Content Workflows              | v2.0           |
| Collaborative Editing          | v2.0           |
| 60,000+ Plugin Ecosystem       | Long-term goal |

---

## Performance Notes

> **⚠️ IMPORTANT:** We have NOT yet run validated third-party benchmarks. The numbers below are targets, not verified results. We'll publish real benchmarks when we have them.

**Target improvements over WordPress (headless) based on architecture:**

| Metric              | Expected Improvement | Status     |
| ------------------- | -------------------- | ---------- |
| API Read (cached)   | ~37% faster          | Unverified |
| API Write (single)  | ~20% faster          | Unverified |
| Concurrent Requests | ~2x throughput       | Unverified |
| Memory Per Request  | ~5x less             | Unverified |
| Cold Start (Docker) | ~80% faster          | Unverified |

**Why NodePress should be faster:**

- Node.js event loop vs PHP process-per-request
- Prisma query engine (compiled Rust) vs wpdb
- Next.js ISR / edge caching
- `sharp` library (libvips C bindings) for image processing

---

## Migration: WordPress → NodePress

### What Migrates Cleanly

| Item               | Tool              | Fidelity             |
| ------------------ | ----------------- | -------------------- |
| Posts, Pages, CPTs | WXR Importer      | ✅ Full              |
| Media Library      | WXR + S3 Sync     | ✅ Full              |
| Users              | WXR Importer      | ✅ Full              |
| Comments           | WXR Importer      | ✅ Full              |
| Menus              | WXR Importer      | ✅ Full              |
| ACF Fields         | ACF JSON → import | ✅ Full              |
| Shortcodes         | Registry handlers | ✅ With custom work  |
| Gutenberg Blocks   | HTML → Tiptap     | ⚠️ Known blocks only |
| Plugins            | Manual            | ⚠️ Work required     |

### What Requires Manual Work

- Custom WordPress plugins need to be rewritten as NodePress plugins
- Gutenberg custom blocks need conversion
- WooCommerce data needs migration tooling (v2.0)
- Theme needs to be rebuilt (Next.js)

**Estimated migration time:** 1-4 hours for a standard WordPress site (1,000 posts, standard plugins).

---

## Decision Guide

### ✅ Choose NodePress If

- Your team knows TypeScript and modern JavaScript
- You want headless/decoupled architecture
- You need both REST and GraphQL built-in
- Performance and security are top priorities
- You're containerizing deployment (Docker/K8s)
- You're building a content platform, not just a blog
- You want built-in 2FA, CSP, rate limiting

### ✅ Choose WordPress If

- You need the 60,000+ plugin ecosystem
- Non-technical editors will manage content
- You're on shared hosting ($5-20/month)
- You need mature e-commerce (WooCommerce)
- You need multisite today (not v2.0)
- You depend on specific premium plugins
- You have limited development resources

---

## Final Verdict

> **NodePress is NOT a "WordPress killer."** It's a modern alternative for a specific audience: TypeScript teams building content-powered applications.

**Total features compared:** 147  
**NodePress status:** ~90% feature parity with WordPress core (not counting ecosystem)  
**Production ready:** ❌ Not yet (beta software, active development)

WordPress remains the right choice for most websites today. NodePress is the right choice if you value type safety, modern DX, and API-first architecture — and you're willing to be an early adopter.

---

_Questions? Open an issue at https://github.com/superdevids/nodepress/issues_
