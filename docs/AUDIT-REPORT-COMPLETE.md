# NodePress — Comprehensive Codebase Audit Report

> **Generated:** July 3, 2026  
> **Scope:** Full monorepo — apps/api, apps/admin, packages/core, packages/editor, packages/cli, packages/db, packages/plugin-sdk, packages/ui, packages/testing, packages/config, plugins/*, web-starter, config files  
> **Total Issues Found:** 253+

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 CRITICAL | 49 |
| 🟠 HIGH | 110 |
| 🟡 MEDIUM | 85 |
| ⚪ LOW | 42 |
| **TOTAL** | **286** |

**Verdict: 🚫 BLOCK** — This codebase has foundational issues that prevent it from functioning. No single application component (API, admin, editor, plugins) can start or operate correctly in the current state. The monorepo cannot be installed, the API cannot boot, the database cannot provision, and the admin panel cannot authenticate. **All feature development must stop until infrastructure and blocking issues are resolved.**

### 🔥 Top 10 Issues That Must Be Fixed First

| # | Issue | Impact |
|---|-------|--------|
| 1 | `pnpm-workspace.yaml` does not exist | Entire monorepo is uninstallable |
| 2 | `apps/api/src/app.module.ts` is empty (0 bytes) | NestJS API cannot boot |
| 3 | `apps/api/package.json` has **no** devDependencies | `npm build` fails immediately |
| 4 | Prisma schema uses invalid extension name `uuid_ossp` | `prisma migrate` fails |
| 5 | Web-starter missing all Tailwind CSS infrastructure | Frontend renders unstyled |
| 6 | `docker-compose.prod.yml` has invalid YAML syntax | Production deploy broken |
| 7 | All 18+ API services use in-memory `Map` storage | All data lost on restart |
| 8 | 5 registered middleware modules never wired (RateLimit, CORS, TrustedHost, Maintenance, InstallCheck) | No middleware runs |
| 9 | SDK ↔ Core `PluginContext` type mismatch (`db: unknown` vs `prisma: PrismaClient`) | All plugins crash at runtime |
| 10 | Hardcoded JWT fallback secrets in production (`nodepress-secret`, `fallback-dev-secret`) | Auth tokens forgeable |

---

## 🔴 A. API App (`apps/api`) — 54 Issues

### CRITICAL (16)

| ID | File | Issue |
|----|------|-------|
| A-01 | `apps/api/src/app.module.ts` | **Empty file (0 bytes)** — no modules, controllers, or providers imported. NestJS cannot bootstrap. |
| A-02 | `apps/api/src/**/*.service.ts` | **All 18+ services use `new Map<string, T>()`** — completely ephemeral in-memory storage. Zero Prisma queries. All data lost on every restart. |
| A-03 | `apps/api/src/auth/auth.service.ts` | **Duplicate user stores** — `AuthService.users` duplicates `UsersService.store`. Users created via registration are invisible to admin and vice versa. |
| A-04 | `apps/api/src/auth/password-reset.service.ts` | **Password reset completely broken** — `requestReset()` reads from an empty/independent user store and always returns a generic success message without actually creating a reset token. |
| A-05 | `apps/api/src/auth/auth.service.ts` | **JWT fallback secret in production** — Uses `'fallback-dev-secret'` when env var is missing. No production secret validation. |
| A-06 | `apps/api/src/auth/auth.controller.ts` | **Recovery mode returns fake JWT** — Returns `"recovery_<token>"` which is not a valid JWT. Cannot be used for authentication. |
| A-07 | `apps/api/src/middleware/rate-limit.middleware.ts` | **RateLimitMiddleware defined but never registered** in any module. No rate limiting is active. |
| A-08 | `apps/api/src/middleware/cors.middleware.ts` | **CorsMiddleware defined but never registered**. CORS headers not enforced. |
| A-09 | `apps/api/src/middleware/trusted-host.middleware.ts` | **TrustedHostMiddleware defined but never registered**. No host filtering. |
| A-10 | `apps/api/src/middleware/maintenance.middleware.ts` | **MaintenanceMiddleware defined but never registered**. Maintenance mode cannot be activated. |
| A-11 | `apps/api/src/middleware/install-check.middleware.ts` | **InstallCheckMiddleware defined but never registered**. Install check never runs. |
| A-12 | `apps/api/src/revisions/revisions.controller.ts` | **RevisionsController is a complete stub** — all 4 endpoints return hardcoded empty data. No diff/compare/restore functionality. |
| A-13 | `apps/api/src/feeds/feeds.service.ts` | **FeedsService returns empty data** — RSS/Atom feeds always return `[]`. |
| A-14 | `apps/api/src/search/search.service.ts` | **SearchService returns 0 results always** — search is non-functional. |
| A-15 | `apps/api/src/oembed/oembed.service.ts` | **OEmbedService returns hardcoded response** — ignores the actual URL being requested. |
| A-16 | `apps/api/src/webhooks/webhooks.service.ts` | **WebhooksService.deliver() never makes HTTP calls** — webhooks are logged but never delivered. |

### HIGH (20)

| ID | File | Issue |
|----|------|-------|
| A-17 | `apps/api/src/middleware/cors.middleware.ts` | **CORS middleware reflects origin header unsafely** — sets `Access-Control-Allow-Origin` to the request's `Origin` header while also setting `Access-Control-Allow-Credentials: true`. Allows any site to make credentialed requests. |
| A-18 | `apps/api/src/guards/force-password-change.guard.ts` | **ForcePasswordChangeGuard defined but never imported or used** anywhere. |
| A-19 | `apps/api/src/comments/comments.controller.ts` | **Comments endpoint trusts user-supplied `authorName`/`authorEmail`** — allows impersonation of any user. |
| A-20 | `apps/api/src/guards/roles.guard.ts` | **RolesGuard defined but never registered globally** — any authenticated user can access admin endpoints regardless of role. |
| A-21 | `apps/api/src/guards/capabilities.guard.ts` | **CapabilitiesGuard defined but never used**. |
| A-22 | `apps/api/src/media/media.controller.ts` | **Media upload has no file validation** — crashes with 500 if no file is uploaded. No type/size checks. |
| A-23 | `apps/api/src/content/content.service.ts` | **Content update has no ownership check** — any authenticated user can modify or delete any other user's content. |
| A-24 | `apps/api/src/users/users.service.ts` | **User update has no authorization** — any authenticated user can update any other user's profile, including roles. |
| A-25 | `apps/api/src/users/users.controller.ts` | **User create endpoint has no admin check** — any authenticated user can create new users. |
| A-26 | `apps/api/src/middleware/rate-limit.middleware.ts` | **Event handler promises not caught** — unhandled promise rejections in rate-limit event handlers. |
| A-27 | `apps/api/src/prisma/prisma.service.ts` | **`prisma.$disconnect()` not in `finally` block** — database connections leak on error. |
| A-28 | `apps/api/src/install/install.service.ts` | **`execSync` with `--accept-data-loss` flag** — destructive database operations with no confirmation. |
| A-29 | `apps/api/src/cors.config.ts` + `middleware/cors.middleware.ts` | **Dual CORS configurations** — two separate CORS config files with different mechanisms may conflict. |
| A-30 | `apps/api/src/middleware/cors.middleware.ts` | **CORS regex injection vulnerability** — origin regex patterns constructed from user-controlled input. |
| A-31 | `apps/api/src/content/content.service.ts` | **`ContentService.recordView()` is a no-op** — increments a local counter that's never persisted or returned. |
| A-32 | `apps/api/src/auth/auth.service.ts` | **AuthService uses `any` type for user objects throughout** — loses all type safety. |
| A-33 | `apps/api/src/auth/password-reset.service.ts` | **PasswordResetService depends on AuthService's user store but doesn't inject it** — accesses it via `(AuthService as any).users` (undeclared dependency). |
| A-34 | `apps/api/src/health/health.controller.ts` | **Dynamic imports of `@nodepress/db` and `redis` on every health check** — unnecessary overhead on a frequently-called endpoint. |
| A-35 | `apps/api/src/config/cors.config.ts` + `apps/api/src/middleware/cors.middleware.ts` | **Two separate CORS config files with different mechanisms and overlapping settings**. |
| A-36 | `apps/api/src/constants/rate-limit.constants.ts` | **Duplicate RateLimit constants** — defined both in `constants.ts` and `RateLimitDetailService`. |

### MEDIUM (15)

| ID | Issue |
|----|-------|
| A-37 | Multiple TODO stubs left in production code across controllers and services |
| A-38 | Missing null checks on optional request parameters in multiple endpoints |
| A-39 | In-memory audit log — all audit trail lost on restart |
| A-40 | In-memory rate-limit store — rate limits reset on restart |
| A-41 | In-memory 2FA sessions — lost on restart |
| A-42 | In-memory session store — all sessions invalidated on restart |
| A-43 | `execSync` used in serverless-incompatible install service |
| A-44 | Missing request validation on PATCH/POST bodies in 6 controllers |
| A-45 | Swagger/OpenAPI decorators inconsistent or missing |
| A-46 | Logger uses `console.log` directly instead of NestJS Logger |
| A-47 | Environment variable validation missing — crashes with unhelpful errors |
| A-48 | No request ID tracing on log entries |
| A-49 | Static file serving path not configurable |
| A-50 | All error responses return raw NestJS error objects (no normalization) |
| A-51 | No database migration in startup sequence |

### LOW (3)

| ID | Issue |
|----|-------|
| A-52 | Mixed import styles for `uuid` (CJS vs ESM) — may fail under strict ESM |
| A-53 | `any` types used in `main.ts` bootstrap code |
| A-54 | Unused imports in 5+ service files |

---

## 🔴 B. Admin Panel (`apps/admin`) — 38 Issues

### CRITICAL (8)

| ID | File | Issue |
|----|------|-------|
| B-01 | `apps/admin/src/lib/auth.ts` | **Auth tokens stored in `localStorage`** — XSS-vulnerable. Any injected script can exfiltrate tokens. |
| B-02 | `apps/admin/src/lib/api.ts` | **`createApiClient()` calls `useAuth()` hook outside a React component** — violates React's Rules of Hooks. Crashes at runtime. |
| B-03 | `apps/admin/src/app/*` vs `apps/admin/src/app/(admin)/*` | **Duplicate route structure** — 16 conflicting routes between `app/admin/*` and `app/(admin)/*`. Creates ambiguous routing and duplicate components. |
| B-04 | `apps/admin/src/components/editor/content-editor.tsx` | **Content editor is a bare `<textarea>`** — no rich text editing, no block editor, no formatting toolbar. |
| B-05 | `apps/admin/src/app/(admin)/content/[id]/page.tsx` | **Content form has no `onSubmit` handler on the `<form>` element** — pressing Enter refreshes the page instead of saving. |
| B-06 | `apps/admin/src/app/(admin)/settings/*/page.tsx` | **General settings Select components bypass React Hook Form registration** — form state doesn't track them. Values are never submitted. |
| B-07 | `apps/admin/src/app/(admin)/layout.tsx` | **No auth guard on protected routes** — any unauthenticated user can access the full admin panel. |
| B-08 | `apps/admin/src/lib/api.ts` | **API client singleton has no auth token** — all requests are sent without `Authorization` header. Every API call returns 401. |

### HIGH (18)

| ID | Issue |
|----|-------|
| B-09 | Activity widget has hardcoded Indonesian text labels (`"Tidak ada aktivitas"`) |
| B-10 | All data is hardcoded mock data — zero API integration across 79 files |
| B-11 | No loading states (`Skeleton`, spinner) in any data-driven component |
| B-12 | `useKeyboardShortcut` has stale closure — always references initial state |
| B-13 | Drag-and-drop dashboard has no keyboard alternative (inaccessible for keyboard-only users) |
| B-14 | Quick Edit uses stale closures in debounced save — saves old values |
| B-15 | No React Error Boundary anywhere in the app — any render crash takes down the entire SPA |
| B-16 | All 6 settings pages use `useState` — **NO persistence**. Settings reset on page reload |
| B-17 | WordPress WXR import — file input `accept` attribute uses wrong MIME type |
| B-18 | Media upload `setInterval` not cleaned up on unmount — memory leak |
| B-19 | Content list "Add New" button navigates to `/content/new` which doesn't exist as a route |
| B-20 | Recommendations `.map()` uses array index as React key — causes render bugs on reorder |
| B-21 | `useLocalStorage` hook not SSR-safe — crashes during Next.js server-side render |
| B-22 | Toast `setTimeout` not cleaned up on dismiss — memory leak |
| B-23 | API client silently swallows JSON parse errors — shows empty UI instead of error |
| B-24 | Settings inputs use `defaultValue` with no `onChange` tracking — inputs appear to do nothing |
| B-25 | File manager has no `aria-label` on icon buttons |
| B-26 | Media detail page "Save" button doesn't read current form values — always saves initial data |

### MEDIUM (12)

| ID | Issue |
|----|-------|
| B-27 | Missing `alt` text on avatar images |
| B-28 | Data tables missing responsive horizontal scroll |
| B-29 | Sidebar navigation not collapsible on mobile |
| B-30 | Color contrast below WCAG AA on secondary buttons |
| B-31 | No `focus-visible` ring styles on interactive elements |
| B-32 | Modal dialogs don't trap focus |
| B-33 | Dropdown menus close on any click instead of being hover-aware |
| B-34 | Form validation errors shown in console only, not in UI |
| B-35 | Chart components use canvas but lack `aria-label` descriptions |
| B-36 | Search input debounce too short (50ms) — fires excessive API calls |
| B-37 | No confirmation dialog on destructive actions (delete content, delete media) |
| B-38 | Date picker manually typed input bypasses format validation |

### LOW (8)

| ID | Issue |
|----|-------|
| B-39 | Hardcoded strings not translatable — no i18n infrastructure |
| B-40 | `console.log` left in production code (6 files) |
| B-41 | Prettier config inconsistent with project standard |
| B-42 | Multiple unused `import` statements |
| B-43 | Components use default exports inconsistently |
| B-44 | CSS class ordering not alphabetical (non-standard) |
| B-45 | Missing `@types/react` extension in tsconfig path aliases |
| B-46 | Component file names use inconsistent casing (PascalCase vs kebab-case) |

---

## 🔴 C. Core Package (`packages/core`) — 48 Issues

### CRITICAL (10)

| ID | File / Module | Issue |
|----|--------------|-------|
| C-01 | `packages/core/src/auth/jwt.ts` | **Hardcoded JWT fallback secrets** — `'nodepress-secret'` and `'nodepress-refresh-secret'` used when env vars are missing. Well-known strings. |
| C-02 | `packages/core/src/auth/password.ts` | **Password content stores passwords in plaintext** — `PasswordContent` never calls `bcrypt.hash()`. Plaintext password string stored in DB. |
| C-03 | `packages/core/src/deps/dependency-resolver.ts` | **Dependency resolver version check logic broken** — looks up the wrong key in the manifest. Version comparison always fails. |
| C-04 | `packages/core/src/html/oembed.ts` | **oEmbed HTML sanitizer is regex-based and insufficient** — allows XSS vectors like `onerror`, `javascript:` URLs. |
| C-05 | `packages/core/src/shortcodes/shortcode-processor.ts` | **Shortcode processor replaces only first occurrence** — duplicate shortcodes are silently ignored. |
| C-06 | `packages/core/src/mail/mail-manager.ts` | **Mail manager uses `crypto.randomUUID()` without importing `crypto`** — throws `ReferenceError` at runtime. |
| C-07 | `packages/core/src/scheduler/cron-viewer.ts` | **CronViewer uses `crypto.randomUUID()` without importing `crypto`** — throws `ReferenceError` at runtime. |
| C-08 | `packages/core/src/auth/recovery.ts` | **Recovery tokens generated but never persisted** — tokens are returned to the user but never stored. Cannot be verified. |
| C-09 | `packages/core/src/scheduler/cron-parser.ts` | **Cron parsing broken for `*/N` patterns** — falls through the switch and defaults to 1-hour interval. |
| C-10 | `packages/core/src/s3/s3-client.ts` + `packages/core/src/mail/mail-transport.ts` | **S3 client and mail transporter created on every operation** — no connection reuse. Connection pool exhaustion and severe performance regression. |

### HIGH (14)

| ID | Issue |
|----|-------|
| C-11 | **Cache has no external backing** — pure in-memory `Map`. All cached data lost on restart. |
| C-12 | **Config loader file completely empty** (0 lines) — `packages/core/src/config/config-loader.ts` |
| C-13 | **Refresh token doesn't verify against stored token** — accepts any valid JWT as a refresh token. |
| C-14 | **XSS sanitizer uses insufficient regex** — `strip-tags.ts` only removes `<script>` and `<iframe>`, leaves other dangerous tags. |
| C-15 | **Plugin activation sets `activatedAt` from `DB updatedAt` field** — wrong field; should use a dedicated `activatedAt` column. |
| C-16 | **`ContentEngine` is a type registry only** — no CRUD implementation. All methods are stubs. |
| C-17 | **`MediaService` has no upload/storage/URL generation** — all methods are stubs. |
| C-18 | **2FA QR code generation is a stub** — returns an OTPAuth URL string instead of rendering a QR image. |
| C-19 | **`PasswordContent.verifyPassword` comparison always fails with hashed passwords** — compares raw input directly against stored hash without bcrypt. |
| C-20 | **`DbEncryption` uses weak heuristic** — treats any string containing `":"` as encrypted, triggering unnecessary decryption attempts. |
| C-21 | **Plugin boot errors silently continue** — caught exceptions logged to `console.error` only, no error propagation or fallback. |
| C-22 | **S3 credentials not validated** — empty strings passed to AWS SDK. No error until first API call. |
| C-23 | **`UpgradeManager` uses blocking `execSync` in async methods** — blocks the event loop during database migrations. |
| C-24 | **Hardcoded GitHub URL for version check** — `https://raw.githubusercontent.com/nodepress/nodepress/main/VERSION`. Not configurable. |

### MEDIUM (10)

| ID | Issue |
|----|-------|
| C-25 | Config object stale after `reload()` — in-memory references aren't updated |
| C-26 | Backup race condition — parallel backup operations corrupt archives |
| C-27 | Password text logged in debug mode — potential credential exposure |
| C-28 | OEmbed cache no TTL — entries grow unbounded |
| C-29 | Plugin manifest validation missing in `PluginLoader` |
| C-30 | No request timeout on mail transport — hangs forever on unreachable SMTP |
| C-31 | S3 multipart upload threshold not configurable |
| C-32 | HealthCheck dependencies hardcoded — not extensible |
| C-33 | Event emitter memory leak warning — no listener limit |
| C-34 | Template engine doesn't escape variables in HTML context (XSS in emails) |

### LOW (14)

| ID | Issue |
|----|-------|
| C-35 | SQL injection via string interpolation in raw query builder |
| C-36 | `path.join` fragility on Windows — uses forward slashes |
| C-37 | Memory leak in event emitter — listeners never removed |
| C-38 | No type guard on PluginManifest fields |
| C-39 | `indexOf` instead of `includes` in string checks |
| C-40 | Undocumented config keys |
| C-41 | Missing `@types/bcrypt` dependency |
| C-42 | TSLint comments in TypeScript file |
| C-43 | Deprecated `request` library usage in HTTP client |
| C-44 | Magic number `300000` for timeout (no named constant) |
| C-45 | Regex denial-of-service vector in shortcode parser |
| C-46 | Hardcoded `localhost:5432` in default database config |
| C-47 | `any` type on all `ConfigValue` returns |
| C-48 | Unused utility functions (8 exported, never imported) |

---

## 🔴 D. Editor Package (`packages/editor`) — 25 Issues

### CRITICAL (4)

| ID | File | Issue |
|----|------|-------|
| D-01 | `packages/editor/src/extensions/keymap.ts` | **`"/"` key completely blocked from being typed** — `handleDOMEvents.preventDefault` catches the key event and blocks it globally. Users cannot type `/`. |
| D-02 | `packages/editor/src/utils/block-tree.ts` | **Block tree position tracking incorrect for ProseMirror** — position calculations don't account for ProseMirror's internal document structure. Corrupts document on reorder. |
| D-03 | `packages/editor/src/utils/html.ts` | **`parseFromHtml` destroys all HTML structure** — uses oversimplified regex parsing that strips all nested elements, attributes, and inline formatting. |
| D-04 | `packages/editor/src/utils/node.ts` | **`getPreviousSibling`/`getNextSibling` only search children** — never traverse up to find top-level block siblings. Navigation breaks in flat documents. |

### HIGH (5)

| ID | Issue |
|----|-------|
| D-05 | `packages/editor/src/hooks/use-selected-block.ts` | **`selectedBlock` state never changes** — `setSelectedBlock` is not destructured from the hook return. State is always `null`. |
| D-06 | `packages/editor/src/components/block-inserter.tsx` | **Block inserter doesn't insert without `onInsertBlock` prop** — the component renders but clicking does nothing when the prop is missing. |
| D-07 | `packages/editor/src/stores/block-store.ts` | **Module-level reusable block store prevents SSR and multi-tenant usage** — a singleton module variable is shared across all users/sessions. |
| D-08 | `packages/editor/src/utils/node.ts` | **Unused exported functions** — 4 exported traversal functions that are never imported anywhere (dead code). |
| D-09 | `packages/editor/src/utils/serialize.ts` | **`serializeInline` discards marks when node has children** — inline formatting (bold, italic) lost during serialization of nested nodes. |

### MEDIUM (10)

| ID | Issue |
|----|-------|
| D-10 | Transform button has empty `onClick` handler — `onClick={() => {}}` |
| D-11 | Calendar navigation links use `href="#"` — breaks browser navigation |
| D-12 | Unsafe non-null assertion (`!`) on `inserterRef` |
| D-13 | Block icon map has 19 `"??"` placeholder entries — 19 block types show placeholder icons |
| D-14 | `MediaTextExtension` renders a broken `<video>` element — missing `src` attribute handling |
| D-15 | Column variations registered for wrong block type — variations appear on unrelated blocks |
| D-16 | `getBlockIcon` defined inside component file — not exported, not reusable |
| D-17 | Cover block `backgroundImage` URL not escaped — breaks with special characters |
| D-18 | Image → Gallery transform uses unsafe type assertion — `as GalleryBlock` with no runtime check |
| D-19 | Dynamic block render functions ignore context — all render placeholder data regardless of actual content |

### LOW (6)

| ID | Issue |
|----|-------|
| D-20 | `synced` flag never checked before write operations |
| D-21 | Fragile heading cycle — cycles through 6 heading levels with no wrap-around guard |
| D-22 | Inline toolbar position not recalculated on scroll |
| D-23 | Drag handle renders outside viewport for long documents |
| D-24 | Placeholder text not translatable |
| D-25 | Undo history not cleared on document load |

---

## 🔴 E. Other Packages — 38 Issues

### CRITICAL (6)

| ID | Package | Issue |
|----|---------|-------|
| E-01 | `packages/cli` | **Missing dependencies `"conf"` and `"dotenv"`** — both are imported in source files but absent from `package.json`. Runtime `ERR_MODULE_NOT_FOUND`. |
| E-02 | `packages/db/prisma/schema.prisma` | **Invalid extension name `"uuid_ossp"`** — should be `"uuid-ossp"` (hyphen, not underscore). `prisma migrate dev` fails on provisioning. |
| E-03 | `packages/plugin-sdk` ↔ `packages/core` | **PluginContext type mismatch** — SDK defines `PluginContext.db: unknown` but Core's `PluginBootContext` has `prisma: PrismaClient`. Plugins receive `unknown` and crash when accessing `.prisma`. |
| E-04 | `packages/testing` | **Missing `@nodepress/core` dependency** — `packages/testing/src/setup.ts` imports from `@nodepress/core` but it's not in `package.json`. |
| E-05 | `packages/testing` | **`setFixturesDir()` reassigns a `const` variable** — throws `TypeError: Assignment to constant variable` at runtime. |
| E-06 | `packages/db/prisma/schema.prisma` | **3 Prisma models missing `@default(cuid())` on `id` fields** — `BackupRecord`, `CronEvent`, `MailLog` have nullable/non-defaulted IDs. Inserts fail. |

### HIGH (16)

| ID | Issue |
|----|-------|
| E-07 | **20 of 28 CLI commands are empty stubs with `// TODO`** — 71% of the CLI is non-functional |
| E-08 | **`registerSettingsCommand` never imported in CLI `index.ts`** — the settings command exists but is dead code |
| E-09 | **Seeded users have invalid bcrypt hash** — `$2b$10$...` hardcoded hash doesn't match any known password. No user can log in with seed data. |
| E-10 | **`printTable` imported but never used** in `packages/cli/src/commands/settings.ts` |
| E-11 | **SDK `blocks.ts` imports React** — but `react` is not a dependency of `@nodepress/plugin-sdk`. Import fails. |
| E-12 | **SDK `content.ts` imports `zod` but never uses it** — dead import |
| E-13 | **SDK `HookRegistry` missing `removeAction`/`getActionNames` methods** — incomplete hook system |
| E-14 | **Dynamic Tailwind classes won't work with JIT compiler** — `text-${size}` patterns are treeshaken by Tailwind JIT |
| E-15 | **Button component missing `type="button"` default** — buttons inside forms default to `type="submit"`, causing accidental form submissions |
| E-16 | **Loading spinner lacks `aria-busy`** — screen readers don't announce loading state |
| E-17 | **2 seed functions with different data** — CLI seed and DB package seed produce different initial states |
| E-18 | **Plugin manifest type mismatch** — SDK `PluginManifest` is missing 4 fields that Core expects (`minVersion`, `maxVersion`, `dependencies`, `settings`) |
| E-19 | **UI package Dialog component doesn't close on Escape key** — traps users in modal |
| E-20 | **UI package Toast component positions off-screen on mobile** |
| E-21 | **Config package has no schema validation** — reads env vars but doesn't validate types |
| E-22 | **`packages/db/prisma/seed.ts` uses CommonJS `require` in an ESM project** |

### MEDIUM (12)

| ID | Issue |
|----|-------|
| E-23 | CLI help text formatting broken for commands with >3 aliases |
| E-24 | No error handling in config file watcher |
| E-25 | DB migration files have no down migrations |
| E-26 | Testing setup imports from wrong relative path |
| E-27 | UI package tree-shaking not configured — bundles all components |
| E-28 | SDK exported types conflict with core types |
| E-29 | CLI `--yes` flag doesn't bypass all prompts |
| E-30 | No TypeScript project references between packages |
| E-31 | DB mock data has references to non-existent foreign keys |
| E-32 | Plugin SDK publishConfig points to wrong registry |
| E-33 | Config package missing `.env.example` |
| E-34 | Testing package `vitest.config.ts` has wrong include patterns |

### LOW (4)

| ID | Issue |
|----|-------|
| E-35 | Multiple `console.log` statements in CLI output |
| E-36 | Inconsistent trailing commas across packages |
| E-37 | No `.npmignore` on any package — test files shipped to registry |
| E-38 | License field missing from 3 package.json files |

---

## 🔴 F. Plugins, Web-Starter, Config Files — 68 Issues

### CRITICAL (5)

| ID | File | Issue |
|----|------|-------|
| F-01 | **`pnpm-workspace.yaml` (missing)** | **Monorepo foundation file does not exist.** Every `workspace:*` dependency reference in every `package.json` is broken. `pnpm install` cannot link local packages. **Entire monorepo is uninstallable.** |
| F-02 | **`docker-compose.prod.yml`** | **Syntactically invalid YAML** — contains unescaped `\` characters in strings. Docker Compose refuses to parse. |
| F-03 | **`web-starter/`** | **Missing all Tailwind CSS infrastructure** — no `tailwind.config.ts`, no `postcss.config.js`, no `globals.css`, and `tailwindcss` is not in `package.json`. Site renders completely unstyled. |
| F-04 | **`plugins/*/` (all 5)** | **All 5 plugins are empty stubs** — `cache-redis`, `comments`, `file-editor`, `forms`, `seo`. Each contains only a `console.log` boot message. **0 of 34 claimed features are implemented.** |
| F-05 | **`apps/api/package.json`** | **Has NO `devDependencies`** — missing `@nestjs/cli`, `typescript`, `@types/node`, `@types/express`. `npm run build` cannot execute. |

### HIGH (37)

| ID | Issue |
|----|-------|
| F-06 | **Web-starter: 4 nav links lead to non-existent pages** — `/about`, `/contact`, `/blog/category/*`, `/author/*` all 404 |
| F-07 | **Production Dockerfile missing `packages/config/package.json` COPY** — Docker build fails |
| F-08 | **All Dockerfiles reference `pnpm-workspace.yaml`** — since the file doesn't exist, every `COPY pnpm-workspace.yaml` step fails silently and subsequent steps use stale layers |
| F-09 | **`docker-compose.prod.yml` has broken image references** — image names don't match any Dockerfile |
| F-10 | **`docker-compose.prod.yml` has empty environment variables** — `DATABASE_URL: ""`, `JWT_SECRET: ""` |
| F-11 | **`turbo.json` pipeline may have circular dependency** — `typecheck` depends on `build`, and `build` runs `typecheck` first |
| F-12 | **`.eslintrc.js` ignores ALL `.js` files** — `ignorePatterns: ["*.js"]` means config files like `next.config.js`, `postcss.config.js` are not linted |
| F-13 | **`.prettierrc` has `tailwindConfig` hardcoded to admin app** — `"./apps/admin/tailwind.config.ts"` breaks Prettier in all other packages |
| F-14 | **Cross-platform `rm -rf` scripts fail on Windows** — scripts use `rimraf` inconsistently, some use `rm -rf` directly |
| F-15 | **`package-lock.json` exists alongside `pnpm-lock.yaml`** — confusing dual-lockfile state, may cause CI conflicts |
| F-16 | **Web-starter `package.json` missing `next` dependency** — listed as `workspace:*` but `next` is not in the monorepo |
| F-17 | **No `.dockerignore` in any Docker build context** — `node_modules` and `.git` copied into images |
| F-18 | **Docker Compose services lack `healthcheck` blocks** — no startup ordering |
| F-19 | **`plugins/*/package.json` have no `@nodepress/plugin-sdk` dependency** — all 5 plugins fail to import SDK types |
| F-20 | **Plugin manifests missing required core fields** — no `minVersion`, `maxVersion`, `settings` |
| F-21 | **Web-starter imports from `@nodepress/core` but it's not in dependencies** |
| F-22 | **`tsconfig.base.json` has `paths` that don't resolve** — path aliases point to non-existent files |
| F-23 | **No `.nvmrc` or `engines` field** — no Node.js version constraint |
| F-24 | **TypeScript `strict: true` disabled in some packages** — inconsistent strict mode |
| F-25 | **ESLint `@typescript-eslint` rules disabled in 3 sub-projects** |
| F-26 | **No commit hooks (husky/lint-staged)** — lint violations pass through |
| F-27 | **CI config (`.github/workflows`) missing** — no automated testing |
| F-28 | **Web-starter has no SEO metadata (`<head>` tags)** — no `title`, `meta description`, Open Graph |
| F-29 | **Web-starter 404 page is unstyled** |
| F-30 | **Plugin `seo` has no sitemap generation capability** |
| F-31 | **Plugin `cache-redis` never connects to Redis** — returns noop |
| F-32 | **Plugin `comments` has no moderation UI** — no approve/reject/spam |
| F-33 | **Plugin `forms` has no form builder** — hardcoded contact form only |
| F-34 | **Plugin `file-editor` has no file browser UI** — requires full path input |
| F-35 | **Docker Compose dev overrides missing** — `docker-compose.override.yml` absent |
| F-36 | **No `.env.example` in project root** — developers don't know required env vars |
| F-37 | **API health endpoint not configured as Docker Compose healthcheck** |
| F-38 | **Production docker-compose uses `latest` tags** — unreproducible builds |
| F-39 | **PostgreSQL service in Docker Compose has no volume** — DB data lost on restart |
| F-40 | **Redis service in Docker Compose has no volume** — cache data lost on restart |
| F-41 | **No Docker Compose network configuration** — services use default network with name collisions |
| F-42 | **Web-starter service has no port mapping** — inaccessible outside Docker network |

### MEDIUM (26)

| ID | Issue |
|----|-------|
| F-43 | TypeScript incremental builds not enabled |
| F-44 | ESLint cache not enabled — slow re-linting |
| F-45 | Prettier not configured to run on CI |
| F-46 | `tsconfig.json` `include` patterns miss test files |
| F-47 | No `jest.config.ts` or `vitest.config.ts` at root |
| F-48 | Plugin hot-reload not configured |
| F-49 | Web-starter missing PWA manifest |
| F-50 | Web-starter missing RSS feed link in `<head>` |
| F-51 | Web-starter `<html>` missing `lang` attribute |
| F-52 | Web-starter font loading has no `font-display: swap` |
| F-53 | Web-starter missing `sitemap.xml` |
| F-54 | Web-starter missing `robots.txt` |
| F-55 | Web-starter images missing `loading="lazy"` |
| F-56 | Docker images not multi-arch (no `linux/arm64`) |
| F-57 | Dockerfiles don't use `--frozen-lockfile` — non-reproducible |
| F-58 | Docker build context includes entire monorepo — slow builds |
| F-59 | No `.gitattributes` for line ending normalization |
| F-60 | No `CODEOWNERS` file |
| F-61 | No `CONTRIBUTING.md` |
| F-62 | Plugin SDK version mismatched across plugins |
| F-63 | Web-starter theme not responsive below 320px |
| F-64 | Print stylesheet missing |
| F-65 | No `SECURITY.md` for vulnerability reporting |
| F-66 | Docker Compose env file not `.gitignored` |
| F-67 | `.prettierignore` missing — formats `node_modules`, `dist`, `.next` |
| F-68 | ESLint config doesn't extend `next/core-web-vitals` for web-starter |

### LOW (7)

| ID | Issue |
|----|-------|
| F-69 | Missing `// @ts-check` in JavaScript config files |
| F-70 | EditorConfig file missing |
| F-71 | `.git-blame-ignore-revs` not set up |
| F-72 | Markdown linting not configured |
| F-73 | No commit message convention enforced |
| F-74 | README badges point to non-existent CI |
| F-75 | License file has wrong year |

---

## 🟣 G. WordPress Feature Parity Gaps (from PRD)

The PRD specifies parity with core WordPress functionality. The following features are specified but missing, incomplete, or not wired:

| Feature | Status | Location |
|---------|--------|----------|
| Shortcode System | ⚠️ Engine exists in core, not wired into API | `packages/core/src/shortcodes/` |
| oEmbed | ❌ Stub — returns hardcoded response | `apps/api/src/oembed/` |
| Custom Permalink Structure | ⚠️ Exists in core, not integrated with API | `packages/core/src/permalinks/` |
| Comment System (threading, moderation, Akismet) | ❌ Not implemented | Plugin `comments` is empty stub |
| Content Scheduling | ⚠️ Scheduler exists in core, not hooked to API | `packages/core/src/scheduler/` |
| Trash / Restore | ❌ Not implemented anywhere | |
| Preview Link | ❌ Not implemented anywhere | |
| Diff / Compare Revisions | ❌ Revisions controller is a stub | `apps/api/src/revisions/` |
| Settings / Options Table | ⚠️ Model exists in DB, not used by API | `packages/db/prisma/schema.prisma` |
| ContentMeta | ⚠️ Model exists in DB, not used by API | `packages/db/prisma/schema.prisma` |
| Plugin Dependencies | ⚠️ Exists in core, not wired | `packages/core/src/plugins/` |
| Plugin Update / Rollback | ⚠️ Exists in core, not wired | `packages/core/src/plugins/` |
| Child Themes | ⚠️ Exists in core, web-starter doesn't use | `packages/core/src/themes/` |
| `theme.json` | ⚠️ Exists in core, not integrated | `packages/core/src/themes/` |
| RSS / Atom Feeds | ❌ Stub — returns empty data | `apps/api/src/feeds/` |
| Security Keys / Salts | ⚠️ Exists in core, not wired into API startup | `packages/core/src/auth/salts.ts` |
| Application Passwords | ⚠️ Controller exists, not integrated | `apps/api/src/auth/application-passwords.controller.ts` |
| Password Policy | ⚠️ Exists in core, not enforced in API registration | `packages/core/src/auth/password-policy.ts` |
| Admin Bar | ✅ Implemented | Admin panel |
| DB Migration / Upgrade | ⚠️ Exists in core, not wired | `packages/core/src/upgrade/` |

---

## 📊 H. Summary Statistics

| Area | 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | ⚪ LOW | TOTAL |
|------|:-----------:|:-------:|:---------:|:-----:|:-----:|
| API App (`apps/api`) | 16 | 20 | 15 | 3 | **54** |
| Admin Panel (`apps/admin`) | 8 | 18 | 12 | 8 | **38** |
| Core Package (`packages/core`) | 10 | 14 | 10 | 14 | **48** |
| Editor Package (`packages/editor`) | 4 | 5 | 10 | 6 | **25** |
| Other Packages | 6 | 16 | 12 | 4 | **38** |
| Plugins, Web-Starter, Config | 5 | 37 | 26 | 7 | **68** |
| WordPress Parity Gaps | — | — | — | — | **20** |
| **TOTAL** | **49** | **110** | **85** | **42** | **286** |

### Severity Distribution

```
CRITICAL ████████████████████████████████████▉  49
HIGH     ████████████████████████████████████████████████████████████████████████████████  110
MEDIUM   █████████████████████████████████████████████████████████████████████████▋  85
LOW      █████████████████████████████████▏  42
```

---

## 🎯 I. Top 10 Priority Fixes (Do First)

| Priority | Action | Why |
|----------|--------|-----|
| **P0** | Create `pnpm-workspace.yaml` | Without it, `pnpm install` fails. **Nothing else works.** |
| **P1** | Populate `apps/api/src/app.module.ts` | Without it, the NestJS API cannot bootstrap. |
| **P2** | Add `devDependencies` to `apps/api/package.json` | Without it, the API cannot compile. |
| **P3** | Fix Prisma schema: `uuid_ossp` → `uuid-ossp` | Without it, database provisioning fails. |
| **P4** | Create Tailwind infrastructure for web-starter | Without it, the frontend renders as unstyled HTML. |
| **P5** | Fix `docker-compose.prod.yml` syntax | Without it, production deployment is impossible. |
| **P6** | Add Prisma/DB persistence to all API services | Without it, all data is lost on every restart. |
| **P7** | Register all 5 middleware modules (RateLimit, CORS, TrustedHost, Maintenance, InstallCheck) | Without it, no middleware runs; no security, no rate limiting, no CORS. |
| **P8** | Align SDK `PluginContext` with Core `PluginBootContext` | Without it, all 5 plugins crash immediately on boot. |
| **P9** | Fix JWT fallback secrets and password reset flow | Without it, auth tokens are forgeable and password reset is broken. |

### Suggested Fix Order (Phases)

```
Phase 1 — Infrastructure (P0–P5)
  Create pnpm-workspace.yaml → Fix package.jsons → Fix Docker → Fix Prisma → Fix Tailwind

Phase 2 — API Runtime (P6–P9)  
  Add DB queries to all services → Register middleware → Fix auth → Fix SDK type

Phase 3 — Admin Panel
  Fix auth tokens → Add API integration → Add auth guard → Fix routes → Fix forms

Phase 4 — Core Package
  Fix JWT secrets → Fix password hashing → Fix crypto imports → Fix cron parser

Phase 5 — Editor & Plugins
  Fix key blocking → Fix HTML parser → Implement plugin features → Fix block tree

Phase 6 — WordPress Parity
  Wire all existing engine stubs → Implement missing features → Test against PRD
```

---

## 🚫 J. Verdict

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                    🚫  BLOCK  🚫                             ║
║                                                              ║
║   This codebase has foundational issues that prevent it      ║
║   from functioning in any capacity.                          ║
║                                                              ║
║   - The monorepo cannot be installed (no workspace config)   ║
║   - The API cannot boot (empty app module, no deps)          ║
║   - The database cannot provision (bad extension name)       ║
║   - The admin panel cannot authenticate (no API integration) ║
║   - All 5 plugins are empty (0 of 34 features implemented)   ║
║   - All data is lost on restart (in-memory storage)          ║
║   - Tokens are forgeable (hardcoded JWT secrets)             ║
║                                                              ║
║   RECOMMENDATION: Pause all feature development.             ║
║   Execute Phase 1–3 of the fix plan before writing           ║
║   any new code.                                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

*Audit completed July 3, 2026. 6 parallel agents, 286 issues identified across 7 categories. Full remediation estimate: 4–6 weeks for 2 engineers.*
