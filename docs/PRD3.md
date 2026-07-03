# PRD v3: NodePress — Gap Analysis Komprehensif (15 Chiefs)

**Versi:** 3.0 | **Tanggal:** 3 Juli 2026
**Status:** Final Gap Analysis — Sintesis 15 Chiefs

> Analisis gap komparatif sistematis: 147 gap dari 9 domain. PRD1 (v1.0) + PRD2 (v2.0) vs WordPress Core.

---

## 1. Executive Summary

**Total gap: 147** (32 Critical, 65 High, 40 Medium, 10 Low)

| Domain | Total | Critical | High | Medium | Low |
|--------|-------|----------|------|--------|-----|
| A. Content Management | 18 | 5 | 8 | 4 | 1 |
| B. Data Model & DB | 14 | 3 | 6 | 4 | 1 |
| C. Plugin System | 22 | 6 | 10 | 5 | 1 |
| D. Theme & Rendering | 20 | 4 | 10 | 5 | 1 |
| E. Block Editor | 12 | 2 | 5 | 4 | 1 |
| F. Security | 18 | 5 | 8 | 4 | 1 |
| G. Performance | 10 | 1 | 4 | 4 | 1 |
| H. Developer Experience | 18 | 3 | 8 | 5 | 2 |
| I. Operational & Admin | 15 | 3 | 6 | 5 | 1 |

### Top 10 Critical untuk v1.0:
1. Shortcode System — backbone migrasi WP, shortcode = bahasa CMS
2. oEmbed / Auto-Embed — paste URL → embed adalah UX paling ikonik WP
3. Custom Permalink Structure — SEO fundamental
4. Plugin Dependencies — plugin system tidak bisa scale tanpa ini
5. Plugin Update & Rollback — keamanan jangka panjang
6. Child Theme System — kustomisasi aman
7. theme.json (Global Styles) — fondasi Full Site Editing
8. Security Keys/Salts — fondasi kriptografi
9. Recovery Mode — safety net plugin crash
10. Data Migration / Upgrade Path — operasional upgrade antar versi

---

## 2. Gap Detail per Domain

### A. Content Management (18 gaps)

**A-01 Shortcode System** [CRITICAL]
- WP: dd_shortcode(), do_shortcode(), 	he_content filter
- Gap: [gallery], [audio], [video], [embed], [caption], [playlist] tidak ada
- Rekomendasi: Shortcode Engine parser regex, registerShortcode() di SDK, Tiptap extension preview inline, built-in shortcodes untuk gallery/audio/video/embed

**A-02 oEmbed / Auto-Embed** [CRITICAL]
- WP: wp_oembed_get(), oEmbed proxy 40+ provider
- Gap: Paste URL → auto-embed tidak ada
- Rekomendasi: oEmbed Provider Registry, proxy endpoint /api/oembed/proxy, cache Redis TTL 24h

**A-03 Custom Permalink Structure** [CRITICAL]
- WP: /%year%/%monthnum%/%day%/%postname%/
- Gap: Hanya slug-based, tanpa struktur kustom
- Rekomendasi: Permalink Manager, structure tags, Rewrite Engine, redirect_guess_404()

**A-04 Post Formats** [HIGH]
- WP: aside, gallery, link, image, quote, status, video, audio, chat
- Gap: Tidak ada format-specific rendering hint
- Rekomendasi: field postFormat, template hierarchy single-{type}-{format}.tsx

**A-05 Sticky Posts** [HIGH]
- WP: Sticky checkbox di publish meta box
- Rekomendasi: field isSticky, query sort sticky first

**A-06 Password-Protected Content** [HIGH]
- WP: Post password, form otomatis
- Rekomendasi: field postPassword (bcrypt), POST /api/content/:id/unlock

**A-07 Excerpt** [HIGH]
- WP: Ringkasan konten terpisah
- Rekomendasi: field excerpt, auto-generate 55 kata

**A-08 Featured Image** [HIGH]
- WP: featuredImageId relasi ke Media
- Rekomendasi: featuredImage field, panel sidebar editor, sizes via addImageSize()

**A-09 Page Templates** [HIGH]
- WP: Template Name file header
- Rekomendasi: field template, page-{slug}.tsx, dropdown di sidebar

**A-10 Custom CSS/JS per Entry** [MEDIUM]
- field customCss, customJs, inject di head/footer

**A-11 Private Content** [MEDIUM]
- Status PRIVATE, visibility check via capability

**A-12 Pending Review Workflow** [MEDIUM]
- DRAFT→PENDING_REVIEW→PUBLISHED state machine

**A-13 Comment System Detail** [HIGH]
- Threading, gravatar, moderation, whitelisting, Akismet hook
- REST: GET/POST /api/content/:type/:id/comments
- Webhook: comment.created, comment.statusChanged

**A-14 Pingbacks/Trackbacks** [MEDIUM]
- field pingStatus, commentType pingback/trackback

**A-15 Content Scheduling Detail** [HIGH]
- Scheduled status + cron job untuk publish otomatis

**A-16 Trash Auto-Purge Config** [MEDIUM]
- Setting: trash retention days (default 30)

**A-17 Preview Link with Expiry** [MEDIUM]
- Signed URL preview untuk draft, expiry configurable

**A-18 Diff/Compare Revisions** [MEDIUM]
- Side-by-side diff di admin panel per field

---

### B. Data Model & Database (14 gaps)

**B-01 Settings / Options Table** [CRITICAL]
- Model Setting: (group, key, value, autoload, pluginId)
- WP equivalent: wp_options (17.8K rows rata-rata)

**B-02 ContentMeta (Post Meta)** [HIGH]
- Model ContentMeta: (entryId, key, value)
- Strategi hybrid: JSONB untuk read, EAV untuk query

**B-03 UserMeta** [HIGH]
- Model UserMeta: (userId, key, value)

**B-04 TermMeta** [MEDIUM]
- Model TermMeta: (termId, key, value)

**B-05 CommentMeta** [MEDIUM]
- Model CommentMeta: (commentId, key, value)

**B-06 Session Table** [MEDIUM]
- Model Session: persisted fallback untuk Redis

**B-07 Transients** [LOW]
- Model Transient: optional, Redis sudah cover

**B-08 ScheduledAction** [MEDIUM]
- Model ScheduledAction: persisted queue records

**B-09 ContentEntry additional fields (11 fields):**
- excerpt, featuredImageId, commentStatus, pingStatus, postPassword, menuOrder, isSticky, postFormat, template, customCss, customJs

**B-10 User additional fields (8 fields):**
- displayName, biography, websiteUrl, locale, userStatus, activationKey, userRegistered, forcePasswordChange

**B-11 Media additional fields (8 fields):**
- width, height, fileSize, focalPoint, customSizes, metadata, title, description

**B-12 Comment additional fields (6 fields):**
- userAgent, ipAddress, rating, commentType, commentKarma, userId

**B-13 Term additional fields (4 fields):**
- description, termGroup, count, termOrder

**B-14 Indexes & Performance:**
- GIN JSONB: ContentEntry.data, Revision.data
- Composite: (authorId,status,publishedAt), (contentTypeId,status,publishedAt)
- Full-Text Search: tsvector + GIN
- Partial: published entries, draft entries

---

### C. Plugin System (22 gaps)

[C-01] Plugin Dependencies [CRITICAL] — semver range, DAG resolution, circular detection
[C-02] Plugin Update Mechanism [CRITICAL] — registry check, SHA-256 verify, health check
[C-03] Plugin Rollback [HIGH] — backup sebelum update, auto-restore jika gagal
[C-04] Plugin Uninstall Hook [HIGH] — cleanup DB, options, files
[C-05] Plugin Settings API [HIGH] — auto-generated form via Zod schema
[C-06] Must-Use Plugins [HIGH] — mu-plugins direktori, tidak bisa deactivate
[C-07] Activation/Deactivation Hooks [MEDIUM] — one-time setup
[C-08] Plugin Capability Integration [HIGH] — registerCapability(), role editor
[C-09] Plugin DB Migration [CRITICAL] — registerMigration(), up/down
[C-10] Plugin Cron API [HIGH] — registerCron(), backed by BullMQ
[C-11] Plugin Shortcode System [CRITICAL] — lihat A-01
[C-12] Plugin Assets Enqueuing [HIGH] — enqueueScript/Style, concat+minify
[C-13] Plugin File Editor [MEDIUM] — Monaco Editor, admin panel
[C-14] Plugin Readme Parser [MEDIUM] — metadata display
[C-15] Beta/Stable Channel [LOW] — channel management
[C-16] Automatic Plugin Updates [HIGH] — BullMQ repeatable job
[C-17] Plugin Translation [MEDIUM] — __('Hello World'), _n()
[C-18] Plugin Upgrade Notice [LOW] — breaking change warnings
[C-19] Plugin Locking [MEDIUM] — env LOCKED_PLUGINS
[C-20] Network Activation [LOW] — untuk multisite v2
[C-21] Plugin Sandboxing Detail [CRITICAL] — isolated-vm, memoryLimit 128MB, timeout 5s
[C-22] Plugin Block Registration [HIGH] — registerBlock() via SDK

---

### D. Theme & Rendering (20 gaps)

[D-01] Child Theme System [CRITICAL] — manifest {template}, ThemeResolver chain
[D-02] theme.json Global Styles [CRITICAL] — CSS custom properties, FSE config
[D-03] Theme Customizer [HIGH] — live preview iframe, WebSocket selective refresh
[D-04] Block Patterns [HIGH] — pre-designed layouts, registerPattern()
[D-05] Template Parts [HIGH] — header/footer reusable, edit via Block Editor
[D-06] Block Template Registration [HIGH] — default blocks per post type
[D-07] Theme Functions/Setup [HIGH] — theme.config.ts, registerNavMenu, addSupport
[D-08] Widget Areas Detail [HIGH] — Block Areas, registerBlockArea()
[D-09] Theme Feature Support [HIGH] — post-thumbnails, custom-logo, title-tag
[D-10] Nav Menu Location [MEDIUM] — registerNavMenu, cache Redis
[D-11] Custom Logo/Header/BG [MEDIUM] — Appearance → Branding page
[D-12] Theme Editor [LOW] — Monaco Editor, DISABLE_FILE_EDITOR env
[D-13] Theme Auto-Update [MEDIUM] — BullMQ repeatable job
[D-14] Theme Preview [MEDIUM] — cookie-based preview session
[D-15] Theme Tags & Registry [MEDIUM] — theme directory, search by tag
[D-16] Theme Style Variations [MEDIUM] — dark mode, preset switching
[D-17] RSS/Atom Feeds [HIGH] — /feed/, /feed/atom/, per content type
[D-18] Sitemap XML [HIGH] — standard XML sitemap + sitemap index
[D-19] Template Hierarchy Detail [MEDIUM] — archive, taxonomy, author, date, search, 404
[D-20] robots.txt Generator [MEDIUM] — dynamic, hook untuk kustomisasi

---

### E. Block Editor (12 gaps)

[E-01] Block Supports [CRITICAL] — align, anchor, color, typography, spacing per block
[E-02] Dynamic Blocks [CRITICAL] — server-rendered, Recent Posts, Latest Comments
[E-03] Block Categories [MEDIUM] — registerBlockCategory()
[E-04] Block Styles [MEDIUM] — alternate visual styles per block
[E-05] Block Variations [MEDIUM] — pre-configured instances
[E-06] Block Transformations [HIGH] — heading↔paragraph, list↔paragraph
[E-07] Reusable Blocks [HIGH] — synced patterns across site
[E-08] Quick Inserter [/] [MEDIUM] — command palette
[E-09] Block Locking [MEDIUM] — prevent move/remove/edit
[E-10] Navigation Mode [LOW] — keyboard select parent/child
[E-11] Media & Text Block [MEDIUM] — side-by-side
[E-12] Cover Block [MEDIUM] — full-width background with overlay

---

### F. Security (18 gaps)

[F-01] Security Keys/Salts [CRITICAL] — AUTH_KEY, NONCE_KEY, SECRET_KEY, rotasi
[F-02] Recovery Mode [CRITICAL] — plugin watchdog, /api/recovery, bypass plugins
[F-03] Trusted Host Validation [CRITICAL] — APP_URL, Host header middleware
[F-04] Application Passwords [HIGH] — per-user REST API tokens
[F-05] File Integrity Checking [HIGH] — checksum.json, nodepress-cli core verify
[F-06] Password Policy [HIGH] — zxcvbn, history, expiry
[F-07] Forced Password Change [MEDIUM] — field forcePasswordChange
[F-08] CORS Policy [HIGH] — allowed origins admin panel
[F-09] CSP Headers [HIGH] — default admin CSP, report-only mode
[F-10] Subresource Integrity [MEDIUM] — integrity hash build time
[F-11] OAuth Server [MEDIUM] — OAuth 2.0 for external apps
[F-12] Session Terms [MEDIUM] — remember me duration config
[F-13] Privacy Hooks [MEDIUM] — cookie consent, data retention
[F-14] Maintenance Mode [MEDIUM] — 503 maintenance page
[F-15] DB Encryption [MEDIUM] — pgcrypto, application-level
[F-16] Security Audit Trail [HIGH] — login attempts, permission changes
[F-17] Rate Limiting [HIGH] — sliding window, progressive lockout, CAPTCHA
[F-18] Vuln Disclosure Policy [LOW] — security.txt

---

### G. Performance (10 gaps)

[G-01] Object Cache Drop-In [CRITICAL] — Redis/Memcached interchangeable
[G-02] Query Optimization [HIGH] — DataLoader, cursor pagination, slow query log
[G-03] Cache Invalidation [HIGH] — tag-based, event-driven
[G-04] Connection Pooling [HIGH] — PgBouncer mandatory, pool sizing
[G-05] Bundle Size Budget [HIGH] — <200KB gzip admin, code-splitting
[G-06] Script Loader [MEDIUM] — concat, minify, versioning
[G-07] Lazy Loading [MEDIUM] — native loading=lazy, srcset
[G-08] Critical CSS [MEDIUM] — extract inline above-fold
[G-09] Query Monitor [MEDIUM] — Prisma middleware in debug mode
[G-10] Feed Caching [LOW] — Redis, ETag

---

### H. Developer Experience (18 gaps)

[H-01] WP-CLI Completeness [CRITICAL] — 30+ commands
[H-02] Debug Mode [CRITICAL] — NODEPRESS_DEBUG, stack traces, query log
[H-03] Factory/Fixture System [HIGH] — createEntry(), createUser(), TestServer
[H-04] Plugin Test Framework [HIGH] — @nodepress/plugin-test-utils
[H-05] Error Levels [HIGH] — deprecated, notice, warning, strict
[H-06] Query Monitor Dev [MEDIUM] — admin panel debug page
[H-07] Debug Bar [LOW] — admin footer metrics
[H-08] Conventional Commits [MEDIUM] — commitlint + husky
[H-09] Changesets [HIGH] — semantic versioning, changelog auto
[H-10] RFC Process [MEDIUM] — /rfcs folder, ADR
[H-11] PR/Issue Templates [MEDIUM] — standardized templates
[H-12] Contributor Guide [HIGH] — CONTRIBUTING.md, CODE_OF_CONDUCT.md
[H-13] Plugin Docs Site [MEDIUM] — Docusaurus, API reference
[H-14] Community Channels [LOW] — Discord, GitHub Discussions
[H-15] Code Quality CI [HIGH] — ESLint, Prettier, strict TS
[H-16] Performance CI [HIGH] — k6 benchmark, regression alert
[H-17] Security CI [HIGH] — SAST, dependency scan, container scan
[H-18] CLI Implementation [CRITICAL] — semua commands

---

### I. Operational & Admin (15 gaps)

[I-01] DB Migration/Upgrade [CRITICAL] — versioned, dry-run, rollback
[I-02] Backup/Restore CLI [CRITICAL] — pg_dump + media + config
[I-03] Admin Bar [CRITICAL] — top toolbar saat login
[I-04] Admin Notices [HIGH] — success, error, warning, info
[I-05] Dashboard Widgets [HIGH] — At a Glance, Activity, Quick Draft
[I-06] Screen Options [HIGH] — pagination, columns, layout per user
[I-07] Bulk Quick-Edit [HIGH] — inline edit, bulk actions
[I-08] Site Health [HIGH] — server info, checks, recommendations
[I-09] Updates Page [HIGH] — core, plugin, theme updates
[I-10] Log Rotation [HIGH] — pino-roll, retention config
[I-11] Health Check Detail [MEDIUM] — /healthz, /readyz, /health/details
[I-12] DB Cleanup [HIGH] — auto-purge trash, spam, old revisions
[I-13] Translation System [MEDIUM] — __(''), locale JSON files
[I-14] Cron Event Viewer [MEDIUM] — admin panel scheduled tasks
[I-15] Admin Color Schemes [LOW] — light/dark mode

---

## 3. Updated Prisma Schema

### New Models (8):
```prisma
model Setting { id String @id @default(cuid()); group String; key String; value Json; autoload Boolean; pluginId String?; @@unique([group, key]) }
model ContentMeta { id String @id @default(cuid()); entryId String; key String; value Json; @@unique([entryId, key]) }
model UserMeta { id String @id @default(cuid()); userId String; key String; value Json; @@unique([userId, key]) }
model TermMeta { id String @id @default(cuid()); termId String; key String; value Json; @@unique([termId, key]) }
model CommentMeta { id String @id @default(cuid()); commentId String; key String; value Json; @@unique([commentId, key]) }
model Session { id String @id; userId String; payload Json; ipAddress String?; userAgent String?; expiresAt DateTime; @@index([userId]) }
model ScheduledAction { id String @id @default(cuid()); hook String; args Json?; status String; scheduledAt DateTime?; attempts Int; lastError String?; @@index([status, scheduledAt]) }
model ApplicationPassword { id String @id @default(cuid()); userId String; name String; hashedPassword String; lastUsedAt DateTime?; revokedAt DateTime?; @@index([userId]) }
```

### Field Additions:
- ContentEntry: +11 fields (excerpt, featuredImageId, commentStatus, pingStatus, postPassword, menuOrder, isSticky, postFormat, template, customCss, customJs)
- User: +8 fields (displayName, biography, websiteUrl, locale, userStatus, activationKey, userRegistered, forcePasswordChange)
- Media: +8 fields (width, height, fileSize, focalPoint, customSizes, metadata, title, description)
- Comment: +6 fields (userAgent, ipAddress, rating, commentType, commentKarma, userId)
- Term: +4 fields (description, termGroup, count, termOrder)

### Additional Indexes:
- GIN JSONB: ContentEntry.data, Revision.data
- Composite: (authorId,status,publishedAt), (contentTypeId,status,publishedAt), (slug,contentTypeId)
- Full-Text Search: tsvector + GIN index
- Partial: published entries WHERE status='PUBLISHED', drafts WHERE status IN ('DRAFT','PENDING_REVIEW')

---

## 4. Priority Roadmap

### Fase 0 — Foundation (3 minggu)
Setting table, Security Keys, Debug Mode, Trusted Host, CLI scaffold, Monorepo setup

### Fase 1 — Content Engine + Gap (5 minggu)
Permalink Structure, Excerpt, Featured Image, Post Formats, Sticky Posts, Password Content

### Fase 2 — Admin Panel + Gap (6 minggu)
Admin Bar, Admin Notices, Dashboard Widgets, Screen Options, Bulk Quick-Edit, Updates Page

### Fase 3 — Editor & Media (4 minggu)
Block Supports, Dynamic Blocks, Reusable Blocks, Block Transformations

### Fase 4 — Plugin System (4 minggu)
Plugin Dependencies, Update/Rollback, Settings API, mu-plugins, Sandboxing Detail, DB Migration, Cron API, Assets Enqueuing, Capability Integration

### Fase 5 — Theme/Rendering (4 minggu)
Child Themes, theme.json, Template Parts, Block Patterns, Theme Customizer, Feeds, Sitemap, Template Hierarchy

### Fase 6 — Security Hardening (4 minggu)
Recovery Mode, Rate Limiting, CORS, CSP, Application Passwords, Password Policy, Security Audit Trail, Maintenance Mode, File Integrity

### Fase 7 — Developer Experience (4 minggu)
CLI completeness, Debug Mode, Factory/Fixture, Test Framework, Changesets, Contributor Guide, CI/CD pipelines

### Fase 8 — Operational (3 minggu)
DB Migration/Upgrade, Backup/Restore, Health Check, Log Rotation, DB Cleanup, Translation System, Cron Viewer

---

## 5. WordPress Feature Parity Checklist

| Fitur | Status |
|-------|--------|
| Custom Post Types | ✅ Full |
| Custom Fields | ⚠️ Perlu ContentMeta |
| Taxonomies | ✅ Full |
| Block Editor | ✅ Full |
| Shortcodes | ❌ Gap A-01 |
| oEmbed | ❌ Gap A-02 |
| Post Formats | ❌ Gap A-04 |
| Sticky Posts | ❌ Gap A-05 |
| Password Protected | ❌ Gap A-06 |
| Private Content | ❌ Gap A-11 |
| Featured Image | ❌ Gap A-08 |
| Page Templates | ❌ Gap A-09 |
| Plugin System | ✅ Full |
| Plugin Dependencies | ❌ Gap C-01 |
| Plugin Update | ❌ Gap C-02 |
| Child Themes | ❌ Gap D-01 |
| theme.json | ❌ Gap D-02 |
| Theme Customizer | ❌ Gap D-03 |
| Block Patterns | ❌ Gap D-04 |
| RSS/Atom Feeds | ❌ Gap D-17 |
| REST API | ✅ Full |
| GraphQL | ✅ Plus |
| Security Keys | ❌ Gap F-01 |
| Recovery Mode | ❌ Gap F-02 |
| Application Passwords | ❌ Gap F-04 |
| WP-CLI | ❌ Gap H-01 |
| Admin Bar | ❌ Gap I-03 |
| Site Health | ❌ Gap I-08 |

---

Dokumen ini disintesis oleh CEO dari analisis 15 Chiefs: Product, Technology, Data, Marketing, Operations, Financial, HR, Security, Legal, Revenue, Strategy, Information, Sustainability, Experience, General.
