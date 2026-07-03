# PRD: NodePress — WordPress Versi Full Node.js/JavaScript

**Versi Dokumen:** 1.0
**Tanggal:** 3 Juli 2026
**Status:** Living Document — v1.0 Implemented
**Author:** Product & Engineering Team

> **Note:** This document reflects the original v1.0 specification. All Must Have features are implemented. See [PRD4.md](./PRD4.md) for current status.

---

## 1. Executive Summary

**NodePress** adalah Content Management System (CMS) open-source yang dibangun 100% menggunakan JavaScript/TypeScript, dirancang untuk mereplikasi dan memodernisasi fungsionalitas inti WordPress tanpa dependensi PHP sama sekali. Target utamanya adalah developer JavaScript/TypeScript yang ingin punya CMS fleksibel dengan DX (Developer Experience) modern, type-safety penuh, dan arsitektur headless-first, tanpa harus context-switch ke ekosistem PHP.

**Masalah yang diselesaikan:**

- WordPress core berbasis PHP, sulit di-extend dengan type-safety modern
- Ekosistem plugin WP sering bentrok, performa menurun seiring banyak plugin aktif
- Developer JS/TS harus belajar stack berbeda (PHP + MySQL query lama) untuk customize WP
- Headless WP butuh plugin tambahan (WPGraphQL, ACF to REST) yang tidak native

**Value proposition:**

- Satu bahasa dari database sampai frontend (TypeScript end-to-end)
- Content modeling yang type-safe dan schema-driven
- Admin panel modern (React-based) dengan editor block seperti Gutenberg
- Plugin/hook system yang terinspirasi WP Actions & Filters, tapi dengan TypeScript interfaces
- Bisa dipakai headless (API-only) atau full-stack (dengan rendering engine bawaan)

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

Menjadi CMS pilihan utama bagi developer JavaScript yang menginginkan pengalaman "WordPress-like" — mudah dipakai non-technical user di admin panel, namun sepenuhnya dapat di-extend dan di-deploy dengan tooling modern JS.

### 2.2 Goals (12 bulan pertama)

| Goal                                 | Metrik Target                                                      |
| ------------------------------------ | ------------------------------------------------------------------ |
| MVP dengan fitur inti setara WP core | 100% dari fitur "Must Have" di Section 5 selesai                   |
| Performa API                         | p95 response time < 150ms untuk read operations                    |
| Adopsi awal                          | 500 GitHub stars, 50 instalasi produksi dalam 6 bulan setelah v1.0 |
| Plugin ecosystem                     | Minimal 10 plugin resmi (SEO, cache, forms, e-commerce dasar)      |
| Dokumentasi                          | Coverage 100% untuk public API & hook system                       |

### 2.3 Non-Goals (di luar scope v1)

- Multisite/Network admin (dijadwalkan v2)
- Visual page builder drag-and-drop tingkat lanjut (seperti Elementor)
- Marketplace plugin berbayar
- Migrasi otomatis 1:1 dari WordPress (hanya disediakan tool import dasar)

---

## 3. Background & Analisis Kompetitor

| Produk      | Bahasa             | Kelebihan                                     | Kekurangan                                                                        |
| ----------- | ------------------ | --------------------------------------------- | --------------------------------------------------------------------------------- |
| WordPress   | PHP + MySQL        | Ekosistem plugin/tema terbesar, sangat matang | Tidak type-safe, performa menurun dengan banyak plugin, arsitektur monolitik lama |
| Strapi      | Node.js/TS         | Admin panel matang, plugin system jelas       | Schema builder kurang fleksibel untuk relasi kompleks                             |
| Payload CMS | TypeScript         | DX terbaik, config-as-code, native TS         | Ekosistem plugin masih kecil, learning curve untuk non-dev                        |
| KeystoneJS  | TypeScript/GraphQL | GraphQL-first, schema declarative kuat        | Admin UI kurang customizable, less content-editor friendly                        |
| Ghost       | Node.js            | Fokus publishing, performa bagus              | Content model kaku, tidak fleksibel untuk custom post type kompleks               |

**Positioning NodePress:** kombinasi antara familiarity WordPress (post types, taxonomies, plugin/hook, tema) dengan DX modern Payload/Strapi (TypeScript penuh, schema-as-code, admin panel auto-generated).

---

## 4. Target Users & Personas

**Persona 1 — "Dev Freelancer" (mirip Aditya)**
Developer full-stack yang biasa mengerjakan banyak proyek klien sekaligus (NestJS/Next.js), butuh CMS yang bisa di-embed cepat ke project tanpa harus belajar PHP, dan ingin sepenuhnya mengontrol schema data lewat code.

**Persona 2 — "Content Editor Non-Technical"**
Staff marketing/UMKM yang perlu update konten website tanpa sentuh code, mengharapkan admin panel semudah wp-admin.

**Persona 3 — "Agency/Startup CTO"**
Butuh CMS yang bisa di-deploy sebagai headless API untuk banyak frontend (web, mobile), dengan kontrol penuh atas infrastruktur (self-hosted, tidak vendor lock-in).

---

## 5. Scope & Prioritas Fitur (MoSCoW)

### Must Have (MVP — v1.0)

- Content type builder (custom post types) via schema config
- Custom fields (text, richtext, number, boolean, relation, media, date, JSON)
- Taxonomies (categories & tags, hierarchical & flat)
- Block-based rich text editor (mirip Gutenberg)
- Media library dengan upload, resize otomatis, alt text
- Auth & RBAC (role: Super Admin, Admin, Editor, Author, Contributor, Subscriber)
- REST API auto-generated dari content type schema
- GraphQL API (opsional, toggle per instance)
- Plugin/Hook system (actions & filters, event-driven)
- Theme rendering engine (SSR/ISR via Next.js) — mode headless maupun coupled
- Menu builder (navigasi)
- Revisions & draft/publish workflow
- Slug & permalink management
- Basic SEO fields (meta title, description, OG image) built-in
- CLI tool untuk scaffolding project baru (`npx create-nodepress-app`)

### Should Have (v1.1 – v1.5)

- Comment system dengan moderasi & anti-spam (Akismet-like via plugin)
- Search internal (full-text search, Postgres `tsvector` atau Meilisearch integration)
- Scheduled publishing
- Multi-language content (i18n) built-in
- Import/export tool (termasuk import dari WordPress XML export)
- Webhooks untuk integrasi eksternal
- Image optimization pipeline (WebP/AVIF auto-convert)
- Caching layer (Redis) untuk API response

### Could Have (v2+)

- Multisite/network admin
- Visual page builder (drag & drop block layout)
- E-commerce plugin resmi (mirip WooCommerce)
- Marketplace plugin/tema pihak ketiga
- Real-time collaborative editing (mirip Google Docs, via CRDT/Yjs)
- AI content assistant terintegrasi (auto-generate draft, alt text, SEO suggestion)

### Won't Have (v1)

- Dukungan hosting shared cPanel klasik (fokus ke containerized/cloud deployment)
- Backward compatibility dengan plugin PHP WordPress

---

## 6. System Architecture

### 6.1 High-Level Architecture Diagram (deskripsi)

```
                        ┌───────────────────────────┐
                        │      CLI (create-nodepress-app) │
                        └───────────────┬───────────┘
                                        │ scaffold
        ┌───────────────────────────────┴────────────────────────────────┐
        │                          Monorepo (Turborepo/Nx)                │
        │                                                                  │
        │  ┌────────────────────┐        ┌────────────────────────────┐  │
        │  │  Admin Panel (Next) │◄──────►│   Core API (NestJS)         │  │
        │  │  - Content editor    │  REST/  │  - Auth module             │  │
        │  │  - Type builder UI   │  GraphQL│  - Content module          │  │
        │  │  - Media library UI  │        │  - Media module             │  │
        │  │  - Settings UI       │        │  - Plugin/Hook engine       │  │
        │  └────────────────────┘        │  - Webhook dispatcher       │  │
        │                                  └───────────┬─────────────────┘ │
        │                                              │ Prisma ORM        │
        │                                  ┌───────────▼─────────────────┐ │
        │                                  │  PostgreSQL (primary store) │ │
        │                                  │  Redis (cache/queue)        │ │
        │                                  │  S3-compatible (media)      │ │
        │                                  └──────────────────────────────┘ │
        │                                                                  │
        │  ┌────────────────────────────────────────────────────────────┐ │
        │  │   Public Site Renderer (Next.js — SSR/ISR/SSG)              │ │
        │  │   - Theme system (template hierarchy mirip WP)              │ │
        │  │   - Fetch via Core API                                      │ │
        │  └────────────────────────────────────────────────────────────┘ │
        └───────────────────────────────────────────────────────────────┘
```

### 6.2 Deployment Model

Mendukung dua mode:

1. **Coupled Mode** — Admin, API, dan Public Renderer di-deploy sebagai satu aplikasi Next.js (App Router + API routes), cocok untuk proyek kecil/menengah.
2. **Headless Mode** — Core API (NestJS) di-deploy terpisah, Public Renderer bisa berupa frontend apapun (Next.js, mobile app, dsb), berkomunikasi lewat REST/GraphQL.

### 6.3 Monorepo Structure

```
nodepress/
├── apps/
│   ├── admin/              # Next.js admin panel
│   ├── api/                 # NestJS core API
│   └── web-starter/         # Contoh public theme (Next.js)
├── packages/
│   ├── core/                 # Business logic: content engine, hook engine
│   ├── db/                   # Prisma schema + migrations
│   ├── plugin-sdk/           # Types & helper untuk bikin plugin pihak ketiga
│   ├── ui/                   # Shared component library (admin + theme)
│   ├── editor/                # Block editor (Tiptap-based)
│   └── cli/                   # create-nodepress-app CLI
├── plugins/
│   ├── seo/
│   ├── cache-redis/
│   ├── comments/
│   └── forms/
└── turbo.json
```

---

## 7. Tech Stack

| Layer                         | Teknologi                                                           | Alasan                                                                   |
| ----------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Bahasa                        | TypeScript (end-to-end)                                             | Type safety dari DB sampai UI                                            |
| Core API                      | NestJS                                                              | Modular, DI-based, cocok untuk arsitektur plugin                         |
| Admin Panel & Public Renderer | Next.js (App Router)                                                | SSR/ISR, ekosistem React matang                                          |
| ORM & Database                | Prisma + PostgreSQL                                                 | Schema-as-code, migration terkelola, mendukung JSONB untuk custom fields |
| Editor                        | Tiptap (ProseMirror-based)                                          | Block-based editing mirip Gutenberg, extensible                          |
| Auth                          | NestJS + Passport + JWT, opsional OAuth (Google/GitHub)             | Standar industri, gampang extend                                         |
| Cache & Queue                 | Redis + BullMQ                                                      | Caching API response, background job (image resize, webhook dispatch)    |
| Media Storage                 | S3-compatible (AWS S3/MinIO/Cloudflare R2)                          | Fleksibel, cocok cloud-native                                            |
| Search                        | Postgres full-text search (default) → Meilisearch (opsional plugin) | Default ringan, opsional upgrade performa                                |
| GraphQL                       | Apollo Server (via NestJS `@nestjs/graphql`)                        | Auto schema dari content types                                           |
| Testing                       | Jest + Supertest (API), Playwright (E2E admin panel)                | Standar coverage                                                         |
| CI/CD                         | GitHub Actions                                                      | Build, test, lint, docker image publish                                  |
| Containerization              | Docker + docker-compose (dev), Kubernetes-ready (prod)              | Portabilitas deployment                                                  |
| Monorepo Tooling              | Turborepo                                                           | Build caching, task orchestration antar package                          |

---

## 8. Core Features — Spesifikasi Detail

### 8.1 Content Modeling System (Content Type Builder)

**Deskripsi:** Inti dari NodePress. User (developer atau admin via UI) bisa mendefinisikan "Content Type" custom (setara Custom Post Type di WP) beserta field-fieldnya secara dinamis, tanpa perlu migrasi database manual untuk setiap field baru (disimpan di kolom JSONB).

**Field types yang didukung (v1):**

- `text`, `richtext` (block editor), `number`, `boolean`, `date`, `email`, `url`
- `media` (single/multiple, relasi ke Media Library)
- `relation` (one-to-one, one-to-many, many-to-many ke content type lain)
- `select`/`multiselect` (enum-based)
- `json` (raw structured data, buat kasus advanced)
- `repeater` (array of sub-fields, mirip ACF Repeater Field)

**Cara definisi content type (dua metode):**

1. **Code-first** (untuk developer): definisikan lewat file `*.contenttype.ts` di project, di-load saat boot.
2. **UI-first** (untuk non-technical, opsional saat runtime): via Admin Panel "Content Type Builder", disimpan ke tabel `content_types`.

```typescript
// contoh: content-types/product.contenttype.ts
export const ProductType = defineContentType({
  name: 'product',
  label: { singular: 'Product', plural: 'Products' },
  fields: {
    title: field.text({ required: true }),
    description: field.richtext(),
    price: field.number({ required: true, min: 0 }),
    images: field.media({ multiple: true }),
    category: field.relation({ to: 'product_category', many: false }),
  },
  taxonomies: ['product_category'],
  supports: ['revisions', 'seo', 'comments'],
});
```

**Acceptance Criteria:**

- Admin dapat membuat content type baru tanpa restart server (hot schema reload untuk UI-first) — atau via deployment untuk code-first
- Setiap content type otomatis mendapat REST endpoint `/api/content/{type}` (CRUD) dan GraphQL type
- Validasi field berjalan di API layer (server-side) menggunakan Zod schema yang di-generate dari field definition

### 8.2 Admin Panel

**Modul utama:**

- Dashboard (ringkasan statistik: jumlah post, komentar terbaru, aktivitas)
- Content list view (table dengan filter, sort, bulk action — mirip halaman "All Posts" WP)
- Content editor (block-based, autosave, revision history, preview)
- Media Library (grid view, drag-drop upload, search, folder/tag organize)
- Menu Builder (drag-drop untuk susun navigasi)
- User Management (CRUD user, assign role)
- Plugin Manager (activate/deactivate plugin terinstall)
- Settings (general, permalink structure, SEO default, reading settings)

**Non-technical usability requirement:** admin panel harus bisa dipakai tanpa pengetahuan coding — form generation otomatis dari field schema (mirip bagaimana Payload/Strapi generate form UI dari config).

### 8.3 Authentication & Authorization (RBAC)

**Role bawaan (default, terinspirasi WP):**

| Role        | Kapabilitas                                                              |
| ----------- | ------------------------------------------------------------------------ |
| Super Admin | Full akses, termasuk manage plugin & settings sistem                     |
| Admin       | Manage semua content & user (kecuali Super Admin)                        |
| Editor      | Manage & publish semua content (termasuk milik user lain)                |
| Author      | Manage & publish content milik sendiri                                   |
| Contributor | Buat draft, tidak bisa publish sendiri                                   |
| Subscriber  | Hanya baca, manage profil sendiri (untuk site dengan komentar/user area) |

**Sistem permission:** capability-based (bukan hanya role-based), setiap capability adalah string granular (`content:product:create`, `content:product:publish`, dst) supaya plugin bisa daftar capability custom — mirip `current_user_can()` di WP.

**Autentikasi:**

- JWT access token + refresh token (httpOnly cookie)
- Opsional OAuth login (Google, GitHub) via Passport strategy
- Opsional 2FA (TOTP) untuk role Admin ke atas

### 8.4 Media Library

- Upload via drag-drop atau API, disimpan ke S3-compatible storage
- Auto-generate multiple size (thumbnail, medium, large) mirip WP `add_image_size()`, diproses via background job (Sharp + BullMQ)
- Metadata: alt text, caption, title, focal point (untuk cropping responsif)
- Support file types: image, video, audio, PDF, dokumen umum

### 8.5 Block Editor (Rich Text)

- Dibangun di atas **Tiptap** (ProseMirror)
- Block bawaan: Paragraph, Heading, Image, Gallery, Quote, Code, List, Embed (YouTube/Twitter), Table, Button, Columns
- Plugin bisa daftar block custom via Plugin SDK (`registerBlock()`)
- Output disimpan sebagai JSON (structured), bukan raw HTML — memudahkan rendering multi-platform (web, mobile, AMP)

### 8.6 Plugin & Hook System

**Filosofi:** meniru WordPress Actions & Filters tapi type-safe.

```typescript
// Actions — untuk side effect (mirip do_action / add_action)
hooks.addAction('content.afterPublish', async (entry) => {
  await sendNotification(entry);
});

// Filters — untuk memodifikasi data (mirip apply_filters / add_filter)
hooks.addFilter('content.beforeSave', (data, contentType) => {
  if (contentType === 'post') {
    data.readingTime = calculateReadingTime(data.body);
  }
  return data;
});
```

**Plugin lifecycle:** `install → activate → boot → deactivate → uninstall`, dengan isolated config storage per plugin (tabel `plugin_settings`).

**Plugin SDK menyediakan:**

- Hook registry (actions & filters)
- Akses ke Prisma client (scoped, dengan migration terpisah untuk tabel custom plugin)
- Registrasi custom field type baru
- Registrasi custom block editor
- Registrasi REST/GraphQL endpoint tambahan
- Registrasi menu/halaman baru di admin panel (mirip `add_menu_page()`)

### 8.7 Theme & Rendering System

- Template hierarchy mirip WP: `single-{type}.tsx` → `single.tsx` → `page.tsx` (fallback berjenjang)
- Rendering mode fleksibel per route: SSG (build time), ISR (revalidate interval), atau SSR (real-time)
- Theme bisa di-package terpisah dan di-switch tanpa ubah kode API

### 8.8 REST & GraphQL API

**REST API — auto-generated per content type:**

```
GET    /api/content/{type}            # list, support ?filter, ?sort, ?page
GET    /api/content/{type}/:id
POST   /api/content/{type}
PATCH  /api/content/{type}/:id
DELETE /api/content/{type}/:id
GET    /api/content/{type}/:id/revisions
POST   /api/media/upload
GET    /api/taxonomies/{taxonomy}
GET    /api/menus/{location}
POST   /api/auth/login
POST   /api/auth/refresh
```

**GraphQL:** schema di-generate otomatis dari seluruh content type yang terdaftar, dengan dukungan filtering, pagination (cursor-based), dan nested relation resolver.

### 8.9 SEO & Metadata

- Field bawaan: meta title, meta description, canonical URL, OG image, robots directive
- Auto-generate `sitemap.xml` dan `robots.txt`
- Schema.org structured data (JSON-LD) auto-inject berdasarkan content type (Article, Product, dst)

---

## 9. Non-Functional Requirements

| Kategori                 | Requirement                                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**          | API p95 < 150ms (read), < 400ms (write). Public site TTFB < 200ms dengan ISR/cache aktif                                           |
| **Scalability**          | Horizontal scaling untuk API (stateless, session di Redis), DB read-replica ready                                                  |
| **Security**             | OWASP Top 10 compliance, rate limiting per endpoint, input sanitization otomatis dari field schema, CSRF protection di admin panel |
| **Reliability**          | Uptime target 99.9% untuk managed hosting (jika ditawarkan sebagai SaaS opsional)                                                  |
| **Accessibility**        | Admin panel WCAG 2.1 AA minimum                                                                                                    |
| **Internationalization** | UI admin panel multi-bahasa (i18n), content multi-bahasa (v1.5)                                                                    |
| **Extensibility**        | Semua interaksi inti (save, publish, delete, render) harus punya hook point                                                        |
| **Data Portability**     | Full export/import (JSON/XML) tanpa vendor lock-in                                                                                 |

---

## 10. Data Model (Prisma Schema — Inti)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String?
  name         String
  role         Role     @default(SUBSCRIBER)
  capabilities String[] // granular override per user
  avatar       String?
  createdAt    DateTime @default(now())
  entries      ContentEntry[]
}

enum Role {
  SUPER_ADMIN
  ADMIN
  EDITOR
  AUTHOR
  CONTRIBUTOR
  SUBSCRIBER
}

model ContentType {
  id        String   @id @default(cuid())
  name      String   @unique
  label     Json
  fields    Json     // field schema definition
  supports  String[] // ['revisions', 'seo', 'comments']
  source    String   @default("code") // "code" | "ui"
  entries   ContentEntry[]
  createdAt DateTime @default(now())
}

model ContentEntry {
  id            String       @id @default(cuid())
  contentType   ContentType  @relation(fields: [contentTypeId], references: [id])
  contentTypeId String
  slug          String
  status        EntryStatus  @default(DRAFT)
  data          Json         // isi field sesuai schema content type
  author        User         @relation(fields: [authorId], references: [id])
  authorId      String
  seo           Json?
  publishedAt   DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  revisions     Revision[]
  terms         TermRelation[]
  comments      Comment[]

  @@unique([contentTypeId, slug])
  @@index([status, publishedAt])
}

enum EntryStatus {
  DRAFT
  PENDING_REVIEW
  PUBLISHED
  SCHEDULED
  TRASHED
}

model Revision {
  id        String       @id @default(cuid())
  entry     ContentEntry @relation(fields: [entryId], references: [id])
  entryId   String
  data      Json
  createdBy String
  createdAt DateTime     @default(now())
}

model Taxonomy {
  id       String @id @default(cuid())
  name     String @unique // "category", "tag", "product_category"
  hierarchical Boolean @default(false)
  terms    Term[]
}

model Term {
  id         String   @id @default(cuid())
  taxonomy   Taxonomy @relation(fields: [taxonomyId], references: [id])
  taxonomyId String
  name       String
  slug       String
  parentId   String?
  entries    TermRelation[]

  @@unique([taxonomyId, slug])
}

model TermRelation {
  entry   ContentEntry @relation(fields: [entryId], references: [id])
  entryId String
  term    Term         @relation(fields: [termId], references: [id])
  termId  String

  @@id([entryId, termId])
}

model Media {
  id        String   @id @default(cuid())
  url       String
  sizes     Json     // { thumbnail: url, medium: url, large: url }
  mimeType  String
  altText   String?
  caption   String?
  uploadedBy String
  createdAt DateTime @default(now())
}

model Menu {
  id       String     @id @default(cuid())
  location String     @unique // "primary", "footer"
  items    MenuItem[]
}

model MenuItem {
  id       String  @id @default(cuid())
  menu     Menu    @relation(fields: [menuId], references: [id])
  menuId   String
  label    String
  url      String
  order    Int
  parentId String?
}

model Comment {
  id        String       @id @default(cuid())
  entry     ContentEntry @relation(fields: [entryId], references: [id])
  entryId   String
  authorName String
  authorEmail String
  content   String
  status    CommentStatus @default(PENDING)
  parentId  String?
  createdAt DateTime      @default(now())
}

enum CommentStatus {
  PENDING
  APPROVED
  SPAM
  TRASHED
}

model Plugin {
  id       String  @id @default(cuid())
  slug     String  @unique
  version  String
  active   Boolean @default(false)
  settings Json?
}

model WebhookSubscription {
  id        String   @id @default(cuid())
  event     String   // "content.published", "content.deleted", dst
  targetUrl String
  secret    String
  active    Boolean  @default(true)
}
```

---

## 11. Roadmap & Fase Pengembangan

| Fase                            | Durasi Estimasi | Output                                                                            |
| ------------------------------- | --------------- | --------------------------------------------------------------------------------- |
| **Fase 0 — Foundation**         | 3 minggu        | Monorepo setup, Prisma schema inti, auth module, CI/CD dasar                      |
| **Fase 1 — Content Engine**     | 5 minggu        | Content type builder (code-first), CRUD API, validasi Zod, REST API auto-generate |
| **Fase 2 — Admin Panel MVP**    | 6 minggu        | Login, dashboard, content list & editor, media library dasar                      |
| **Fase 3 — Editor & Media**     | 4 minggu        | Block editor (Tiptap) full, image processing pipeline, revisions                  |
| **Fase 4 — Plugin System**      | 4 minggu        | Hook engine, Plugin SDK, 3 plugin contoh (SEO, cache, comments)                   |
| **Fase 5 — Theme/Rendering**    | 4 minggu        | Template hierarchy, starter theme, SSG/ISR/SSR mode                               |
| **Fase 6 — GraphQL & Webhooks** | 3 minggu        | GraphQL schema generator, webhook dispatcher                                      |
| **Fase 7 — Hardening & Beta**   | 4 minggu        | Security audit, load testing, dokumentasi lengkap, beta release                   |
| **v1.0 Launch**                 | —               | Public release, CLI scaffolding tool rilis stabil                                 |

**Total estimasi MVP → v1.0: ~33 minggu (± 8 bulan) dengan tim kecil (2-4 engineer).**

---

## 12. Success Metrics (KPI)

- **Adoption:** jumlah instalasi aktif (via CLI telemetry opsional/opt-in)
- **Developer Satisfaction:** NPS dari survey komunitas awal
- **Performance benchmark:** dibandingkan headless WP+WPGraphQL pada beban yang sama
- **Plugin ecosystem growth:** jumlah plugin pihak ketiga per kuartal setelah v1.0
- **Time-to-first-content:** waktu dari `npx create-nodepress-app` sampai publish konten pertama (target < 15 menit)

---

## 13. Risiko & Mitigasi

| Risiko                                                              | Dampak | Mitigasi                                                                               |
| ------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Scope creep — mencoba tandingi seluruh ekosistem plugin WP          | Tinggi | Fokus MVP ketat, plugin ecosystem dibangun bertahap via komunitas                      |
| Performa JSONB untuk field dinamis pada skala besar                 | Sedang | Indexing GIN di Postgres, opsi materialized columns untuk field yang sering di-query   |
| Adopsi rendah karena WP sudah sangat dominan                        | Tinggi | Positioning jelas ke niche developer JS/TS, bukan menggantikan WP untuk semua use case |
| Kompleksitas plugin system menyebabkan breaking changes antar versi | Sedang | Semantic versioning ketat + plugin API deprecation policy jelas                        |
| Keamanan content type dinamis (injection via JSON field)            | Tinggi | Validasi schema ketat di server-side (Zod), sanitization pada setiap field type        |

---

## 14. Open Questions

1. Apakah NodePress akan menyediakan managed hosting/SaaS resmi, atau full self-hosted only di v1?
2. Bagaimana strategi migrasi data dari WordPress existing — apakah perlu tool import otomatis penuh (termasuk shortcode parsing) di MVP atau nanti?
3. Apakah GraphQL wajib aktif by default, atau opsional (mempengaruhi bundle size & startup time)?
4. Model lisensi: MIT penuh, atau dual-license (open-core dengan fitur enterprise berbayar)?
5. Apakah perlu real-time collaborative editing di roadmap awal, mengingat kompleksitas CRDT?

---

## 15. Lampiran — Perbandingan Fitur WordPress vs NodePress (Target v1.0)

| Fitur WordPress           | Status di NodePress v1.0                                |
| ------------------------- | ------------------------------------------------------- |
| Custom Post Types         | ✅ Full (code-first + UI-first)                         |
| Custom Fields (ACF-like)  | ✅ Built-in, tidak perlu plugin tambahan                |
| Taxonomies (Category/Tag) | ✅ Full                                                 |
| Gutenberg Block Editor    | ✅ Setara (Tiptap-based)                                |
| Plugin/Hook System        | ✅ Actions & Filters, type-safe                         |
| Themes                    | ✅ Template hierarchy setara                            |
| Multisite                 | ❌ (roadmap v2)                                         |
| REST API                  | ✅ Auto-generated                                       |
| GraphQL                   | ✅ (native, WP butuh plugin)                            |
| Media Library             | ✅ Full, dengan cloud storage native                    |
| User Roles & Capabilities | ✅ Setara + granular capability                         |
| Comments                  | ✅ (v1.1)                                               |
| SEO Tools                 | ✅ Built-in dasar (Yoast-like via plugin resmi)         |
| Widget/Sidebar            | ⚠️ Digantikan konsep "Block Areas" yang lebih fleksibel |
| WP-CLI equivalent         | ✅ `nodepress-cli`                                      |

---

_Dokumen ini adalah living document dan akan di-update seiring proses discovery & development berjalan._
