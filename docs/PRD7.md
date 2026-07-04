# PRD v7: NodePress — Production Readiness Plan

**Version:** 7.0  
**Date:** July 4, 2026  
**Status:** Planning Phase  
**Scope:** Complete production readiness — from current state to v1.0-beta release  
**Audience:** Engineering Team, C-Level Stakeholders, Project Managers

---

## 1. Executive Summary

NodePress has completed two full audit-remediation cycles (PRD5: 229+ issues, PRD6: 43 issues). The codebase is architecturally sound — TypeScript end-to-end, NestJS/Next.js/Prisma/PostgreSQL stack, 36 database models, 85+ REST endpoints, GraphQL API, 13 functional plugins, and comprehensive security hardening.

However, the project is **NOT yet production-ready**. Critical gaps remain that prevent end users from adopting NodePress as a CMS:

| Gap                                         | Severity   | Impact                                                                                          |
| ------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| **Zero data persistence in all 13 plugins** | 🔴 BLOCKER | All plugin data (SEO settings, comments, forms, analytics, backups, etc.) lost on every restart |
| **Only ~5 test files (target: 190+)**       | 🔴 BLOCKER | No safety net for refactoring. Cannot guarantee stability                                       |
| **Admin panel polish incomplete**           | 🟠 HIGH    | Bulk actions, forgot password, notifications non-functional                                     |
| **Install wizard missing**                  | 🟠 HIGH    | New users cannot set up the CMS via UI                                                          |
| **No production deployment verified**       | 🟠 HIGH    | Never deployed to staging/production environment                                                |
| **Plugin persistence via database**         | 🔴 BLOCKER | PluginStorage utility exists but not connected to Prisma                                        |

**Current State:** Active Development (~7/10 readiness)  
**Target State:** Production Ready v1.0-beta (~9.5/10 readiness)  
**Estimated Timeline:** 6-8 weeks with 2-3 engineers  
**Total Engineering Effort:** ~85-100 engineering days

### What "Production Ready" Means

For NodePress v1.0-beta, production ready is defined as:

1. ✅ **End users can install, configure, and use NodePress without touching code** — via the admin panel UI
2. ✅ **All data persists across restarts** — no in-memory storage except ephemeral caches
3. ✅ **Admin panel pages are fully functional** — no broken buttons, no TODO placeholders, no mock data
4. ✅ **Test suite provides a safety net** — minimum 100 tests covering critical paths
5. ✅ **Deployment is documented and verified** — Docker Compose production stack works end-to-end
6. ✅ **Security baseline is validated** — third-party penetration test passed
7. ✅ **Performance baseline is established** — k6 benchmarks documented

---

## 2. Current State Assessment

### What Works (Production-Grade)

| Area                     | Status              | Details                                                      |
| ------------------------ | ------------------- | ------------------------------------------------------------ |
| REST API (85+ endpoints) | ✅ PRODUCTION-GRADE | Auth, content CRUD, media, users, taxonomy, settings         |
| GraphQL API              | ✅ PRODUCTION-GRADE | Apollo Server, code-first schema, all resolvers              |
| Authentication           | ✅ PRODUCTION-GRADE | JWT + refresh tokens, 2FA (TOTP), RBAC 6 roles               |
| Security Hardening       | ✅ PRODUCTION-GRADE | CSP, CORS, Rate limiting, Helmet, guards, interceptors       |
| Database Schema          | ✅ PRODUCTION-GRADE | 36 Prisma models, proper indexes, migrations automated       |
| Docker Dev Environment   | ✅ PRODUCTION-GRADE | Postgres, Redis, MinIO, PgBouncer, hot-reload                |
| Core Content Engine      | ✅ PRODUCTION-GRADE | Content types, taxonomies, revisions, permalinks, shortcodes |
| Plugin System (Engine)   | ✅ PRODUCTION-GRADE | Hook registry, dependency resolver, plugin lifecycle         |
| Theme System (Engine)    | ✅ PRODUCTION-GRADE | Template hierarchy, child themes, theme.json, block patterns |
| CLI Tool                 | ✅ FUNCTIONAL       | 30+ commands for content, users, plugins, cache, backup      |

### What Needs Work (Pre-Production)

| Area                        | Status        | Details                                                                                   |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------- |
| **Plugin Data Persistence** | ❌ NOT READY  | All 13 plugins store data in-memory. PluginStorage utility exists but not wired to Prisma |
| **Testing Coverage**        | ❌ NOT READY  | ~5 test files vs 190+ target. Auth test was broken until PRD6                             |
| **Admin Panel Polish**      | ⚠️ PARTIAL    | Dashboard, content, media work. Bulk actions, forgot password, notifications are TODO     |
| **Install Wizard**          | ❌ MISSING    | Route `/install` is empty — no setup UI                                                   |
| **Production Deployment**   | ❌ UNVERIFIED | Docker Compose production config exists but never tested end-to-end                       |
| **web-starter Theme**       | ⚠️ BASIC      | 6 routes exist but not production-quality template                                        |
| **Email System**            | ⚠️ PARTIAL    | Mail service exists, SMTP config needed. No email verification flow                       |
| **Password Reset**          | ⚠️ PARTIAL    | Token generation works. Reset URL doesn't include proper origin                           |
| **Rate Limiting**           | ⚠️ IN-MEMORY  | Rate limit state resets on every restart. Needs Redis persistence                         |
| **Observability**           | ⚠️ PARTIAL    | Structured logging exists. Prometheus metrics, OpenTelemetry tracing not wired            |
| **Documentation**           | ⚠️ PARTIAL    | Developer docs exist. No end-user guide, no admin manual                                  |

---

## 3. Production Readiness Gaps — DETAILED

### GAP-P0: Plugin Data Persistence (🔴 BLOCKER)

**Current State:** All 13 plugins store data exclusively in JavaScript Maps and arrays. Every server restart wipes all plugin data — SEO settings, comments, forms submissions, analytics data, backup schedules, newsletter subscribers, redirect rules, security logs, cache configuration, social share counts, multilingual translations, performance settings, file editor backups.

**Root Cause:** The plugin SDK's `PluginContext` does not expose Prisma or any database access. Plugins were designed to be "zero-config" with in-memory storage as a shortcut.

**Fix Required:**

- Add `prisma: PrismaClient` to `PluginContext` in plugin-sdk
- Create a plugin-scoped data access pattern (e.g., `plugin.getStore('namespace')` backed by a `plugin_data` table)
- Rewrite ALL 13 plugins to use persistent storage instead of in-memory
- Migration path for existing plugin data

**Effort:** 10-12 engineering days
**Dependencies:** plugin-sdk, database migration, all 13 plugin rewrites

### GAP-P1: Testing Infrastructure (🔴 BLOCKER)

**Current State:** Only ~5 test files exist across the entire monorepo:

- `packages/core/src/__tests__/` - 3 files (content-engine, hook-registry, shortcode-engine)
- `apps/api/src/auth/__tests__/` - 1 file (auth.service - was broken until PRD6)
- `apps/admin/src/components/__tests__/` - 1 file (button, content-form)

**No tests for:** API controllers, services, guards, middleware, admin pages, ANY plugin.

**Target: 190+ tests**

| Test Type                           | Current | Target             | Priority |
| ----------------------------------- | ------- | ------------------ | -------- |
| Unit tests (services, utils)        | ~5      | 80+                | P1       |
| Integration tests (API endpoints)   | 0       | 60+                | P1       |
| Admin component tests               | 1       | 30+                | P2       |
| Plugin tests                        | 0       | 26+ (2 per plugin) | P2       |
| E2E (login → create → publish flow) | 0       | 3+                 | P1       |

**Effort:** 10-15 engineering days

### GAP-P2: Admin Panel Production Polish (🟠 HIGH)

#### 2a. Install Wizard

**File:** `apps/admin/src/app/install/` — **empty directory**
**What's needed:** A step-by-step setup wizard:

1. Database connection test
2. Admin user creation
3. Site configuration (name, description, URL)
4. Plugin selection
5. Theme selection
6. Completion → redirect to dashboard

**Effort:** 5-7 engineering days

#### 2b. Forgot Password Flow

**Current State:** Login page links to `/admin/login/forgot-password` which returns 404
**What's needed:**

- Forgot password page (email input → send reset link)
- Reset password page (token validation → new password form)
- Backend endpoint: `POST /auth/forgot-password`, `POST /auth/reset-password`
- Email template for password reset

**Effort:** 3-4 engineering days

#### 2c. Bulk Actions

**Current State:** Frontend calls `/content/bulk` which doesn't exist
**What's needed:**

- Backend: `POST /content/bulk` endpoint handling publish, unpublish, trash, delete, assign taxonomy
- Backend: BullMQ job queue for large batches (>100 items)
- Frontend: Progress indicator, success/error summary

**Effort:** 3-5 engineering days

#### 2d. Notifications System

**Current State:** Notification bell icon has no onClick handler
**What's needed:**

- Backend: Notification model + API endpoints (list, markRead, markAllRead)
- Frontend: Bell icon with unread count badge, dropdown notification list
- Triggers: content published, comment pending, plugin update, system alert

**Effort:** 4-5 engineering days

#### 2e. Empty States & Onboarding

**Current State:** Pages show empty tables with no guidance
**What's needed:**

- Empty state illustrations/components for all list pages
- "Quick start" wizard for first-time users
- Tooltips and contextual help throughout admin panel
- Default content seed for new installations

**Effort:** 3-4 engineering days

### GAP-P3: Production Deployment Verification (🟠 HIGH)

**Current State:** Docker Compose production config exists but has never been tested end-to-end in a production-like environment.

**Checklist:**

| Item                                                   | Status        | Effort  |
| ------------------------------------------------------ | ------------- | ------- |
| Docker Compose production stack boots cleanly          | ❌ UNVERIFIED | 1 day   |
| Traefik reverse proxy works with Let's Encrypt         | ❌ UNVERIFIED | 1 day   |
| Database migrations run automatically on first start   | ❌ UNVERIFIED | 1 day   |
| Media uploads work with MinIO/S3                       | ❌ UNVERIFIED | 1 day   |
| Redis cache + queue work end-to-end                    | ❌ UNVERIFIED | 1 day   |
| Worker processes (image processing, webhooks) function | ❌ UNVERIFIED | 1 day   |
| Health check endpoints work                            | ❌ UNVERIFIED | 0.5 day |
| Logging and log rotation function                      | ❌ UNVERIFIED | 0.5 day |
| Backup/restore works in production                     | ❌ UNVERIFIED | 1 day   |
| Graceful shutdown works (SIGTERM handling)             | ❌ UNVERIFIED | 0.5 day |
| Zero-downtime deployment is possible                   | ❌ UNVERIFIED | 2 days  |
| Horizontal scaling (multiple API instances) works      | ❌ UNVERIFIED | 2 days  |

**Effort:** 8-12 engineering days

### GAP-P4: web-starter Production Theme (🟡 MEDIUM)

**Current State:** `apps/web-starter/` has 6 basic routes (home, blog listing, single post, about, contact, 404). No production-quality templates.

**What's needed:**

- Complete template hierarchy matching WordPress:
  - `single-{type}.tsx` for custom content types
  - `archive-{type}.tsx`, `archive.tsx`
  - `taxonomy-{taxonomy}.tsx`
  - `search.tsx`, `search-form.tsx`
  - `author.tsx`, `author-{id}.tsx`
  - `date.tsx` (year/month/day archives)
  - `page-{slug}.tsx` for custom pages
- Responsive design, dark mode
- SEO metadata integration with SEO plugin
- Breadcrumbs
- Pagination
- RSS feed links in `<head>`
- Sitemap.xml integration
- JSON-LD structured data
- Accessibility (WCAG AA)
- Performance optimized (Lighthouse score >90)

**Effort:** 8-12 engineering days

### GAP-P5: Security Hardening Completion (🟡 MEDIUM)

| Item                                     | Status         | Effort            |
| ---------------------------------------- | -------------- | ----------------- |
| Penetration test (third-party)           | ❌ NOT DONE    | 5 days (external) |
| Rate limiting persistence (Redis)        | ❌ NOT DONE    | 1 day             |
| Rate limiting state survives restart     | ❌ NOT DONE    | Included above    |
| Password reset URL origin fix            | ⚠️ NEEDS DONE  | 0.5 day           |
| Install service fragile paths            | ⚠️ NEEDS DONE  | 0.5 day           |
| `as any` casts reduction (40+ instances) | ⚠️ IN PROGRESS | 3 days            |
| Security.txt verification                | ❌ NOT DONE    | 0.5 day           |
| CSP report-uri endpoint active           | ❌ NOT DONE    | 1 day             |
| SQL injection scan (automated)           | ❌ NOT DONE    | 1 day             |
| Dependency audit (npm audit)             | ❌ NOT DONE    | 0.5 day           |

**Effort:** 6-10 engineering days (including external pentest)

### GAP-P6: Observability & Monitoring (🟡 MEDIUM)

| Item                                   | Status      | Effort  |
| -------------------------------------- | ----------- | ------- |
| Structured JSON logging (Pino)         | ✅ DONE     | -       |
| Request correlation IDs                | ⚠️ PARTIAL  | 0.5 day |
| Prometheus metrics endpoint `/metrics` | ❌ NOT DONE | 2 days  |
| Grafana dashboard template             | ❌ NOT DONE | 2 days  |
| OpenTelemetry tracing                  | ❌ NOT DONE | 3 days  |
| Sentry error tracking integration      | ❌ NOT DONE | 1 day   |
| Health check `/healthz` + `/readyz`    | ✅ DONE     | -       |
| Slow query logging (>200ms threshold)  | ❌ NOT DONE | 1 day   |
| Error budget tracking                  | ❌ NOT DONE | 1 day   |

**Effort:** 8-10 engineering days

### GAP-P7: Performance Baseline (🟡 MEDIUM)

| Item                                     | Status            | Effort  |
| ---------------------------------------- | ----------------- | ------- |
| k6 load test script                      | ✅ DONE (PRD4)    | -       |
| k6 run in CI/CD                          | ❌ NOT CONFIGURED | 1 day   |
| Baseline benchmark run                   | ❌ NOT DONE       | 2 days  |
| Performance regression alerting          | ❌ NOT DONE       | 1 day   |
| Bundle size budget enforcement           | ❌ NOT DONE       | 1 day   |
| Lighthouse CI integration                | ❌ NOT DONE       | 1 day   |
| Image optimization pipeline verification | ⚠️ PARTIAL        | 1 day   |
| Redis cache hit ratio target             | ❌ NOT SET        | 0.5 day |

**Effort:** 5-7 engineering days

### GAP-P8: Documentation for End Users (🟡 MEDIUM)

**Current State:** Extensive developer documentation exists (PRDs, contributing guide, API docs). Zero end-user documentation.

**What's needed:**

- **User Guide:** How to install NodePress (Docker), first-time setup, creating content, managing media, configuring settings
- **Admin Manual:** Every admin panel page documented with screenshots, step-by-step instructions
- **Plugin Guide:** How to install, activate, configure each of the 13 official plugins
- **Troubleshooting Guide:** Common issues, log locations, support channels
- **Migration Guide:** Step-by-step WordPress → NodePress migration with screenshots
- **FAQ:** Common questions for both developers and content editors

**Effort:** 5-8 engineering days (including technical writing)

---

## 4. Implementation Plan — DETAILED

### Phase 0: Foundation (Week 1) — Plugin Persistence + Testing

**Goal:** Remove the two BLOCKER gaps. Without these, nothing else matters.

#### Sprint 0.1: Plugin Data Persistence (Days 1-6)

| Day | Task                                | Detail                                                                              | Owner |
| --- | ----------------------------------- | ----------------------------------------------------------------------------------- | ----- |
| 1   | Extend plugin-sdk `PluginContext`   | Add `db` access property + `getStore(namespace)` method                             | Core  |
| 1   | Create `plugin_data` database table | Migration: `{pluginId, namespace, key, value Json, createdAt, updatedAt}`           | Core  |
| 2   | Create `PluginStore` class          | CRUD operations backed by plugin_data table. Auto-scoped to pluginId.               | Core  |
| 2   | Create migration helper             | `plugin.registerStore(namespace, defaultData)` — creates store on plugin activation | Core  |
| 3   | Rewrite: SEO plugin                 | Migrate meta settings, sitemap config from memory to store                          | Core  |
| 3   | Rewrite: Cache-Redis plugin         | Migrate cache config, TTL settings to store                                         | Core  |
| 3   | Rewrite: Comments plugin            | Migrate moderation rules, whitelist, Akismet config to store                        | Core  |
| 4   | Rewrite: Analytics plugin           | Migrate tracking config, dashboard preferences to store                             | Core  |
| 4   | Rewrite: Forms plugin               | Migrate form definitions, submissions to store                                      | Core  |
| 4   | Rewrite: Security plugin            | Migrate firewall rules, login lockdown, audit config to store                       | Core  |
| 5   | Rewrite: Social-Sharing plugin      | Migrate network config, share count cache to store                                  | Core  |
| 5   | Rewrite: Backup plugin              | Migrate schedules, storage config, backup history to store                          | Core  |
| 5   | Rewrite: Newsletter plugin          | Migrate subscriber lists, campaign templates to store                               | Core  |
| 6   | Rewrite: Redirection plugin         | Migrate redirect rules, 404 log to store                                            | Core  |
| 6   | Rewrite: Performance plugin         | Migrate cache rules, CDN config, minification settings to store                     | Core  |
| 6   | Rewrite: Multilingual plugin        | Migrate language settings, translation memory to store                              | Core  |
| 6   | Rewrite: File-Editor plugin         | Migrate file backup history, editor preferences to store                            | Core  |
| 6   | Integration test                    | All 13 plugins: activate → set data → restart → verify data persists                | Core  |

**Deliverable:** Plugin data survives restart. Zero data loss. ✅

#### Sprint 0.2: Testing Foundation (Days 4-8, parallel with 0.1)

| Day | Task                  | Detail                                                                | Owner  |
| --- | --------------------- | --------------------------------------------------------------------- | ------ |
| 4   | Auth module tests     | Login, register, refresh, changePassword, 2FA — 15 tests              | API    |
| 5   | Content module tests  | CRUD, revisions, search, status transitions — 20 tests                | API    |
| 5   | Users module tests    | Create, read, update, delete, role assignment — 10 tests              | API    |
| 6   | Media module tests    | Upload, delete, image processing, gallery — 10 tests                  | API    |
| 6   | Comments module tests | Create, approve, spam, trash, thread — 10 tests                       | API    |
| 7   | Settings module tests | CRUD, validation, type coercion — 8 tests                             | API    |
| 7   | GraphQL tests         | Content queries, mutations, auth — 12 tests                           | API    |
| 7   | Admin component tests | Dashboard, content list, media grid — 10 tests                        | Admin  |
| 8   | E2E test setup        | Playwright: login → create post → publish → verify frontend — 3 tests | QA     |
| 8   | Test CI pipeline      | Verify `pnpm test` passes, coverage threshold at 50% (interim)        | DevOps |

**Deliverable:** 100+ tests passing in CI. Minimum 50% coverage on critical modules. ✅

### Phase 1: Admin & UX (Weeks 2-3)

| Week | Task                  | Detail                                                                           | Effort | Owner     |
| ---- | --------------------- | -------------------------------------------------------------------------------- | ------ | --------- |
| W2   | Install Wizard        | Step-by-step setup: DB test → admin user → site config → plugins → themes → done | 5 days | Admin     |
| W2   | Forgot Password Flow  | Frontend page + backend endpoint + email template                                | 3 days | API+Admin |
| W2   | Bulk Actions Backend  | POST /content/bulk endpoint + BullMQ job queue for large batches                 | 3 days | API       |
| W3   | Bulk Actions Frontend | Progress indicator, success/error summary, confirmation dialog                   | 2 days | Admin     |
| W3   | Notifications System  | Backend model + API + frontend bell icon with dropdown                           | 4 days | API+Admin |
| W3   | Empty States          | Illustrated empty states + quick-start wizard for first-time users               | 3 days | Admin     |
| W3   | Admin Polish          | Wire remaining TODO handlers, remove debug artifacts, fix version display        | 2 days | Admin     |

**Deliverable:** Admin panel is fully functional. Install wizard guides new users. ✅

### Phase 2: Production Hardening (Weeks 3-4)

| Week | Task                           | Detail                                                                | Effort  | Owner  |
| ---- | ------------------------------ | --------------------------------------------------------------------- | ------- | ------ |
| W3   | Production Docker verification | Boot full stack, test all services, fix issues                        | 4 days  | DevOps |
| W3   | Rate limiting → Redis          | Move rate limit state from in-memory Map to Redis                     | 1 day   | API    |
| W4   | Password reset URL fix         | Add dynamic origin from request context                               | 0.5 day | API    |
| W4   | Rate-limit persistence         | All rate limit counters survive restart via Redis                     | 1 day   | API    |
| W4   | CSP report-uri endpoint        | Create CSP violation reporting endpoint                               | 1 day   | API    |
| W4   | Observability: metrics         | Prometheus `/metrics` endpoint with request rate, error rate, latency | 2 days  | API    |
| W4   | Observability: logging         | Correlation IDs on all log entries                                    | 1 day   | API    |
| W4   | Dependency audit               | npm audit, fix critical/high vulnerabilities                          | 1 day   | DevOps |

**Deliverable:** Production stack verified end-to-end. Monitoring and observability active. ✅

### Phase 3: Content & Themes (Weeks 4-5)

| Week | Task                            | Detail                                                                                      | Effort | Owner    |
| ---- | ------------------------------- | ------------------------------------------------------------------------------------------- | ------ | -------- |
| W4   | web-starter: template hierarchy | Create all WordPress-equivalent templates (single, archive, taxonomy, search, author, date) | 4 days | Frontend |
| W5   | web-starter: responsive design  | Mobile-first, dark mode, Tailwind polish                                                    | 3 days | Frontend |
| W5   | web-starter: SEO integration    | Meta tags, JSON-LD, sitemap, breadcrumbs, Open Graph                                        | 2 days | Frontend |
| W5   | web-starter: performance        | Lighthouse >90, lazy loading, image optimization                                            | 2 days | Frontend |
| W5   | Theme Customizer admin UI       | Basic live preview panel, color/setting overrides                                           | 3 days | Admin    |

**Deliverable:** Production-quality public theme. Theme Customizer functional. ✅

### Phase 4: Security & Performance Validation (Weeks 5-6)

| Week | Task                         | Detail                                                         | Effort | Owner        |
| ---- | ---------------------------- | -------------------------------------------------------------- | ------ | ------------ |
| W5   | Third-party penetration test | Engage security firm or use OWASP ZAP automated scan           | 5 days | External     |
| W5   | SAST scan                    | Run Semgrep/CodeQL across entire codebase, fix findings        | 2 days | Security     |
| W5   | `as any` reduction           | Replace 40+ `as any` casts with proper types                   | 3 days | API          |
| W6   | Fix remaining cast issues    | Complete any remaining type safety improvements                | 2 days | API          |
| W6   | Performance baseline         | Run k6 load tests, document results, set regression thresholds | 2 days | DevOps       |
| W6   | CI/CD integration            | k6 regression alerting, Lighthouse CI, bundle size checks      | 2 days | DevOps       |
| W6   | Penetration test fixes       | Address findings from pentest                                  | 2 days | API+Security |

**Deliverable:** Security validated. Performance baselined. CI/CD gates active. ✅

### Phase 5: Documentation & Release (Week 6-7)

| Week | Task                      | Detail                                                     | Effort | Owner    |
| ---- | ------------------------- | ---------------------------------------------------------- | ------ | -------- |
| W6   | End-user documentation    | Installation guide, admin manual, plugin guide, FAQ        | 5 days | Docs     |
| W6   | API documentation review  | Ensure all endpoints documented in Swagger                 | 2 days | API      |
| W6   | Video tutorials           | Screen recordings of key workflows                         | 2 days | Docs     |
| W7   | WordPress migration guide | Step-by-step with screenshots, common pitfalls             | 2 days | Docs     |
| W7   | Release preparation       | Version bump, changelog, release notes, announcement draft | 2 days | PM       |
| W7   | Release candidate testing | Full E2E test pass on staging environment                  | 2 days | QA       |
| W7   | Bug fixes from RC         | Address any issues found in RC testing                     | 3 days | All      |
| W7   | Final security review     | Verify all security gates pass                             | 1 day  | Security |

**Deliverable:** Complete documentation. Release candidate ready. ✅

---

## 5. Resource Requirements

### Team Composition

| Role                     | Headcount | Weeks Needed        | Focus                                               |
| ------------------------ | --------- | ------------------- | --------------------------------------------------- |
| Senior Backend Engineer  | 2         | 7 weeks             | Plugin persistence, API hardening, testing          |
| Senior Frontend Engineer | 1         | 5 weeks             | Admin polish, web-starter theme, install wizard     |
| DevOps Engineer          | 1         | 3 weeks (part-time) | Docker verification, CI/CD, monitoring              |
| Security Engineer        | 1         | 2 weeks (part-time) | Penetration test, SAST, security review             |
| Technical Writer         | 1         | 2 weeks             | End-user docs, migration guide                      |
| QA Engineer              | 1         | 3 weeks (part-time) | E2E tests, RC testing, regression                   |
| Project Manager          | 1         | 7 weeks (part-time) | Coordination, milestone tracking, stakeholder comms |

**Total Engineering Hours:** ~600-700 hours  
**Total Calendar Time:** 7 weeks  
**Recommended Team Size:** 3-4 full-time + part-time specialists

### Budget Estimate

| Category         | Item                              | Estimated Cost       |
| ---------------- | --------------------------------- | -------------------- |
| Engineering      | 3 FTE × 7 weeks × $X/hr           | Internal             |
| Penetration Test | Third-party security audit        | $5,000-15,000        |
| Infrastructure   | Staging environment (2 months)    | $500-1,000           |
| Monitoring       | Grafana Cloud / Sentry (2 months) | $200-500             |
| CDN Testing      | Cloudflare/Fastly trial accounts  | Free tier sufficient |

---

## 6. Milestone Tracker

| Milestone                  | Target Date | Deliverable                                                                    | Gate                                                             |
| -------------------------- | ----------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| **M0: Plugin Persistence** | Week 1 end  | All 13 plugins persist data via Prisma. Zero data loss on restart.             | Integration test: activate → set data → restart → verify         |
| **M1: Testing Baseline**   | Week 1-2    | 100+ tests passing in CI. Auth, content, users, media covered.                 | `pnpm test` passes. Coverage >50% on critical modules            |
| **M2: Admin Complete**     | Week 3 end  | Install wizard, forgot password, bulk actions, notifications all functional    | Manual E2E: new user → install → login → create content → manage |
| **M3: Production Stack**   | Week 4 end  | Docker Compose production verified. Monitoring active. Rate limiting persists. | `docker compose -f docker-compose.prod.yml up` succeeds          |
| **M4: Public Theme**       | Week 5 end  | web-starter has full template hierarchy. Lighthouse >90. SEO integrated.       | Lighthouse score verified. All template routes 200               |
| **M5: Security Validated** | Week 6 end  | Penetration test passed. SAST scan clean. `as any` count <10.                  | Pentest report. Semgrep/CodeQL pass                              |
| **M6: Documentation**      | Week 7 end  | User guide, admin manual, migration guide published.                           | All docs reviewed and approved                                   |
| **M7: v1.0-beta Release**  | Week 7 end  | Release candidate published. Changelog. Announcement ready.                    | All M0-M6 gates passed. Stakeholder sign-off                     |

---

## 7. Risk Register

| Risk ID | Risk                                                               | Likelihood | Impact | Mitigation                                                               | Contingency                                         |
| ------- | ------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------ | --------------------------------------------------- |
| R-01    | Plugin persistence rewrite breaks plugin API compatibility         | HIGH       | HIGH   | Keep in-memory fallback for 1 release cycle. Deprecation warnings.       | Rollback to PRD5 plugin version                     |
| R-02    | Penetration test finds critical vulnerabilities                    | MEDIUM     | HIGH   | Run SAST scan BEFORE pentest to reduce findings.                         | Allocate 1 week buffer for fixes                    |
| R-03    | Docker production stack has unresolved issues                      | MEDIUM     | HIGH   | Start Docker verification early (Week 3).                                | Have Docker expert on standby                       |
| R-04    | Test suite reveals fundamental bugs requiring architecture changes | LOW        | HIGH   | Start testing early (Week 1-2).                                          | Allocate 2 weeks buffer in schedule                 |
| R-05    | Team capacity insufficient for 7-week timeline                     | MEDIUM     | MEDIUM | Parallelize Phase 0 (Plugin persistence + Testing).                      | Reduce scope: defer multilingual plugin persistence |
| R-06    | Documentation takes longer than estimated                          | MEDIUM     | LOW    | Start documentation in Week 5, not Week 6.                               | Defer video tutorials to post-v1.0                  |
| R-07    | Install wizard scope creep                                         | MEDIUM     | LOW    | Strictly limit to 5 screens. Defer advanced features (SSO, multi-tenant) | Cut advanced settings to "use config file" note     |

---

## 8. Definition of Done — Production Ready Checklist

### Critical Gates (Must Pass BEFORE v1.0-beta Release)

- [ ] **GATE-1:** All 13 plugins persist data. Plugin data survives 3 consecutive restarts. Verified by automated test.
- [ ] **GATE-2:** Test suite has ≥100 tests. Coverage on `apps/api` ≥60%. `pnpm test` passes on CI.
- [ ] **GATE-3:** Admin install wizard works end-to-end. New user can install NodePress without CLI.
- [ ] **GATE-4:** Admin panel has no broken functionality. All buttons work. No TODO in production code.
- [ ] **GATE-5:** Docker Compose production stack boots on a clean VM. `docker compose -f docker-compose.prod.yml up -d` succeeds.
- [ ] **GATE-6:** Production health endpoints (`/healthz`, `/readyz`) return healthy.
- [ ] **GATE-7:** Security scan (Semgrep/CodeQL) passes with 0 critical findings.
- [ ] **GATE-8:** npm audit shows 0 critical vulnerabilities.
- [ ] **GATE-9:** Rate limiting persists across process restart (Redis-backed).
- [ ] **GATE-10:** All environment variables documented in `.env.example` with descriptions.

### High Gates (Should Pass)

- [ ] **GATE-11:** Pentest completed. All HIGH findings fixed.
- [ ] **GATE-12:** k6 load test baseline established. 1000 concurrent read req/s without errors.
- [ ] **GATE-13:** Prometheus `/metrics` endpoint returns valid metrics.
- [ ] **GATE-14:** Lighthouse score ≥90 for web-starter public theme.
- [ ] **GATE-15:** End-user documentation published (install guide, admin manual, plugin guide).

### Nice-to-Have Gates (Defer if needed)

- [ ] **GATE-16:** OpenTelemetry tracing live.
- [ ] **GATE-17:** Sentry error tracking integrated.
- [ ] **GATE-18:** Grafana dashboard template published.
- [ ] **GATE-19:** Video tutorials published.
- [ ] **GATE-20:** CDN multi-provider (Fastly/Akamai) integration.

---

## 9. Post-v1.0-beta Roadmap

After v1.0-beta, the following are planned for subsequent releases:

| Version | Focus              | Items                                                                     |
| ------- | ------------------ | ------------------------------------------------------------------------- |
| v1.0 GA | Polish & stability | Bug fixes from beta feedback. Performance tuning. Plugin marketplace UI.  |
| v1.1    | Collaboration      | Content locking. Internal review notes. Activity log dashboard.           |
| v1.2    | E-commerce         | WooCommerce-migration tool. Basic product types. Stripe integration.      |
| v1.3    | Enterprise         | Multisite/network admin. SSO/SAML. Audit log export. RBAC improvements.   |
| v2.0    | Scale              | Multi-region. Read replicas. Horizontal partitioning. CDN multi-provider. |

---

## 10. Appendix: Quick-Reference Checklist

### Weekly Progress Tracker

```
Week 1:  ████████░░ Plugin Persistence + Testing Foundation
Week 2:  ████████░░ Install Wizard + Forgot Password + Bulk Actions
Week 3:  ████████░░ Notifications + Production Stack Verification
Week 4:  ████████░░ Observability + Rate Limiting + web-starter
Week 5:  ████████░░ Theme Customizer + Security Audit + Performance
Week 6:  ████████░░ Penetration Test + Documentation
Week 7:  ████████░░ Release Prep + RC Testing + Launch
```

### Files Requiring Changes

| #   | File                                                        | Change Type                            | Phase |
| --- | ----------------------------------------------------------- | -------------------------------------- | ----- |
| 1   | `packages/plugin-sdk/src/index.ts`                          | Add Prisma to PluginContext            | P0    |
| 2   | `packages/plugin-sdk/src/storage.ts`                        | Create PluginStore with Prisma backend | P0    |
| 3   | `packages/db/prisma/schema.prisma`                          | Add `plugin_data` model                | P0    |
| 4   | `plugins/*/index.ts` (×13)                                  | Migrate in-memory → PluginStore        | P0    |
| 5   | `apps/api/src/**/*.test.ts` (×60+)                          | Create comprehensive tests             | P0    |
| 6   | `apps/admin/src/app/install/page.tsx`                       | Create install wizard                  | P1    |
| 7   | `apps/admin/src/app/(admin)/login/forgot-password/page.tsx` | Create forgot password page            | P1    |
| 8   | `apps/api/src/auth/forgot-password.controller.ts`           | Create forgot password endpoint        | P1    |
| 9   | `apps/api/src/content/bulk.controller.ts`                   | Create bulk operations endpoint        | P1    |
| 10  | `apps/admin/src/components/content/bulk-actions.tsx`        | Wire to real backend                   | P1    |
| 11  | `apps/admin/src/components/layout/admin-bar.tsx`            | Wire notification bell                 | P1    |
| 12  | `apps/api/src/notifications/`                               | Create notifications module            | P1    |
| 13  | `docker-compose.prod.yml`                                   | Verify and fix production stack        | P2    |
| 14  | `apps/api/src/common/rate-limit-detail.service.ts`          | Redis backend                          | P2    |
| 15  | `apps/api/src/monitoring/`                                  | Prometheus metrics                     | P2    |
| 16  | `apps/web-starter/src/app/**/*.tsx`                         | Full template hierarchy                | P3    |
| 17  | `packages/core/src/theme/theme-customizer.ts`               | Admin UI integration                   | P3    |
| 18  | `.github/workflows/`                                        | CI/CD gates                            | P4    |
| 19  | `docs/*.md`                                                 | End-user documentation                 | P5    |
| 20  | `CHANGELOG.md`                                              | Release notes                          | P5    |

---

## 11. Final Verdict

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   NODEPRESS — PRODUCTION READINESS ASSESSMENT                    ║
║                                                                  ║
║   Current Readiness:   7/10  (Active Development)                ║
║   Target Readiness:    9.5/10 (v1.0-beta)                        ║
║                                                                  ║
║   BLOCKERS (Must Fix Before Any User Can Use):                    ║
║   ┌─────────────────────────────────────────────────────────┐    ║
║   │ 1. Plugin data persistence (all 13 plugins lose data)   │    ║
║   │ 2. Testing coverage (~5 files vs 100+ target)           │    ║
║   │ 3. Install wizard (route is empty)                      │    ║
║   │ 4. Production deployment never tested                   │    ║
║   └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║   Timeline to Production Ready: 7 weeks                          ║
║   Team Required: 3-4 engineers + part-time specialists           ║
║   Total Effort: 85-100 engineering days                          ║
║                                                                  ║
║   CAN USERS USE IT NOW?  →  ❌ NO                                ║
║   CAN DEVELOPERS TRY IT?  →  ✅ YES (via Docker)                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

_End of PRD v7 — July 4, 2026. This document represents the production readiness roadmap for NodePress v1.0-beta._
