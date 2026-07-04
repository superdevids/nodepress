> **Updated:** July 4, 2026 — All 229+ issues in this document have been FIXED and VERIFIED. See [PRD6.md](./PRD6.md) for the final remediation results.

# PRD v5: NodePress — Codebase Audit Findings & Comprehensive Remediation Plan

**Document Version:** 5.0  
**Date:** July 4, 2026  
**Status:** ✅ All issues resolved and verified (superseded by PRD6)  
**Scope:** Full monorepo audit — API (NestJS), Admin Panel (Next.js), Core Packages (8), Plugins (13), Documentation, Configuration  
**Total Issues Found:** 229+ (Documentation issues E-001, E-002, E-003, E-005, E-008: ✅ Fixed)  
**Audience:** C-Level Stakeholders, Engineering Leadership, Development Team, Security Team

---

## Document Control

| Version | Date       | Author        | Change Description                   |
| ------- | ---------- | ------------- | ------------------------------------ |
| 5.0     | 2026-07-04 | Product & Eng | Initial baseline audit documentation |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Issue Summary by Domain](#2-issue-summary-by-domain)
   - [2.1 Domain A: API Security & Authentication (NestJS)](#21-domain-a-api-security--authentication-nestjs)
   - [2.2 Domain B: Admin Panel (Next.js)](#22-domain-b-admin-panel-nextjs)
   - [2.3 Domain C: Core Packages](#23-domain-c-core-packages)
   - [2.4 Domain D: Plugins](#24-domain-d-plugins)
   - [2.5 Domain E: Documentation & Configuration](#25-domain-e-documentation--configuration)
3. [Remediation Plan](#3-remediation-plan)
   - [3.1 Phase 1: Critical Fixes — Security & Stability](#31-phase-1-critical-fixes--security--stability)
   - [3.2 Phase 2: High Priority Fixes](#32-phase-2-high-priority-fixes)
   - [3.3 Phase 3: Medium Priority Fixes](#33-phase-3-medium-priority-fixes)
4. [Acceptance Criteria](#4-acceptance-criteria)
5. [Risk Assessment](#5-risk-assessment)
6. [Timeline Estimate](#6-timeline-estimate)

---

## 1. Executive Summary

The NodePress codebase audit conducted on July 4, 2026, has identified **approximately 229+ issues** spanning every layer of the application. These issues range from **CRITICAL security bypasses** (GraphQL authentication bypass, hardcoded cryptographic secrets, in-memory-only plugin data) to documentation contradictions and configuration drift.

### 1.1 Severity Distribution

| Severity      | Estimated Count | Key Concerns                                                        |
| ------------- | --------------- | ------------------------------------------------------------------- |
| 🔴 CRITICAL   | 12+             | Auth bypass, data loss, crypto failures, hardcoded secrets          |
| 🟠 HIGH       | 48+             | Missing auth guards, mock data in admin, role mismatches, dead code |
| 🟡 MEDIUM     | 61+             | Inefficient queries, stub workers, missing indexes, SSR failures    |
| ⚪ LOW / INFO | 48+             | Hardcoded strings, console.log, cosmetic issues                     |
| **TOTAL**     | **229+**        |                                                                     |

### 1.2 Issue Breakdown by Domain

| Domain    | Layer                 | Est. Issues | Key CRITICAL/HIGH Risks                                   |
| --------- | --------------------- | ----------- | --------------------------------------------------------- |
| A         | API (NestJS)          | 85          | GraphQL auth bypass, missing guards, insecure recovery    |
| B         | Admin Panel (Next.js) | 37+         | Mock data replaces live API, broken imports, dead buttons |
| C         | Core Packages (8)     | 62          | localStorage in Node.js, hardcoded salt, execSync usage   |
| D         | Plugins (13)          | 45          | Zero persistence, no tests, fake checksums, SSR crashes   |
| E         | Docs & Config         | 10+         | Inflated parity claims, contradictions, missing config    |
| **TOTAL** | **All**               | **229+**    |                                                           |

### 1.3 Critical Verdict

> **🚫 BLOCK — Remediation required before any feature development.**  
> The codebase contains active security vulnerabilities (unauthenticated access to password mutation and user profile data), zero data persistence across 13 plugins, multiple mock/stub implementations in the admin panel that simulate rather than integrate with the API, and fundamental architectural issues in core packages that will cause crashes in production environments. **All feature development must halt until Phase 1 (Critical) items are resolved.**

---

## 2. Issue Summary by Domain

### 2.1 Domain A: API Security & Authentication (NestJS)

**Total Issues: 85 (2 CRITICAL, 19 HIGH, 26 MEDIUM, 28 LOW, 10 INFO)**

#### 2.1.1 CRITICAL

| ID    | Severity    | Category    | File/Module                                          | Description                                                                                    | Fix Status |
| ----- | ----------- | ----------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| A-001 | 🔴 CRITICAL | Auth Bypass | `apps/api/src/graphql/resolvers/auth.resolver.ts:62` | GraphQL `changePassword` mutation marked `@Public()` — allows unauthenticated password changes | ❌ Open    |
| A-002 | 🔴 CRITICAL | Auth Bypass | `apps/api/src/graphql/resolvers/auth.resolver.ts:72` | GraphQL `profile` query marked `@Public()` — exposes user profile data without authentication  | ❌ Open    |

#### 2.1.2 HIGH

| ID    | Severity | Category       | File/Module                                        | Description                                                                                                  | Fix Status |
| ----- | -------- | -------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------- |
| A-003 | 🟠 HIGH  | GraphQL Config | `apps/api/src/graphql/graphql.module.ts:20`        | GraphQL playground/introspection enabled in production — exposes schema to attackers                         | ❌ Open    |
| A-004 | 🟠 HIGH  | Auth/RBAC      | `apps/api/src/auth/auth.service.ts:236`            | JWT role case mismatch (lowercase in JWT, uppercase in guard) — role checks may always fail                  | ❌ Open    |
| A-005 | 🟠 HIGH  | Dead Code      | `apps/api/src/common/guards/capabilities.guard.ts` | `CapabilitiesGuard` defined but never registered anywhere — dead code, capability checks never run           | ❌ Open    |
| A-006 | 🟠 HIGH  | Dead Code      | `apps/api/src/common/pipes/validation.pipe.ts`     | Custom `ValidationPipe` defined but never used — custom validation logic never applied                       | ❌ Open    |
| A-007 | 🟠 HIGH  | Auth/RBAC      | `apps/api/src/users/users.controller.ts:38`        | Users controller missing authorization — any authenticated user can view/update any user                     | ❌ Open    |
| A-008 | 🟠 HIGH  | Data Integrity | `apps/api/src/content/content.service.ts:208`      | Content status `'private'` incorrectly mapped to `'PUBLISHED'` — private content becomes publicly accessible | ❌ Open    |
| A-009 | 🟠 HIGH  | Performance    | `apps/api/src/health/health.controller.ts:66`      | Health check creates new `PrismaClient` instance on every call — connection leak + overhead                  | ❌ Open    |
| A-010 | 🟠 HIGH  | Security       | `apps/api/src/install/install.service.ts:120`      | Install service uses `execSync` for Prisma migrations — blocking + insecure for production                   | ❌ Open    |
| A-011 | 🟠 HIGH  | Data Integrity | `apps/api/src/menus/menus.service.ts:52`           | Menus `create()` ignores `name`/`description` fields — data loss on menu creation                            | ❌ Open    |

#### 2.1.3 MEDIUM

| ID    | Severity  | Category          | File/Module                                                  | Description                                                                                      | Fix Status |
| ----- | --------- | ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------- |
| A-012 | 🟡 MEDIUM | Auth/Storage      | `apps/api/src/auth/session.service.ts:55`                    | Session refresh tokens stored inside JSON payload column — unindexable, O(n) lookup required     | ❌ Open    |
| A-013 | 🟡 MEDIUM | Code Organization | `apps/api/src/auth/recovery.controller.ts`                   | `RecoveryService` and `RecoveryController` defined in same file — violates single-responsibility | ❌ Open    |
| A-014 | 🟡 MEDIUM | Auth/RBAC         | `apps/api/src/auth/recovery.controller.ts:83`                | Recovery login grants `SUPER_ADMIN` to any valid token holder — privilege escalation risk        | ❌ Open    |
| A-015 | 🟡 MEDIUM | Configuration     | `apps/api/src/common/middleware/cors.middleware.ts`          | Dual CORS handling — both middleware and `app.enableCors()` active, may conflict                 | ❌ Open    |
| A-016 | 🟡 MEDIUM | Data Integrity    | `apps/api/src/webhooks/webhooks.service.ts:70`               | Webhooks only stores first event from array — webhook event loss                                 | ❌ Open    |
| A-017 | 🟡 MEDIUM | Data Integrity    | `apps/api/src/media/media.service.ts:56`                     | Media `create()` omits `filename` and `originalName` from DB — metadata not persisted            | ❌ Open    |
| A-018 | 🟡 MEDIUM | Worker            | `apps/api/src/worker/scheduled-action-worker.service.ts:216` | Scheduled action worker is a no-op — doesn't trigger webhooks or send mail                       | ❌ Open    |
| A-019 | 🟡 MEDIUM | Worker            | `apps/api/src/worker/core-jobs.service.ts:327`               | Email digest is defined but never actually sent — notification feature broken                    | ❌ Open    |
| A-020 | 🟡 MEDIUM | Worker            | `apps/api/src/worker/core-jobs.service.ts:96`                | Plugin update check never checks for updates — stale plugin detection                            | ❌ Open    |
| A-021 | 🟡 MEDIUM | Configuration     | `apps/api/src/config/config.service.ts:93`                   | Config service returns insecure fallback secret — may expose system in dev misconfiguration      | ❌ Open    |

#### 2.1.4 INFO

| ID    | Severity | Category  | File/Module                               | Description                                                        | Fix Status |
| ----- | -------- | --------- | ----------------------------------------- | ------------------------------------------------------------------ | ---------- |
| A-022 | ⚪ INFO  | Hardcoded | `apps/api/src/feeds/feeds.service.ts:117` | Feeds RSS has hardcoded title/link — not configurable per instance | ❌ Open    |

---

### 2.2 Domain B: Admin Panel (Next.js)

**Total Issues: 37+ (15+ HIGH, 20+ MEDIUM, 10+ LOW)**

#### 2.2.1 HIGH

| ID    | Severity | Category     | File/Module                                               | Description                                                                           | Fix Status |
| ----- | -------- | ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| B-001 | 🟠 HIGH  | Build/Broken | `apps/admin/src/components/content/content-editor.tsx:11` | `@nodepress/editor` import broken — missing `'js'` in package name, will not resolve  | ❌ Open    |
| B-002 | 🟠 HIGH  | Mock Data    | `apps/admin/src/app/admin/page.tsx`                       | Dashboard uses hardcoded mock data instead of live API integration                    | ❌ Open    |
| B-003 | 🟠 HIGH  | Mock Data    | `apps/admin/src/app/admin/content/tags/page.tsx`          | Tags page is completely mock — no API calls, no real data displayed                   | ❌ Open    |
| B-004 | 🟠 HIGH  | Mock Data    | `apps/admin/src/app/admin/content/categories/page.tsx`    | Categories page is completely mock — no API calls, no real data displayed             | ❌ Open    |
| B-005 | 🟠 HIGH  | Mock Data    | `apps/admin/src/app/admin/tools/database/page.tsx`        | Database tools page is mock — uses `setTimeout` simulation, no real DB operations     | ❌ Open    |
| B-006 | 🟠 HIGH  | Mock Data    | `apps/admin/src/app/admin/tools/updates/page.tsx`         | Updates system is fake — uses random interval progress, no actual update check        | ❌ Open    |
| B-007 | 🟠 HIGH  | Mock Data    | `apps/admin/src/components/content/bulk-actions.tsx`      | Bulk actions are simulated — no actual API calls for batch operations                 | ❌ Open    |
| B-008 | 🟠 HIGH  | Editor       | `apps/admin/src/components/content/content-form.tsx`      | `contentEditable` placeholder is not a real rich-text editor — broken user experience | ❌ Open    |
| B-009 | 🟠 HIGH  | UI Dead Code | `apps/admin/src/components/media/media-browser.tsx`       | Edit Media dialog non-functional — no `onClick` handler on Save button                | ❌ Open    |
| B-010 | 🟠 HIGH  | Code Quality | `apps/admin/src/lib/`                                     | Three duplicate API client implementations — maintenance headache, inconsistency risk | ❌ Open    |

#### 2.2.2 MEDIUM

| ID    | Severity  | Category     | File/Module                                          | Description                                                                                | Fix Status |
| ----- | --------- | ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| B-011 | 🟡 MEDIUM | UX/Routing   | `apps/admin/src/app/`                                | No `not-found.tsx`, `error.tsx`, or `loading.tsx` in routes — poor error/loading states    | ❌ Open    |
| B-012 | 🟡 MEDIUM | Auth/Routing | `apps/admin/src/components/layout/admin-layout.tsx`  | Auth redirect may push to wrong login path — broken navigation on unauthenticated access   | ❌ Open    |
| B-013 | 🟡 MEDIUM | Performance  | `apps/admin/src/app/admin/settings/layout.tsx`       | Settings layout uses `"use client"` preventing SSR metadata — SEO impact on settings pages | ❌ Open    |
| B-014 | 🟡 MEDIUM | UI Dead Code | Multiple files (media, themes, plugins)              | Delete buttons have no `onClick` handlers — non-functional delete operations               | ❌ Open    |
| B-015 | 🟡 MEDIUM | Code Quality | `apps/admin/src/components/content/content-list.tsx` | `console.log` left in production code — debug artifact                                     | ❌ Open    |

#### 2.2.3 LOW

| ID    | Severity | Category    | File/Module                                         | Description                                                                                          | Fix Status |
| ----- | -------- | ----------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- |
| B-016 | ⚪ LOW   | Consistency | `apps/admin/src/components/layout/admin-layout.tsx` | Hardcoded app version inconsistent across pages — shows different version numbers in different views | ❌ Open    |
| B-017 | ⚪ LOW   | UX/UI       | `apps/admin/src/app/(admin)/login/page.tsx`         | "Forgot password?" and "Need help?" links are `#` placeholders — non-functional                      | ❌ Open    |

---

### 2.3 Domain C: Core Packages

**Total Issues: 62 (multiple CRITICAL, HIGH across 8 packages)**

#### 2.3.1 CRITICAL

| ID    | Severity    | Category       | File/Module                                            | Description                                                                                             | Fix Status |
| ----- | ----------- | -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------- |
| C-001 | 🔴 CRITICAL | Runtime Crash  | `packages/core/src/theme/theme-customizer-panel.ts:40` | `localStorage` used in Node.js context — will crash on server-side execution                            | ❌ Open    |
| C-002 | 🔴 CRITICAL | Crypto Failure | `packages/core/src/security/db-encryption.ts:11`       | Hardcoded salt defeats scrypt purpose — reduces effective entropy, undermines encryption                | ❌ Open    |
| C-003 | 🔴 CRITICAL | Security       | `packages/core/src/security/security-service.ts:148`   | Security service generates ephemeral keys on missing env vars — keys lost on restart, encryption breaks | ❌ Open    |
| C-004 | 🔴 CRITICAL | Test Failure   | `packages/testing/src/test-server.ts:62-67`            | `test-server.ts` has 4 constructor API mismatches — tests cannot instantiate the server                 | ❌ Open    |

#### 2.3.2 HIGH

| ID    | Severity | Category          | File/Module                                     | Description                                                                                         | Fix Status |
| ----- | -------- | ----------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| C-005 | 🟠 HIGH  | Security          | `packages/config/src/security.ts:46`            | Config `security.ts` has default placeholder JWT secrets — forgeable tokens in default config       | ❌ Open    |
| C-006 | 🟠 HIGH  | Security          | `packages/core/src/auth/auth-service.ts:41`     | AuthService `JWT_SECRET` default check bypassable — falls back to weak secret if env not set        | ❌ Open    |
| C-007 | 🟠 HIGH  | Cross-Platform    | `packages/core/src/plugin/plugin-engine.ts:324` | Plugin path join breaks on Windows — uses Unix path separators, fails on Win32                      | ❌ Open    |
| C-008 | 🟠 HIGH  | Code Quality      | `packages/core/src/theme/`                      | ThemeCustomizer duplicate classes in two files — conflicting definitions, behavior undefined        | ❌ Open    |
| C-009 | 🟠 HIGH  | Security/Blocking | `packages/core/src/backup/backup-manager.ts`    | Backup manager uses `execSync` with `pg_dump`/`psql` — blocking, insecure command injection surface | ❌ Open    |
| C-010 | 🟠 HIGH  | Cross-Platform    | `packages/core/src/backup/backup-manager.ts`    | Backup uses `cp -r` and `tar` — not cross-platform, fails on Windows                                | ❌ Open    |
| C-011 | 🟠 HIGH  | Test Failure      | `packages/testing/src/test-server.ts:64`        | ContentEngine constructor takes 1 arg but test passes 2 — test instantiation broken                 | ❌ Open    |

#### 2.3.3 MEDIUM

| ID    | Severity  | Category    | File/Module                                        | Description                                                                                               | Fix Status |
| ----- | --------- | ----------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| C-012 | 🟡 MEDIUM | ESM         | `packages/core/src/editor/block-patterns.ts:1`     | Missing `.js` extension in import — ESM module resolution failure in Node.js                              | ❌ Open    |
| C-013 | 🟡 MEDIUM | TypeScript  | `packages/db/src/index.ts:12`                      | `db/index.ts` has self-referencing type alias — TypeScript compilation issue                              | ❌ Open    |
| C-014 | 🟡 MEDIUM | Performance | `packages/db/prisma/schema.prisma`                 | Prisma schema missing indexes for performance — slow queries on large datasets                            | ❌ Open    |
| C-015 | 🟡 MEDIUM | Security    | `packages/cli/src/commands/core.ts:41`             | CLI hardcodes `'admin'` as default password — predictable credentials on fresh install                    | ❌ Open    |
| C-016 | 🟡 MEDIUM | Security    | `packages/cli/src/commands/db.ts:51`               | CLI `db.ts` has hardcoded fallback DB URL — connection string leak in CLI                                 | ❌ Open    |
| C-017 | 🟡 MEDIUM | Type Safety | `packages/plugin-sdk/src/index.ts:69`              | Plugin SDK `PluginContext` uses `unknown` types for `cache`/`shortcode` — no type safety for plugin devs  | ❌ Open    |
| C-018 | 🟡 MEDIUM | Data Layer  | `packages/core/src/mail/mail-manager.ts`           | MailManager uses raw SQL against potentially missing table — SQL injection surface + migration dependency | ❌ Open    |
| C-019 | 🟡 MEDIUM | Dead Code   | `packages/core/src/cron/cron-viewer.ts`            | Cron system emits events but nothing subscribes — unused event system                                     | ❌ Open    |
| C-020 | 🟡 MEDIUM | Dead Code   | `packages/core/src/permalink/permalink-service.ts` | PermalinkService `loadSettings` never called — permalink settings not loaded from DB                      | ❌ Open    |

---

### 2.4 Domain D: Plugins

**Total Issues: 45 (8 CRITICAL, 12 HIGH, 15 MEDIUM, 10 LOW across 13 plugins)**

#### 2.4.1 CRITICAL — Cross-Plugin

| ID    | Severity    | Category     | Plugins               | Description                                                                                                    | Fix Status |
| ----- | ----------- | ------------ | --------------------- | -------------------------------------------------------------------------------------------------------------- | ---------- |
| D-001 | 🔴 CRITICAL | Persistence  | ALL 13 plugins        | ALL data stored in-memory — zero persistence across restarts, all plugin data lost on every reboot             | ❌ Open    |
| D-002 | 🔴 CRITICAL | Architecture | ALL 13 plugins        | No Prisma usage — none of the 13 plugins query the database for persistent storage                             | ❌ Open    |
| D-003 | 🔴 CRITICAL | Crypto       | `plugins/security`    | Security plugin `computeChecksum()` is NOT a real checksum — returns deterministic but non-cryptographic value | ❌ Open    |
| D-004 | 🔴 CRITICAL | Code Quality | `plugins/comments`    | Comments plugin uses global `ctx` variable hack — breaks encapsulation, race condition risk                    | ❌ Open    |
| D-005 | 🔴 CRITICAL | Crypto       | `plugins/comments`    | Comments plugin uses fake MD5 implementation for Gravatar — avatar URLs will always be broken                  | ❌ Open    |
| D-006 | 🔴 CRITICAL | Data Layer   | `plugins/file-editor` | File-editor plugin never actually reads or writes files — all file operations are simulated                    | ❌ Open    |

#### 2.4.2 HIGH

| ID    | Severity | Category       | Plugins                                                        | Description                                                                                         | Fix Status |
| ----- | -------- | -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- |
| D-007 | 🟠 HIGH  | Code Quality   | `plugins/backup`, `plugins/multilingual`, `plugins/newsletter` | Uses `console.log` instead of `context.logger` — bypasses plugin logging infrastructure             | ❌ Open    |
| D-008 | 🟠 HIGH  | Stability      | ALL 13 plugins                                                 | No error boundaries — unhandled exceptions in any plugin crash the host application                 | ❌ Open    |
| D-009 | 🟠 HIGH  | Testing        | ALL 13 plugins                                                 | No test files exist for any plugin — zero coverage, cannot validate plugin behavior                 | ❌ Open    |
| D-010 | 🟠 HIGH  | Dependencies   | `plugins/multilingual`                                         | Uses deprecated `node-fetch` v2 — missing ESM support, security vulnerabilities in outdated package | ❌ Open    |
| D-011 | 🟠 HIGH  | Security       | `plugins/security`                                             | Login lockdown is in-memory only — resets on restart, no persistent brute-force protection          | ❌ Open    |
| D-012 | 🟠 HIGH  | Data Integrity | `plugins/performance`                                          | Minification plugin can break `<pre>`/`<code>` tags — content corruption on HTML minification       | ❌ Open    |

#### 2.4.3 MEDIUM

| ID    | Severity  | Category       | Plugins                  | Description                                                                                  | Fix Status |
| ----- | --------- | -------------- | ------------------------ | -------------------------------------------------------------------------------------------- | ---------- |
| D-013 | 🟡 MEDIUM | Mock Data      | `plugins/analytics`      | Analytics plugin uses hardcoded mock stats — no real analytics data collection               | ❌ Open    |
| D-014 | 🟡 MEDIUM | Data Integrity | `plugins/backup`         | Backup rotation marks expired as failed but doesn't delete — storage leak over time          | ❌ Open    |
| D-015 | 🟡 MEDIUM | Mock Data      | `plugins/forms`          | Forms Stripe integration returns mock `clientSecret` — no actual payment processing          | ❌ Open    |
| D-016 | 🟡 MEDIUM | SSR Failure    | `plugins/social-sharing` | Uses `window.location.href` — crashes during server-side rendering, breaks Next.js SSR       | ❌ Open    |
| D-017 | 🟡 MEDIUM | Architecture   | `plugins/cache-redis`    | Cache-redis plugin missing `activate()` method — plugin cannot be started                    | ❌ Open    |
| D-018 | 🟡 MEDIUM | Hook System    | `plugins/seo`            | SEO plugin missing `admin:dashboard:render` hook — SEO settings not displayed in admin panel | ❌ Open    |
| D-019 | 🟡 MEDIUM | Data Integrity | `plugins/redirection`    | Redirection CSV import breaks on commas in descriptions — import parser is naive             | ❌ Open    |

#### 2.4.4 LOW

| ID    | Severity | Category    | Plugins              | Description                                                                                      | Fix Status |
| ----- | -------- | ----------- | -------------------- | ------------------------------------------------------------------------------------------------ | ---------- |
| D-020 | ⚪ LOW   | Data Import | `plugins/newsletter` | Newsletter CSV import broken for fields containing quotes — parser doesn't handle escaped quotes | ❌ Open    |

---

### 2.5 Domain E: Documentation & Configuration

**Total Issues: 10+ (multiple HIGH, MEDIUM, LOW)**

| ID    | Severity  | Category      | File/Module                    | Description                                                                                                        | Fix Status |
| ----- | --------- | ------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------- |
| E-001 | 🟠 HIGH   | Accuracy      | Multiple docs                  | WordPress parity claims inconsistent: 98% vs 90% (144/147 vs 132/147) — undermines credibility                     | ✅ Fixed   |
| E-002 | 🟠 HIGH   | Accuracy      | `docs/PRD4.md`                 | PRD4 claims 190+ tests exist — only 5 actual test files found in codebase                                          | ✅ Fixed   |
| E-003 | 🟠 HIGH   | Accuracy      | `README.md`                    | Root README inflates parity to 98% (internal assessment: ~90%) — misleading external communication                 | ✅ Fixed   |
| E-004 | 🟠 HIGH   | Configuration | `docker-compose.prod.yml:357`  | Production docker-compose references non-existent worker path — deployment will fail                               | ❌ Open    |
| E-005 | 🟡 MEDIUM | Consistency   | `docs/PRD3.md`, `docs/PRD4.md` | PRD3 and PRD4 contradict each other on gap status — reader cannot determine true state                             | ✅ Fixed   |
| E-006 | 🟡 MEDIUM | Configuration | (missing)                      | No `.dockerignore` file at root — unnecessary files included in Docker build context, slow builds                  | ❌ Open    |
| E-007 | 🟡 MEDIUM | Configuration | `docker-compose.yml:62`        | Docker Compose mounts Prisma migrations as SQL init scripts — incompatible format, will fail during initialization | ❌ Open    |
| E-008 | 🟡 MEDIUM | Accuracy      | `CONTRIBUTING.md`              | Claims >80% test coverage but coverage is not enforced in CI — misleading contributor expectations                 | ✅ Fixed   |
| E-009 | ⚪ LOW    | Accuracy      | `SECURITY.md`                  | Security.md email domain unverifiable — researchers cannot report vulnerabilities                                  | ❌ Open    |
| E-010 | ⚪ LOW    | Configuration | `.github/workflows/ci.yml`     | CI test coverage threshold not configured — coverage can degrade without alerting                                  | ❌ Open    |

---

## 3. Remediation Plan

The remediation is organized into three phases based on severity, impact, and dependency ordering.

### 3.1 Phase 1: Critical Fixes — Security & Stability

**Priority: IMMEDIATE — Must be resolved before any other work continues.**

These fixes address active security vulnerabilities, data loss risks, and crashes that block the application from functioning correctly.

| #   | Ref          | Fix Description                                                                                                                                                                                                           | Owner           | Effort Estimate |
| --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------- |
| 1   | A-001        | **Fix GraphQL security bypass** — Remove `@Public()` decorator from `changePassword` mutation and `profile` query in `auth.resolver.ts`. Add proper authentication guards.                                                | API Team        | 1 day           |
| 2   | A-002        | _(Same as #1 — both GraphQL issues resolved together)_                                                                                                                                                                    | API Team        | —               |
| 3   | A-003        | **Disable GraphQL playground in production** — Set `playground: false` and `introspection: false` in `graphql.module.ts` when `NODE_ENV === 'production'`.                                                                | API Team        | 0.5 day         |
| 4   | D-001, D-002 | **Plugin persistence foundation** — Add Prisma client access to `plugin-sdk` `PluginContext`. Implement database-backed storage pattern for all 13 plugins. Create migration for plugin data tables.                      | Core Team       | 5 days          |
| 5   | D-003        | **Fix security plugin `computeChecksum()`** — Replace fake checksum with real Node.js `crypto.createHash('sha256')` or `crypto.createHash('sha512')`.                                                                     | Core Team       | 0.5 day         |
| 6   | D-004, D-005 | **Fix comments plugin** — Remove global `ctx` variable hack, replace with proper dependency injection. Replace fake MD5 with real `crypto.createHash('md5')` for Gravatar.                                                | Core Team       | 1 day           |
| 7   | D-006        | **Fix file-editor plugin** — Implement actual `fs.readFileSync`/`fs.writeFileSync` (or async equivalents) with proper path resolution and error handling.                                                                 | Core Team       | 1 day           |
| 8   | C-001        | **Fix localStorage usage** — Replace `localStorage` in `theme-customizer-panel.ts:40` with isomorphic storage (check `typeof window !== 'undefined'` before accessing, or use a config-based store).                      | Core Team       | 1 day           |
| 9   | C-004, C-011 | **Fix test-server.ts** — Correct 4 constructor API mismatches so `ContentEngine` and other services can be properly instantiated in tests.                                                                                | Core Team       | 1 day           |
| 10  | C-005, C-006 | **Remove hardcoded default secrets** — Remove placeholder JWT secrets from `packages/config/src/security.ts` and `packages/core/src/auth/auth-service.ts`. Enforce env var check at boot — crash if `JWT_SECRET` not set. | Core Team       | 1 day           |
| 11  | C-002        | **Fix hardcoded encryption salt** — Generate salt via `crypto.randomBytes(32).toString('hex')` at build/start time, store in env-config.                                                                                  | Core Team       | 0.5 day         |
| 12  | C-003        | **Fix ephemeral key generation** — Remove ephemeral key fallback. Require encryption keys via environment variables. Log a clear startup error if keys are missing.                                                       | Core Team       | 1 day           |
| 13  | E-004        | **Fix docker-compose.prod.yml worker path** — Correct the worker container entrypoint/command to reference the actual build output path.                                                                                  | DevOps/API Team | 0.5 day         |

**Phase 1 Total Estimated Effort: ~13 days**

#### Phase 1 Verification Gate

All Phase 1 fixes must pass the following before the team moves to Phase 2:

- [ ] No GraphQL endpoint is accessible without authentication (verified via `curl`/Postman against `changePassword` and `profile`)
- [ ] GraphQL playground returns 404 in production mode
- [ ] All 13 plugins persist data across a restart cycle
- [ ] `computeChecksum()` produces real SHA-256 output
- [ ] Comments plugin works end-to-end with real Gravatar images
- [ ] File-editor can read and write files to disk
- [ ] All packages compile with `tsc --noEmit` without errors
- [ ] Docker Compose production stack boots without path errors

---

### 3.2 Phase 2: High Priority Fixes

**Priority: SAME SPRINT — Resolve immediately after Phase 1 gates pass.**

These fixes address functional brokenness, mock data replacing real API integration, auth/role hardening, and documentation integrity.

| #   | Ref                 | Fix Description                                                                                                                                                                              | Owner      | Effort Estimate |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------- |
| 1   | B-002–B-006         | **Replace admin panel mock data with real API integration** — Connect dashboard, tags, categories, database tools, and updates pages to the NestJS API with proper loading/error states.     | Admin Team | 5 days          |
| 2   | B-001               | **Fix broken `@nodepress/editor` import** — Correct the package name (add `'js'` suffix or update the import path to match the actual package export).                                       | Admin Team | 0.5 day         |
| 3   | B-010               | **Consolidate duplicate API clients** — Merge 3 duplicate API client implementations in `apps/admin/src/lib/` into a single client with auth token management.                               | Admin Team | 1 day           |
| 4   | B-007, B-009, B-014 | **Fix dead UI interactions** — Wire up `onClick` handlers for bulk actions, Save button in Media dialog, and Delete buttons across media/themes/plugins.                                     | Admin Team | 2 days          |
| 5   | B-008               | **Replace contentEditable with real rich-text editor** — Integrate `@nodepress/editor` (Tiptap-based) into `content-form.tsx`. Remove the broken placeholder.                                | Admin Team | 3 days          |
| 6   | A-004               | **Fix JWT role case mismatch** — Normalize role casing: standardize to `SUPER_ADMIN`/`ADMIN`/`EDITOR` etc. in both JWT tokens and guard checks.                                              | API Team   | 1 day           |
| 7   | A-005               | **Register CapabilitiesGuard** — Wire `CapabilitiesGuard` into the auth module or apply it as a global guard. Remove the file if truly unused after review.                                  | API Team   | 0.5 day         |
| 8   | A-006               | **Adopt or remove custom ValidationPipe** — Either register the custom `ValidationPipe` as a global NestJS pipe or remove the dead file and document that class-validator is used instead.   | API Team   | 0.5 day         |
| 9   | A-007               | **Add authorization to UsersController** — Apply `@UseGuards(RolesGuard)` with appropriate role checks to `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`.                         | API Team   | 1 day           |
| 10  | A-008               | **Fix private content status mapping** — Map `'private'` status to `'PRIVATE'` (not `'PUBLISHED'`). Add a separate published/private filter in queries.                                      | API Team   | 1 day           |
| 11  | A-009               | **Fix health check PrismaClient** — Make `PrismaClient` a singleton or import from the shared `PrismaService`. Remove dynamic instantiation.                                                 | API Team   | 0.5 day         |
| 12  | A-010               | **Replace execSync in install service** — Use `spawn` or `exec` with proper async error handling and streaming output. Remove `--accept-data-loss` default.                                  | API Team   | 1 day           |
| 13  | A-011               | **Fix menu create** — Include `name` and `description` fields in the menu `create()` DTO and database write.                                                                                 | API Team   | 0.5 day         |
| 14  | A-012               | **Fix session refresh token storage** — Add a dedicated `refresh_tokens` table/index or store tokens in a proper indexed column instead of inside a JSON payload.                            | API Team   | 1.5 days        |
| 15  | E-001, E-002, E-003 | **Reconcile documentation parity claims** — Audit all parity numbers across `README.md`, PRD docs, and comparison documents. Set canonical parity at ~90% (132/147). Remove inflated claims. | Docs Team  | 1 day           |
| 16  | E-005               | **Reconcile PRD3/PRD4 contradictions** — Create a change log documenting what changed between PRD versions. Ensure current PRD5 becomes the single source of truth.                          | Docs Team  | 1 day           |
| 17  | B-011               | **Add loading/error/404 pages** — Implement `not-found.tsx`, `error.tsx`, and `loading.tsx` for all admin routes following Next.js App Router conventions.                                   | Admin Team | 2 days          |
| 18  | B-013               | **Fix Settings layout SSR** — Remove `"use client"` from `layout.tsx` or split layout into server/client components to preserve SSR metadata.                                                | Admin Team | 1 day           |
| 19  | C-010               | **Fix backup cross-platform issues** — Replace `cp -r` and `tar` with Node.js `fs.cp()` (recursive) and `archiver`/`tar` npm packages for cross-platform compatibility.                      | Core Team  | 1 day           |
| 20  | C-009               | **Fix backup execSync** — Replace `execSync` with async spawn for `pg_dump`/`psql`. Add proper error handling and logging.                                                                   | Core Team  | 1 day           |

**Phase 2 Total Estimated Effort: ~26 days**

#### Phase 2 Verification Gate

- [ ] Admin dashboard and all content management pages display live API data
- [ ] Admin editor loads the real Tiptap-based rich-text editor
- [ ] All CRUD operations on users enforce proper authorization
- [ ] Private content is not exposed through public API endpoints
- [ ] Documentation parity claims are consistent and accurate across all documents
- [ ] All admin routes have proper loading, error, and 404 states
- [ ] Backup and restore works on both Windows and Unix-based systems

---

### 3.3 Phase 3: Medium Priority Fixes

**Priority: FOLLOW-UP SPRINT — Resolve after Phase 2 gates pass.**

These fixes address performance, code quality, configuration hygiene, and edge cases that are not blocking but reduce technical debt and improve reliability.

| #   | Ref   | Fix Description                                                                                                                                                                | Owner            | Effort Estimate |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | --------------- |
| 1   | C-014 | **Add indexes to Prisma schema** — Add B-tree indexes on foreign keys, `status`, `createdAt`, `slug`, and full-text search indexes on content fields.                          | Core Team        | 2 days          |
| 2   | C-015 | **Fix CLI hardcoded admin password** — Remove hardcoded `'admin'` password. Generate a random password on first install and print to console.                                  | Core/CLI Team    | 0.5 day         |
| 3   | C-016 | **Fix CLI hardcoded DB URL** — Remove hardcoded fallback DB URL. Require `DATABASE_URL` env var or prompt user during `node-press setup`.                                      | Core/CLI Team    | 0.5 day         |
| 4   | E-006 | **Add .dockerignore file** — Create root `.dockerignore` excluding `node_modules/`, `.git/`, `dist/`, `.next/`, `coverage/`, `*.log`, `tmp/`.                                  | DevOps Team      | 0.5 day         |
| 5   | E-007 | **Fix docker-compose migrations mount** — Remove incompatible SQL init mount. Replace with proper Prisma migration entrypoint that runs `prisma migrate deploy`.               | DevOps Team      | 1 day           |
| 6   | A-015 | **Fix dual CORS handling** — Choose one CORS mechanism (middleware or `app.enableCors()`). Remove/disable the other. Keep a single source of truth.                            | API Team         | 1 day           |
| 7   | A-016 | **Fix webhooks multi-event storage** — Update `webhooks.service.ts` to store all events from the webhook array, not just the first one.                                        | API Team         | 0.5 day         |
| 8   | A-017 | **Fix media create metadata** — Add `filename` and `originalName` to the Media create DTO and database insert.                                                                 | API Team         | 0.5 day         |
| 9   | A-018 | **Fix scheduled action worker** — Implement actual webhook dispatch and mail sending in the scheduled action worker.                                                           | API Team         | 2 days          |
| 10  | A-019 | **Fix email digest sending** — Implement the actual email digest aggregation and send logic in `core-jobs.service.ts`.                                                         | API Team         | 2 days          |
| 11  | A-020 | **Fix plugin update check** — Implement actual version comparison against a registry (npm or custom endpoint).                                                                 | API Team         | 1 day           |
| 12  | A-021 | **Fix config service fallback secret** — Remove fallback secret. Throw clear configuration error on missing env var.                                                           | API Team         | 0.5 day         |
| 13  | A-022 | **Fix Feeds RSS dynamic configuration** — Make RSS title/link configurable via settings instead of hardcoded.                                                                  | API Team         | 0.5 day         |
| 14  | C-012 | **Fix ESM import extension** — Add `.js` extension to the import in `block-patterns.ts:1`.                                                                                     | Core Team        | 0.5 day         |
| 15  | C-013 | **Fix self-referencing type alias** — Remove the self-referencing type in `db/src/index.ts:12` or replace with proper forward-reference.                                       | Core Team        | 0.5 day         |
| 16  | C-017 | **Fix PluginContext types** — Replace `unknown` types for `cache`/`shortcode` with proper interfaces. Export interfaces from plugin-sdk.                                       | Core Team        | 1 day           |
| 17  | C-018 | **Fix MailManager raw SQL** — Replace raw SQL queries with Prisma queries. Add proper table existence check or migration.                                                      | Core Team        | 1 day           |
| 18  | C-019 | **Fix cron viewer dead events** — Either wire subscribers to cron events or remove the unused event emission.                                                                  | Core Team        | 0.5 day         |
| 19  | C-020 | **Fix PermalinkService loadSettings** — Call `loadSettings` from the service constructor or lazily on first access.                                                            | Core Team        | 0.5 day         |
| 20  | D-007 | **Replace console.log with context.logger** — Update `backup`, `multilingual`, and `newsletter` plugins to use the plugin SDK's logger interface.                              | Core Team        | 1 day           |
| 21  | D-008 | **Add error boundaries to all plugins** — Wrap all 13 plugin `activate()` and hook handler implementations in try/catch blocks that use `context.logger.error()`.              | Core Team        | 2 days          |
| 22  | D-009 | **Add test infrastructure for plugins** — Create test harness in plugin-sdk. Add at least smoke tests for all 13 plugins (activation/deactivation cycle).                      | Core/QA Team     | 3 days          |
| 23  | D-010 | **Update multilingual node-fetch** — Replace deprecated `node-fetch` v2 with `undici` (built into Node.js 18+) or the latest `node-fetch` v3 ESM version.                      | Core Team        | 0.5 day         |
| 24  | D-011 | **Persist login lockdown** — Move brute-force protection state from in-memory to database-backed. Store failed attempts with timestamps in a `login_attempts` table.           | Core Team        | 1.5 days        |
| 25  | D-012 | **Fix performance minification** — Add HTML parser that skips `<pre>`, `<code>`, and `<script>` tags during minification.                                                      | Core Team        | 1 day           |
| 26  | D-013 | **Implement real analytics** — Replace hardcoded mock stats with real page-view tracking using the database or an external analytics service integration.                      | Core Team        | 3 days          |
| 27  | D-014 | **Fix backup rotation delete** — Add actual file deletion logic for expired backups in `plugins/backup`.                                                                       | Core Team        | 0.5 day         |
| 28  | D-015 | **Fix Stripe clientSecret** — Implement real Stripe PaymentIntent creation using `stripe` npm package with proper secret key from config.                                      | Core Team        | 2 days          |
| 29  | D-016 | **Fix social-sharing SSR crash** — Wrap `window.location.href` in `typeof window !== 'undefined'` check or move to `useEffect`/`onMount`.                                      | Core Team        | 0.5 day         |
| 30  | D-017 | **Add cache-redis activate()** — Implement the `activate()` lifecycle method for `plugins/cache-redis` that creates the Redis connection.                                      | Core Team        | 1 day           |
| 31  | D-018 | **Add SEO admin hook** — Implement `admin:dashboard:render` hook in SEO plugin to show SEO summary in admin dashboard.                                                         | Core Team        | 1 day           |
| 32  | D-019 | **Fix redirection CSV import** — Use a proper CSV parser (`csv-parse` from npm) that handles commas inside quoted fields.                                                      | Core Team        | 0.5 day         |
| 33  | D-020 | **Fix newsletter CSV import** — Use a proper CSV parser that handles escaped quotes within fields.                                                                             | Core Team        | 0.5 day         |
| 34  | B-012 | **Fix auth redirect path** — Configure correct login URL constant and ensure redirect targets the proper route.                                                                | Admin Team       | 0.5 day         |
| 35  | B-015 | **Remove console.log** — Clean up debug `console.log` statements before production.                                                                                            | Admin Team       | 0.5 day         |
| 36  | B-016 | **Consolidate app version** — Use a single version source (e.g., `package.json` or env var) across all admin panel locations.                                                  | Admin Team       | 0.5 day         |
| 37  | B-017 | **Wire up forgot password / help links** — Connect placeholder `#` links to actual password reset flow and documentation URLs.                                                 | Admin Team       | 0.5 day         |
| 38  | C-007 | **Fix Windows path compatibility** — Use `path.join()` and `path.resolve()` instead of Unix path separators in `plugin-engine.ts`.                                             | Core Team        | 1 day           |
| 39  | C-008 | **Consolidate ThemeCustomizer** — Remove duplicate class definitions. Keep one canonical implementation.                                                                       | Core Team        | 0.5 day         |
| 40  | E-008 | **Fix CONTRIBUTING.md coverage claim** — Update coverage percentage to reflect actual state. Add coverage gate configuration if >80% is the target.                            | Docs Team        | 0.5 day         |
| 41  | E-009 | **Fix SECURITY.md email** — Verify and update the security contact email domain, or provide an alternative reporting mechanism (e.g., GitHub private vulnerability reporting). | Docs Team        | 0.5 day         |
| 42  | E-010 | **Configure CI coverage threshold** — Add coverage threshold configuration to `.github/workflows/ci.yml` or Jest config.                                                       | DevOps/Docs Team | 0.5 day         |

**Phase 3 Total Estimated Effort: ~38 days**

---

## 4. Acceptance Criteria

Every fix implemented across all three phases **MUST** satisfy the following acceptance criteria:

### 4.1 Code Quality Gates

| #   | Criterion                                                                  | Verification Method                                  |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | **TypeScript strict type check passes**                                    | `tsc --noEmit` with `strict: true`                   |
| 2   | **No new lint errors** — follows project ESLint configuration              | `eslint . --max-warnings 0`                          |
| 3   | **Existing functionality is not broken** — regression-free                 | Existing tests pass + manual smoke test              |
| 4   | **Proper error handling** — all failure paths caught and logged            | Code review + error injection test                   |
| 5   | **ESM compliance** — all imports use `.js` extensions where required       | `node --experimental-specifier-resolution=node` test |
| 6   | **Monorepo conventions followed** — package.json, tsconfig, exports        | Consistent with existing packages                    |
| 7   | **No debug code left behind** — no `console.log`, `debugger`, TODOs        | Grep audit                                           |
| 8   | **Complex logic documented** — code comments explain non-obvious decisions | Code review                                          |

### 4.2 Test Coverage Gates (Post-Remediation)

| #   | Criterion                                                            | Target                       |
| --- | -------------------------------------------------------------------- | ---------------------------- |
| 1   | API endpoint tests for all auth-related fixes                        | ≥80% coverage on auth module |
| 2   | Plugin activation/deactivation tests for all 13 plugins              | ≥70% coverage on plugins     |
| 3   | Admin panel integration tests for previously mock pages              | ≥60% coverage on admin pages |
| 4   | E2E test for a complete user flow (login → create content → publish) | 1 happy-path E2E test        |

### 4.3 Security Gates

| #   | Criterion                                             | Verification Method                 |
| --- | ----------------------------------------------------- | ----------------------------------- |
| 1   | No GraphQL endpoint accessible without authentication | `curl`/Postman test                 |
| 2   | GraphQL introspection disabled in production          | Query `__schema` in production mode |
| 3   | No hardcoded secrets in source code                   | `grep` for known patterns           |
| 4   | Default credentials cannot authenticate               | Test with `admin:admin`             |
| 5   | Private content not exposed via API                   | Integration test                    |
| 6   | Plugin data survives restart                          | Restart + verify cycle              |

### 4.4 Documentation Gates

| #   | Criterion                                                 | Verification Method                     |
| --- | --------------------------------------------------------- | --------------------------------------- |
| 1   | WordPress parity claim is consistent across all documents | Cross-reference audit                   |
| 2   | PRD5 is the single source of truth for audit state        | PRD3/PRD4 annotated with PRD5 reference |
| 3   | All inflated/misleading claims corrected or removed       | Manual review                           |

---

## 5. Risk Assessment

### 5.1 Risk Matrix

| Risk ID | Risk Description                                                              | Likelihood | Impact   | Mitigation Strategy                                                                                                                     |
| ------- | ----------------------------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| R-01    | **Plugin persistence changes break plugin API compatibility**                 | HIGH       | HIGH     | Create a plugin SDK version migration guide. Keep backward-compatible exports for 1 release cycle. Add deprecation warnings.            |
| R-02    | **Auth fixes (JWT role case, guard registration) invalidate existing tokens** | MEDIUM     | MEDIUM   | Stagger auth changes across 2 releases. Issue a "security upgrade" advisory with token refresh instructions for existing installations. |
| R-03    | **Mock data replacement temporarily shows empty states**                      | LOW        | MEDIUM   | Implement graceful empty states with helpful "get started" CTAs. Ensure loading states are shown first.                                 |
| R-04    | **GraphQL changes break existing integrations**                               | MEDIUM     | HIGH     | Audit all GraphQL resolvers before changes. Add integration tests. Use feature flags to toggle old/new behavior.                        |
| R-05    | **Docker configuration changes break CI/CD pipelines**                        | LOW        | HIGH     | Test Docker changes in CI environment before merging. Have rollback plan for compose files.                                             |
| R-06    | **Backup cross-platform changes introduce data loss**                         | LOW        | CRITICAL | Add comprehensive backup/restore integration tests. Ensure rollback to `execSync` fallback is possible.                                 |
| R-07    | **Admin panel re-mocking reveals broken API endpoints**                       | MEDIUM     | MEDIUM   | Fix API issues as they are discovered during integration. Allocate buffer time in Phase 2 schedule.                                     |
| R-08    | **Hardcoded security fixes may cause boot failures on production instances**  | LOW        | HIGH     | Add startup validation that checks env vars and fails fast with clear messages. Provide migration script for existing installs.         |

### 5.2 Overall Risk Rating

**Overall: MEDIUM-HIGH**

The highest risk is **R-01 (Plugin API compatibility)** because all 13 plugins must be rewritten to use database-backed storage. This is an architectural change to the plugin SDK contract. Mitigation requires careful versioning, thorough testing, and clear communication to anyone building on the plugin system.

The second highest risk is **R-02 (Token invalidation)** because it affects all authenticated users. The mitigation is to introduce auth changes incrementally with a security advisory.

---

## 6. Timeline Estimate

### 6.1 Phase Breakdown

| Phase     | Focus                         | Issues Addressed | Estimated Effort         | Suggested Timeline         |
| --------- | ----------------------------- | ---------------- | ------------------------ | -------------------------- |
| Phase 1   | Critical — Security/Stability | 13 items         | ~13 engineering days     | Week 1                     |
| Phase 2   | High — Functional Integrity   | 20 items         | ~26 engineering days     | Weeks 2–3                  |
| Phase 3   | Medium — Quality/Perf/Debt    | 42 items         | ~38 engineering days     | Weeks 4–6                  |
| **Total** | **All Phases**                | **75 items**     | **~77 engineering days** | **6 weeks (parallelized)** |

### 6.2 Resource Allocation

| Team         | Phase 1 Assignments | Phase 2 Assignments | Phase 3 Assignments  | Total Days                 |
| ------------ | ------------------- | ------------------- | -------------------- | -------------------------- |
| API Team     | 2 items (2 days)    | 9 items (8 days)    | 8 items (8 days)     | 18 days                    |
| Core Team    | 10 items (11 days)  | 3 items (3 days)    | 15 items (14.5 days) | 28.5 days                  |
| Admin Team   | —                   | 6 items (14.5 days) | 3 items (1.5 days)   | 16 days                    |
| DevOps Team  | 1 item (0.5 day)    | —                   | 2 items (1.5 days)   | 2 days                     |
| Docs Team    | —                   | 2 items (2 days)    | 2 items (1 day)      | 3 days                     |
| Core/QA Team | —                   | —                   | 1 item (3 days)      | 3 days                     |
| **Totals**   | **13 items**        | **20 items**        | **42 items**         | **~70.5 engineering days** |

### 6.3 Parallelization Strategy

- **Week 1:** Core Team works on Phase 1 plugin persistence and crypto fixes. API Team works on GraphQL auth bypass and Docker fixes in parallel. **No cross-team dependencies.**
- **Weeks 2–3:** Core Team merges plugin SDK changes. API Team and Admin Team work in parallel — Admin on mock data replacement, API on auth/role fixes. Docs Team reconciles documentation claims.
- **Weeks 4–6:** All teams work on Phase 3 independently. QA team builds plugin test infrastructure alongside development.

### 6.4 Critical Path

The critical path runs through **Plugin persistence → Plugin SDK update → All 13 plugin rewrites** (Core Team, ~2 weeks). This blocks all plugin-related fixes in Phase 3. The GraphQL and admin fixes have no dependency on the plugin work and can proceed entirely in parallel.

### 6.5 Milestones

| Milestone                              | Date          | Deliverable                                        |
| -------------------------------------- | ------------- | -------------------------------------------------- |
| Phase 1 Complete — Security Baseline   | Week 1 end    | All CRITICAL issues resolved, security gates pass  |
| Phase 2 Complete — Functional Baseline | Week 3 end    | Admin panel shows live data, auth works end-to-end |
| Phase 3 Complete — Quality Baseline    | Week 6 end    | All 229+ issues addressed, gates pass              |
| Full Remediation Sign-Off              | Week 6+3 days | VP Engineering sign-off, PRD5 archived as baseline |

---

## Appendix A: Summary Statistics

| Domain    | Layer                 | CRITICAL | HIGH   | MEDIUM | LOW/INFO | Total  |
| --------- | --------------------- | -------- | ------ | ------ | -------- | ------ |
| A         | API (NestJS)          | 2        | 9      | 10     | 1        | 22     |
| B         | Admin Panel (Next.js) | 0        | 10     | 5      | 2        | 17     |
| C         | Core Packages (8)     | 4        | 7      | 9      | 0        | 20     |
| D         | Plugins (13)          | 6        | 6      | 7      | 1        | 20     |
| E         | Docs & Config         | 0        | 4      | 4      | 2        | 10     |
| **TOTAL** | **All**               | **12**   | **36** | **35** | **6**    | **89** |

> **Note:** The 89 issues detailed in this document represent the fully enumerated subset of the estimated 229+ total issues. The remaining ~140 issues follow the same severity patterns and will be tracked in the project management system as sub-tasks of the Phase 3 work packages.

---

## Appendix B: Issue Severity Definitions

| Severity    | Definition                                                                                          | Required Action                                       |
| ----------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 🔴 CRITICAL | Exploitable security vulnerability, data loss risk, or complete application crash on standard usage | Fix immediately. Block all other work until resolved. |
| 🟠 HIGH     | Feature is broken, security posture weakened, significant performance or cross-platform failure     | Fix within current sprint.                            |
| 🟡 MEDIUM   | Suboptimal implementation, code quality issue, missing edge case handling                           | Fix within next sprint or add to tech debt backlog.   |
| ⚪ LOW      | Cosmetic issue, hardcoded non-sensitive value, minor documentation inaccuracy                       | Fix when convenient or during refactoring.            |
| ℹ️ INFO     | Observation, suggestion, non-blocking improvement                                                   | Review and decide.                                    |

---

## Appendix C: Remediation Progress Tracking

| Phase     | Total Items | Not Started | In Progress | Done  | % Complete |
| --------- | ----------- | ----------- | ----------- | ----- | ---------- |
| Phase 1   | 13          | 13          | 0           | 0     | 0%         |
| Phase 2   | 20          | 20          | 0           | 0     | 0%         |
| Phase 3   | 42          | 42          | 0           | 0     | 0%         |
| **Total** | **75**      | **75**      | **0**       | **0** | **0%**     |

---

_End of PRD v5 — July 4, 2026_
