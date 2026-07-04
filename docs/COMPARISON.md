# NodePress vs Other CMS Platforms — Honest Comparison

**Version:** 1.0.0-beta.2  
**Date:** July 2026  
**Status:** ⚠️ This document reflects current development state. NodePress is beta software.

---

## ⚠️ CURRENT STATUS — Read This First

**NodePress is ~90% feature-complete but NOT production-ready.**

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

## CMS Landscape Comparison

| Dimension          | NodePress                 | Strapi         | Payload CMS        | WordPress      |
| ------------------ | ------------------------- | -------------- | ------------------ | -------------- |
| **Release Year**   | 2026 (beta)               | 2020           | 2021               | 2003           |
| **Language**       | TypeScript                | JavaScript     | TypeScript         | PHP            |
| **Database**       | PostgreSQL                | Multiple (SQL) | MongoDB/PostgreSQL | MySQL          |
| **Admin Panel**    | Next.js 14 (React 18)     | React          | React              | PHP + jQuery   |
| **API Style**      | REST + GraphQL (built-in) | REST + GraphQL | REST + GraphQL     | REST + GraphQL |
| **Plugins**        | 13 official + SDK         | Marketplace    | Growing            | 60,000+        |
| **Type Safety**    | Full (strict)             | Partial        | Full               | Dynamic        |
| **Headless**       | Built-in                  | Native         | Native             | Via plugins    |
| **Self-Hosted**    | ✅                        | ✅             | ✅                 | ✅             |
| **Learning Curve** | Moderate (TypeScript)     | Moderate       | Steeper            | Shallow        |

---

## Architecture Comparison

| Feature   | NodePress               | Payload CMS      | Strapi           | WordPress            |
| --------- | ----------------------- | ---------------- | ---------------- | -------------------- |
| Runtime   | Node.js 20+             | Node.js 20+      | Node.js 18+      | PHP 8.x (FPM)        |
| ORM       | Prisma (type-safe)      | Mongoose/TypeORM | Knex + Bookshelf | wpdb (custom PHP)    |
| Caching   | Redis 7 (built-in)      | Custom           | Redis (plugin)   | Redis (plugin)       |
| Queue     | BullMQ (persistent)     | None             | None             | WP-Cron (unreliable) |
| Search    | PostgreSQL tsvector     | Custom           | Custom           | MySQL FULLTEXT       |
| Container | Official Docker Compose | Community Docker | Docker Compose   | Third-party          |

---

## Feature Comparison

### Content Management

| Feature              | NodePress   | Payload CMS  | Strapi       | WordPress        |
| -------------------- | ----------- | ------------ | ------------ | ---------------- |
| Posts & Pages        | ✅          | ✅           | ✅           | ✅               |
| Custom Post Types    | ✅          | ✅           | ✅           | ✅               |
| Custom Fields        | ✅ 13 types | ✅ rich      | ✅           | ✅ (premium ACF) |
| Categories & Tags    | ✅          | ✅           | ✅           | ✅               |
| Revisions            | ✅ diff UI  | ✅           | ❌           | ✅               |
| Scheduled Publishing | ✅          | ✅           | ✅           | ✅               |
| Block Editor         | ⚠️ Tiptap   | ✅ rich text | ✅ rich text | ✅ Gutenberg     |
| Shortcodes           | ✅          | ❌           | ❌           | ✅               |
| Content Locking      | ✅ Redis    | ❌           | ❌           | ✅               |
| Menu Management      | ✅          | ❌           | ❌           | ✅               |

### Media

| Feature            | NodePress   | Payload CMS | Strapi    | WordPress |
| ------------------ | ----------- | ----------- | --------- | --------- |
| Media Library      | ✅          | ✅          | ✅        | ✅        |
| Image Editing      | ✅          | ❌          | ❌        | ✅        |
| S3 Storage         | ✅ built-in | ✅ built-in | ✅ plugin | ✅ plugin |
| Drag & Drop Upload | ✅          | ✅          | ✅        | ✅        |

### Developer Features

| Feature       | NodePress                  | Payload CMS       | Strapi            | WordPress              |
| ------------- | -------------------------- | ----------------- | ----------------- | ---------------------- |
| REST API      | ✅ Auto-generated per CPT  | ✅ Auto-generated | ✅ Auto-generated | ✅ Manual registration |
| GraphQL       | ✅ Built-in                | ✅ Built-in       | ✅ Built-in       | ⚠️ Plugin needed       |
| Webhooks      | ✅ HMAC-signed, retry, DLQ | ✅                | ✅                | ⚠️ Plugin              |
| CLI           | ✅ `nodepress` CLI (30+)   | ✅                | ✅                | ✅ WP-CLI (150+)       |
| Import/Export | ✅ WXR + JSON + CSV        | ✅ JSON           | ✅ JSON           | ✅ WXR                 |

---

## Performance Targets

> **⚠️ IMPORTANT:** We have NOT yet run validated third-party benchmarks. The numbers below are targets based on architecture analysis.

| Metric              | Expected vs WordPress |
| ------------------- | --------------------- |
| API Read (cached)   | ~37% faster           |
| API Write (single)  | ~20% faster           |
| Concurrent Requests | ~2x throughput        |
| Memory Per Request  | ~5x less              |
| Cold Start (Docker) | ~80% faster           |

**Why NodePress should be faster:**

- Node.js event loop vs PHP process-per-request
- Prisma query engine (compiled Rust) vs wpdb
- Next.js ISR / edge caching
- `sharp` library (libvips C bindings) for image processing

---

## Migration Guide

### What Migrates Cleanly

| Item               | Tool              | Fidelity |
| ------------------ | ----------------- | -------- |
| Posts, Pages, CPTs | WXR Importer      | ✅ Full  |
| Media Library      | WXR + S3 Sync     | ✅ Full  |
| Users              | WXR Importer      | ✅ Full  |
| Comments           | WXR Importer      | ✅ Full  |
| Menus              | WXR Importer      | ✅ Full  |
| ACF Fields         | ACF JSON → import | ✅ Full  |

### What Requires Manual Work

- Gutenberg custom blocks need conversion
- WooCommerce data needs migration tooling (v2.0)
- Themes need to be rebuilt in React/Next.js

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

### ✅ Choose Another CMS If

- You need the 60,000+ plugin ecosystem (WordPress)
- Non-technical editors will manage content primarily (WordPress/Strapi)
- You're on shared hosting (WordPress)
- You need mature e-commerce (WordPress + WooCommerce)
- You want a pure headless CMS with no opinionated frontend (Strapi/Payload)

---

## Final Verdict

NodePress is a modern alternative for TypeScript teams building content-powered applications. It combines familiar CMS concepts with modern TypeScript, type safety, and API-first architecture.

**Total features compared:** 147  
**Production ready:** ❌ Not yet (beta software, active development)

---

_Questions? Open an issue at https://github.com/superdevids/nodepress/issues_
