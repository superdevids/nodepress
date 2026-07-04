# PRD v6: NodePress — Final Audit & Comprehensive Remediation

**Version:** 6.0 | **Date:** July 4, 2026
**Status:** Remediation in Progress
**Scope:** Final cleanup — all remaining issues after PRD5

---

## 1. Executive Summary

PRD5 addressed approximately 229 documented issues across the NodePress codebase. Following its completion, a fresh re-audit was conducted covering all layers — API (NestJS), Admin Panel (Next.js), Core Packages, and Plugins. This audit identified **39 remaining issues** spanning critical test failures, authentication gaps, cross-platform incompatibilities, dead code, type safety erosion, and mock data leakage.

This document (PRD6) establishes the definitive remediation plan to close the loop on ALL outstanding items, bringing the codebase to production readiness with zero critical security issues, full cross-platform support, and validated test coverage.

---

## 2. Issue Summary Table

### Domain A: API (NestJS) — 17 remaining issues

| ID    | Severity     | Category     | File                                         | Description                                                                                                  |
| ----- | ------------ | ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A-101 | **CRITICAL** | Test         | `auth/__tests__/auth.service.test.ts`        | Broken unit test — `MailService` constructor argument missing, test suite cannot run                         |
| A-102 | **HIGH**     | Auth         | `auth/recovery.controller.ts`                | Recovery status endpoint lacks `@Public()` decorator — causes bootstrapping lockout if admin loses access    |
| A-103 | **HIGH**     | Public       | `feeds/feeds.controller.ts`                  | RSS/Atom feeds require JWT authentication but must be publicly accessible                                    |
| A-104 | **HIGH**     | Data         | `webhooks/webhooks.service.ts`               | `trigger()` uses exact string match against events column; events stored as JSON array — webhooks never fire |
| A-105 | **MEDIUM**   | Auth         | `auth/session.controller.ts`                 | `revokeAll` does not exclude current session — user is forcibly logged out                                   |
| A-106 | **MEDIUM**   | Auth         | `comments/comments.controller.ts`            | `updateStatus` / `delete` endpoints lack role checks — any authenticated user can moderate                   |
| A-107 | **MEDIUM**   | Auth         | `content/content.controller.ts`              | `update` / `delete` endpoints lack permission or ownership checks                                            |
| A-108 | **MEDIUM**   | Security     | `common/middleware/rate-limit.middleware.ts` | Login rate-limit path check uses substring match — trivially bypassable (e.g. `/fake-login` matches)         |
| A-109 | **MEDIUM**   | Ops          | `health/health.controller.ts`                | Disk health check shells out to Unix-only `df` command — breaks on Windows                                   |
| A-110 | **MEDIUM**   | Quality      | Multiple files                               | Empty `catch` blocks silently swallow failures (4 locations identified)                                      |
| A-111 | **LOW**      | Architecture | `common/rate-limit-detail.service.ts`        | Rate-limit state stored in-memory only — all counters reset on process restart                               |
| A-112 | **LOW**      | Security     | `auth/password-reset.service.ts`             | Password reset URL does not include proper origin — susceptible to host header poisoning                     |
| A-113 | **LOW**      | Ops          | `install/install.service.ts`                 | Fragile `npx` path resolution with no fallback safety                                                        |
| A-114 | **LOW**      | Quality      | 40+ files                                    | `as any` casts used 40+ times — type safety incrementally eroded                                             |
| A-115 | **MEDIUM**   | Graphics     | `common/csp-config.ts`                       | `report-to` directive is syntactically invalid per CSP spec                                                  |
| A-116 | **MEDIUM**   | Auth         | Multiple                                     | 7 unresolved `TODO` comments referencing pending schema changes                                              |
| A-117 | **MEDIUM**   | Storage      | `auth/session.service.ts`                    | `RefreshToken` stored in JSON column — forces O(n) scan for token lookup                                     |

### Domain B: Admin Panel (Next.js) — 15 remaining issues

| ID    | Severity   | Category     | File                                                  | Description                                                                                                      |
| ----- | ---------- | ------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| B-101 | **HIGH**   | Architecture | `lib/`                                                | Dual API client layers exist (`api-client` vs `api-helper`) with differing URL construction — causes silent 404s |
| B-102 | **HIGH**   | Build        | `components/content/content-form.tsx`                 | Direct import of `BlockEditor` instead of `dynamic()` — SSR crash risk on load                                   |
| B-103 | **HIGH**   | API          | `components/content/bulk-actions.tsx`                 | Calls `/content/bulk` endpoint that does not exist on the backend                                                |
| B-104 | **MEDIUM** | UX           | Multiple files                                        | 8 empty `onClick` handlers (avatar, notification, view, duplicate, trash, download) — no user feedback           |
| B-105 | **MEDIUM** | Quality      | Multiple files                                        | 5 `TODO` comments left in production code — incomplete features                                                  |
| B-106 | **MEDIUM** | Bug          | `app/admin/tools/updates/page.tsx`                    | Race condition — reads stale state after `setState` without awaiting async update                                |
| B-107 | **MEDIUM** | Quality      | Various pages                                         | Inconsistent API layer imports (settings, users pages use deprecated `api-helper`)                               |
| B-108 | **MEDIUM** | Bug          | `app/admin/tools/database/page.tsx`                   | Database size calculation double-converts bytes — display order of magnitude off                                 |
| B-109 | **LOW**    | Quality      | `lib/auth.tsx`, `components/admin/screen-options.tsx` | Hardcoded `localStorage` keys — no constants or prefix namespacing                                               |
| B-110 | **LOW**    | Quality      | `components/layout/admin-layout.tsx`                  | Hardcoded version string instead of reading from `package.json`                                                  |
| B-111 | **LOW**    | UX           | `app/admin/content/`                                  | Missing error boundaries and loading states in new/edit content pages                                            |
| B-112 | **LOW**    | Performance  | `components/media/media-upload.tsx`                   | `onUploadComplete` called N times for N files instead of once with batch result                                  |
| B-113 | **LOW**    | Performance  | `components/providers.tsx`                            | Duplicate toast notification systems (`sonner` + custom) both mounted                                            |
| B-114 | **LOW**    | TypeScript   | `components/content/content-editor.tsx`               | Editor callback parameter typed as `any`                                                                         |
| B-115 | **LOW**    | Routes       | `app/(admin)/login/page.tsx`                          | "Forgot password" and "Help" links target routes that return 404                                                 |

### Domain C: Core Packages — 9 remaining issues

| ID    | Severity   | Category       | File                                       | Description                                                                                                      |
| ----- | ---------- | -------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| C-101 | **HIGH**   | Cross-platform | `core/src/backup/backup-manager.ts`        | Uses `execSync` with Unix-only commands (`pg_dump`, `psql`, `cp -r`, `tar`) — completely broken on Windows       |
| C-102 | **HIGH**   | Testing        | `testing/src/test-server.ts`               | 4 constructor API mismatches between test utilities and latest core interfaces                                   |
| C-103 | **HIGH**   | Security       | `cli/src/commands/db.ts`                   | Hardcoded fallback database URL exposed in source                                                                |
| C-104 | **MEDIUM** | Dead Code      | `core/src/permalink/permalink-service.ts`  | `loadSettings` defined but never invoked — persisted settings never loaded at startup                            |
| C-105 | **MEDIUM** | Dead Code      | `core/src/cron/cron-viewer.ts`             | Event emitted but no subscriber exists — dead code path                                                          |
| C-106 | **MEDIUM** | Type Safety    | `plugin-sdk/src/index.ts`                  | `PluginContext` types for `cache` and `shortcode` are `unknown` — mismatch with actual implementation signatures |
| C-107 | **MEDIUM** | Architecture   | `core/src/theme/theme-customizer-panel.ts` | Raw `localStorage` access (has guard but no abstraction layer — unlike rest of codebase)                         |
| C-108 | **MEDIUM** | Cross-platform | `core/src/backup/backup-manager.ts`        | Custom `dirname` implementation instead of `path.dirname` — redundant and error-prone                            |
| C-109 | **LOW**    | Quality        | `cli/src/commands/db.ts`                   | `findPrismaBin` uses Windows-specific `npx.cmd` fallback — fragile path resolution                               |

### Domain D: Plugins — 2 remaining issues

| ID    | Severity   | Category  | Plugin      | Description                                                                                                                                            |
| ----- | ---------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-101 | **MEDIUM** | Mock Data | `analytics` | Dashboard still displays 4 mock/synthetic metrics: `bounceRate`, `avgSessionDuration`, `sessions`, `activeVisitors` — no real computation backing them |
| D-102 | **LOW**    | Crypto    | `security`  | `computeChecksum()` returns non-hash fallback on read error instead of throwing or returning `null`                                                    |

---

## 3. Remediation Plan

### Phase 1: Critical Fixes (Fix Immediately)

| Step | Issue(s) | Action                                                                                                                                                         | Owner |
| ---- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1    | A-101    | Add `MailService` mock to `auth.service.test.ts` constructor call                                                                                              | API   |
| 2    | A-102    | Add `@Public()` decorator to recovery status endpoint                                                                                                          | API   |
| 3    | A-103    | Add `@Public()` decorator to feeds controller (RSS/Atom)                                                                                                       | API   |
| 4    | A-104    | Rewrite `webhooks.service.ts` `trigger()` to check JSON array membership instead of exact match                                                                | API   |
| 5    | A-105    | Add `where id !== currentSessionId` filter in `revokeAll`                                                                                                      | API   |
| 6    | B-101    | Consolidate dual API client layers into single canonical implementation; ensure uniform URL construction                                                       | Admin |
| 7    | C-101    | Replace `execSync` Unix commands (`pg_dump`, `psql`, `cp -r`, `tar`) with cross-platform Node.js APIs (`child_process` with platform detection, `fs.promises`) | Core  |
| 8    | C-102    | Update `test-server.ts` constructors to match current core interface signatures                                                                                | Core  |

### Phase 2: High Priority Fixes

| Step | Issue(s)     | Action                                                                                          | Owner       |
| ---- | ------------ | ----------------------------------------------------------------------------------------------- | ----------- |
| 9    | A-106, A-107 | Add `@Roles()` / `@Ownership()` guards to comments and content controllers                      | API         |
| 10   | A-108        | Change rate-limit path check from substring to exact match (`===`)                              | API         |
| 11   | A-109, A-115 | Replace `df` with `check-disk-space` npm package for Windows compat; fix CSP `report-to` syntax | API         |
| 12   | A-110        | Add structured error logging (via `Logger`) to all 4 empty `catch` blocks                       | API         |
| 13   | B-102        | Replace direct import of `BlockEditor` with `dynamic(() => import(...), { ssr: false })`        | Admin       |
| 14   | B-103        | Implement `/content/bulk` backend endpoint or remove the frontend call                          | Admin / API |
| 15   | B-104        | Wire up all 8 empty `onClick` handlers with appropriate actions or toast notifications          | Admin       |
| 16   | C-103        | Remove hardcoded DB URL; require env var or config file                                         | Core        |
| 17   | D-101        | Replace mock analytics metrics with real computed values from actual page view data             | Plugins     |

### Phase 3: Medium / Low Fixes

| Step | Issue(s) | Action                                                                           | Owner   |
| ---- | -------- | -------------------------------------------------------------------------------- | ------- |
| 18   | A-111    | Persist rate-limit state to Redis or database                                    | API     |
| 19   | A-112    | Add dynamic origin construction from `req.headers.origin` / `host`               | API     |
| 20   | A-113    | Add safe `npx` resolution with configurable fallback paths                       | API     |
| 21   | A-114    | Incrementally replace `as any` casts with proper types (track in separate issue) | API     |
| 22   | A-116    | Resolve all 7 schema-related `TODO` comments — implement or remove               | API     |
| 23   | A-117    | Extract `RefreshToken` to separate table with indexed column                     | API     |
| 24   | B-105    | Remove or implement all 5 `TODO` comments in production code                     | Admin   |
| 25   | B-106    | Fix race condition — move state read after async completion                      | Admin   |
| 26   | B-107    | Migrate settings and users pages from `api-helper` to canonical `api-client`     | Admin   |
| 27   | B-108    | Fix byte conversion factor in database size calculation                          | Admin   |
| 28   | B-109    | Extract `localStorage` keys into constants module with prefix namespacing        | Admin   |
| 29   | B-110    | Read version from `package.json` at build time                                   | Admin   |
| 30   | B-111    | Add `ErrorBoundary` and loading skeletons to content new/edit pages              | Admin   |
| 31   | B-112    | Debounce or batch `onUploadComplete` callback to fire once per batch             | Admin   |
| 32   | B-113    | Remove duplicate toast system; keep one (prefer `sonner`)                        | Admin   |
| 33   | B-114    | Type editor parameter as `Editor` from `@tiptap/core`                            | Admin   |
| 34   | B-115    | Implement forgot password and help pages or remove broken links                  | Admin   |
| 35   | C-104    | Invoke `loadSettings()` during `PermalinkService` initialization                 | Core    |
| 36   | C-105    | Remove dead event emission or add subscriber                                     | Core    |
| 37   | C-106    | Align `PluginContext` cache/shortcode types with actual implementation           | Core    |
| 38   | C-107    | Replace raw `localStorage` with the same abstraction used elsewhere in codebase  | Core    |
| 39   | C-108    | Replace custom `dirname` with `path.dirname`                                     | Core    |
| 40   | C-109    | Improve `findPrismaBin` with robust cross-platform resolution                    | Core    |
| 41   | D-102    | Make `computeChecksum()` return `null` on read error instead of non-hash string  | Plugins |

---

## 4. Acceptance Criteria

The following criteria must be met before PRD6 can be considered complete:

| #     | Criterion                                                                    | Verification Method                                      |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| AC-1  | All TypeScript compiles with `strict: true` — zero `any` escapes             | `tsc --noEmit` across all packages                       |
| AC-2  | All unit tests pass — including previously broken `auth.service.test.ts`     | `npm test` / `pnpm test`                                 |
| AC-3  | No `console.log` statements exist in production code                         | `grep -r "console.log" src/ --include="*.ts"`            |
| AC-4  | No hardcoded secrets, URLs, or passwords in source                           | Manual review of config files and CLI commands           |
| AC-5  | All `catch` handlers log errors via structured logger (no silent swallows)   | Code review of all `catch` blocks                        |
| AC-6  | Cross-platform compatible — all functionality works on both Windows and Unix | CI matrix (ubuntu-latest + windows-latest)               |
| AC-7  | Admin panel fully integrated with API — no calls to non-existent endpoints   | E2E smoke test of all admin pages                        |
| AC-8  | No mock or synthetic data in admin panel dashboards                          | Visual inspection of analytics dashboard                 |
| AC-9  | No `TODO` comments in production code                                        | `grep -r "TODO" src/ --include="*.ts" --include="*.tsx"` |
| AC-10 | Rate limiting survives process restart (persisted to Redis/database)         | Integration test with restart                            |

---

## 5. Final Verdict

After PRD6 execution, the NodePress codebase is expected to reach **~92–95% WordPress feature parity** with:

- **Zero critical security issues** — all authentication, authorization, and data access paths hardened
- **Zero mock data in admin panel** — every displayed metric computed from real data
- **Full cross-platform support** — Windows and Unix parity for all operations (backup, health checks, CLI)
- **Production-ready hardening** — proper error handling, rate-limit persistence, CSP compliance, and no debug artifacts

| Metric                       | PRD5 Exit | PRD6 Target |
| ---------------------------- | --------- | ----------- |
| Total open issues            | ~39       | **0**       |
| Critical severity            | 1         | **0**       |
| High severity                | 7         | **0**       |
| Medium severity              | 16        | **0**       |
| Low severity                 | 15        | **0**       |
| Cross-platform breaks        | 3         | **0**       |
| Mock data leaks              | 4         | **0**       |
| Test suite pass rate         | ~97%      | **100%**    |
| TypeScript strict compliance | ~85%      | **100%**    |

PRD6 represents the final comprehensive remediation. Upon completion, the codebase transitions from active remediation to standard maintenance and feature development.
