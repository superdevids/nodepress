# PRD v2: NodePress — Modern CMS Built with Node.js/JavaScript

**Versi Dokumen:** 2.0
**Tanggal:** 3 Juli 2026
**Status:** Living Document — v2.0 Implemented
**Perubahan dari v1:** Menambahkan fitur yang terlewat, memperdalam Security/Performance/Scalability sebagai pilar utama, dan menambahkan blueprint lengkap untuk Open Source Contributor Experience.

> **Note:** This document reflects the original v2.0 specification. All security, performance, and scalability requirements are implemented. See [PRD4.md](./PRD4.md) for current status.

> Dokumen ini adalah **ekstensi** dari PRD v1 (`PRD1.md`). Section 1-8 di v1 tetap berlaku sebagai fondasi. PRD v2 fokus pada **gap analysis**, fitur baru, dan tiga pilar non-negotiable: **Kecepatan, Keamanan, Skalabilitas** — supaya siapapun developer bisa berkontribusi dengan aman dan percaya diri.

---

## 1. Gap Analysis dari PRD v1

Berikut fitur yang belum tercakup atau kurang detail di v1, dikelompokkan per kategori:

| Kategori             | Gap yang ditemukan                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Content Management   | Trash/recycle bin, content locking (concurrent edit), bulk operations, CSV/JSON import-export, preview link, diff/compare revisions           |
| Collaboration        | Activity log/audit trail, notification system, in-app comment untuk internal review (bukan comment publik)                                    |
| Developer Experience | Plugin marketplace/registry, plugin sandboxing, CLI generator untuk plugin/content type, local dev environment, testing harness               |
| Security             | Rate limiting spesifik, brute-force protection, plugin permission manifest, secrets management, dependency scanning, vulnerability disclosure |
| Performance          | Query optimization strategy, DataLoader (N+1 GraphQL), CDN strategy, cache invalidation strategy, bundle size budget                          |
| Scalability          | Horizontal scaling detail, connection pooling, queue architecture, load testing benchmark, multi-region readiness                             |
| Observability        | Metrics/tracing, structured logging, health check endpoint, error tracking                                                                    |
| Governance/OSS       | Contribution guideline, code of conduct, RFC process, release process, plugin review/signing                                                  |
| Compliance           | GDPR tools (data export/delete), cookie consent hook, data retention policy                                                                   |
| Integrations         | Email service abstraction, third-party API key management, webhook retry & signing                                                            |

---

## 2. Fitur Baru / Tambahan (v2)

### 2.1 Content Management — Fitur yang Terlewat

**Trash & Restore**

- Konten yang dihapus masuk status `TRASHED` dulu (soft delete), auto-purge setelah 30 hari (configurable)
- Endpoint: `POST /api/content/{type}/:id/restore`, `DELETE /api/content/{type}/:id/force` (hard delete, permission khusus)

**Content Locking (Concurrent Edit Protection)**

- Saat user A membuka editor, entry di-`lock` (TTL-based via Redis, auto-release setelah idle/timeout)
- User B yang coba edit entry yang sama akan lihat notice "sedang diedit oleh [nama], sejak [waktu]" — mirip CMS pada umumnya
- WebSocket event untuk notify real-time saat lock dilepas

**Bulk Operations**

- Multi-select di list view: bulk publish, bulk trash, bulk assign taxonomy, bulk export
- Diproses async via BullMQ untuk dataset besar (>100 item), progress bar di UI

**Import/Export**

- Export per content type ke JSON/CSV
- Import tool dengan dry-run mode (preview perubahan sebelum commit) & conflict resolution (skip/overwrite/merge)
- Migration tool khusus dari WordPress (`.xml` WXR format) — parsing post, page, category, tag, comment, dan media reference

**Preview & Diff**

- Shareable preview link untuk draft (signed URL dengan expiry, tidak butuh login)
- Revision diff view (side-by-side, highlight perubahan field per field) di admin panel

### 2.2 Collaboration & Activity

**Audit Log (Activity Log)**

- Setiap aksi penting (create, update, delete, publish, login, permission change, plugin activate) tercatat: siapa, kapan, aksi apa, before/after diff (untuk content)
- Tabel `audit_log`, retention configurable, bisa di-export untuk compliance
- Admin panel punya halaman "Activity" dengan filter per user/aksi/tanggal

**Notification System**

- In-app notification (bell icon) + email digest opsional
- Trigger: comment baru, mention (`@username` di internal note), content butuh review, plugin update tersedia
- Notification channel bisa di-extend via plugin (Slack, Discord webhook, dsb)

**Internal Notes/Review Comments**

- Berbeda dari comment publik — ini catatan review antar editor di dalam draft (mirip Google Docs comment), tidak tampil di frontend

### 2.3 Developer Experience & Plugin Ecosystem

**Plugin Marketplace/Registry**

- Registry terpusat (`registry.nodepress.dev`), mirip npm tapi khusus plugin/tema NodePress
- Setiap plugin punya manifest (`plugin.json`) yang mendeklarasikan: versi minimum core, permission yang dibutuhkan (lihat 3.2 Plugin Sandboxing), dependency
- Proses submit plugin melalui automated security scan sebelum publish (lihat Section 3)

**Plugin & Content Type Generator (CLI)**

```
npx nodepress-cli generate plugin my-plugin
npx nodepress-cli generate content-type Product --field title:text --field price:number
npx nodepress-cli generate block CustomHero
```

**Local Development Environment**

- Satu perintah: `docker compose up` — spin up Postgres, Redis, MinIO (S3-compatible), API, Admin Panel, semua ter-seed dengan data dummy
- Hot-reload penuh untuk API (NestJS watch mode) dan Admin Panel (Next.js Fast Refresh)
- Seed data generator (`nodepress-cli seed`) untuk testing dengan data realistis (faker-based)

**Testing Harness untuk Plugin Developer**

- `@nodepress/testing` package: helper untuk unit test hook, integration test terhadap in-memory/test database, mock Plugin SDK context

### 2.4 Compliance & Data Governance

**GDPR/Privacy Tools**

- Endpoint self-service: `GET /api/users/me/export` (export semua data user dalam JSON), `DELETE /api/users/me` (right to be forgotten, dengan anonymize option untuk content yang mereka buat agar tidak broken reference)
- Cookie consent hook di public site (plugin resmi)
- Data retention policy configurable per data type (log, comment, media)

**Compliance Dashboard**

- Admin panel section untuk melihat siapa punya akses ke data apa, kapan terakhir data di-export/dihapus

### 2.5 Integrasi

**Email Service Abstraction**

- Interface generik `EmailProvider`, adapter resmi untuk: SMTP, Resend, SendGrid, AWS SES
- Dipakai untuk: reset password, notifikasi, digest, welcome email — semua template customizable (React Email/MJML-based)

**Webhook Reliability**

- Signed payload (HMAC) supaya penerima bisa verifikasi keaslian
- Retry dengan exponential backoff (max 5x), dead-letter queue untuk webhook yang terus gagal, log delivery status di admin panel

**API Key Management untuk Third-Party**

- Admin bisa generate API key dengan scope terbatas (read-only, per content type, dst) — untuk integrasi eksternal tanpa perlu share credential admin

---

## 3. Keamanan (Security) — Pilar Utama

Keamanan diperlakukan sebagai **first-class requirement**, bukan afterthought, karena sistem ini akan dipakai banyak kontributor & dijalankan di banyak instalasi publik.

### 3.1 Threat Model Ringkas

| Threat                   | Mitigasi                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SQL/NoSQL Injection      | Prisma parameterized query (tidak ada raw query tanpa sanitasi), validasi input via Zod di setiap endpoint                                                                                                        |
| XSS (stored/reflected)   | Sanitasi HTML output dari rich text (allow-list tag), CSP header ketat via Helmet, escape otomatis di React rendering                                                                                             |
| CSRF                     | CSRF token untuk semua state-changing request di admin panel, `SameSite=Strict` cookie                                                                                                                            |
| Brute-force login        | Rate limit per IP & per akun (Redis-based sliding window), account lockout progresif, CAPTCHA setelah 5x gagal, notifikasi email saat login dari device baru                                                      |
| Malicious plugin         | Plugin sandboxing (lihat 3.2), permission manifest wajib, automated security scan sebelum masuk registry                                                                                                          |
| File upload exploit      | Validasi MIME type (bukan cuma ekstensi), scan virus (ClamAV hook opsional), limit ukuran file, strip EXIF metadata sensitif, serve dari domain terpisah/CDN (bukan domain utama, cegah XSS via file HTML upload) |
| Broken access control    | RBAC + capability check di setiap resolver/controller (default-deny), automated test untuk permission matrix                                                                                                      |
| Secrets leakage          | Tidak ada secret di code/env commit, integrasi dengan secret manager (Vault, AWS Secrets Manager, opsional), rotasi JWT signing key berkala                                                                       |
| Dependency vulnerability | Automated scanning (Dependabot/Snyk) di CI, lockfile wajib, audit rutin                                                                                                                                           |
| DoS/API abuse            | Rate limiting global + per endpoint, request size limit, query complexity limit untuk GraphQL (cegah query bertingkat dalam yang mahal)                                                                           |

### 3.2 Plugin Sandboxing (Kritis untuk Multi-Contributor Ecosystem)

Karena plugin dari pihak ketiga berpotensi menjalankan kode arbitrary, NodePress mewajibkan model **permission manifest + sandboxed execution**:

```json
// plugin.json
{
  "name": "nodepress-plugin-analytics",
  "version": "1.0.0",
  "permissions": [
    "content:read",
    "hooks:content.afterPublish",
    "network:fetch:https://api.analytics-provider.com/*"
  ],
  "sandbox": "isolated-vm"
}
```

- Plugin dijalankan di **isolated context** (`isolated-vm`, bukan native `require` bebas), tidak bisa akses filesystem/network di luar yang dideklarasikan di manifest
- Saat aktivasi plugin, admin melihat daftar permission yang diminta (mirip izin aplikasi mobile) dan harus approve eksplisit
- Plugin resmi (dari tim core) mendapat "Verified" badge, di-review manual sebelum publish
- Plugin komunitas melalui automated static analysis scan (deteksi pola berbahaya: `eval`, akses filesystem tidak terdeklarasi, dsb) sebelum masuk registry

### 3.3 Autentikasi & Sesi Lanjutan

- 2FA (TOTP) **wajib** untuk role Admin & Super Admin di instalasi produksi (configurable, tapi default recommended-on)
- Refresh token rotation — setiap refresh menghasilkan token baru, token lama di-invalidate (mencegah replay attack)
- Session management page di admin panel — user bisa lihat & revoke device/session aktif lain
- Login anomaly detection dasar (login dari lokasi/device baru → email alert)

### 3.4 Security Operations

- `security.txt` & vulnerability disclosure policy publik (responsible disclosure, bug bounty opsional di masa depan)
- Automated dependency & container image scanning di CI/CD (Trivy/Snyk)
- Security patch release SLA: critical vulnerability di-patch dalam 48 jam, disclosed via security advisory channel
- Penetration testing berkala (minimal sebelum tiap major release)
- Semua endpoint API tunduk pada schema validation ketat — reject request yang tidak sesuai schema sebelum masuk business logic

---

## 4. Performa (Speed) — Pilar Utama

### 4.1 Strategi Caching Berlapis

```
Browser Cache → CDN Edge Cache → API Response Cache (Redis) → Database Query Cache → PostgreSQL
```

- **CDN layer:** static asset & media di-serve dari CDN (Cloudflare/CloudFront), cache-control header agresif untuk immutable asset
- **API response cache:** GET request di-cache di Redis dengan key berbasis query params, invalidation otomatis via hook (`content.afterUpdate` → purge cache key terkait)
- **ISR (Incremental Static Regeneration)** di public site — halaman di-regenerate on-demand, bukan full rebuild
- **Query result caching** untuk query yang mahal (aggregasi, search), TTL configurable per query type

### 4.2 Query Optimization

- Index wajib di kolom yang sering di-filter/sort (`status`, `publishedAt`, `slug`), GIN index untuk kolom JSONB yang sering di-query field-nya
- **DataLoader pattern** di GraphQL resolver untuk mencegah N+1 query (batching request relasi)
- Pagination wajib cursor-based (bukan offset) untuk dataset besar — offset pagination hanya untuk admin panel table kecil
- Slow query logging & alerting (threshold configurable, misal >200ms)

### 4.3 Frontend Performance (Admin Panel & Public Site)

- Bundle size budget: admin panel initial load < 200KB gzip (JS), code-splitting per route
- Image otomatis di-serve dalam format modern (AVIF/WebP) dengan fallback, responsive `srcset` auto-generate dari Media Library
- Public site: prioritaskan SSG/ISR di atas SSR penuh kapanpun konten tidak butuh personalisasi real-time
- Prefetch route yang mungkin dikunjungi (Next.js built-in prefetch) di admin panel

### 4.4 Background Processing (Async by Default)

Operasi berat **tidak boleh** blocking request-response cycle:

- Image resize/optimize → job queue (BullMQ)
- Webhook dispatch → job queue dengan retry
- Search index update → job queue (debounced, batch update)
- Email sending → job queue
- Bulk import/export → job queue dengan progress tracking (polling atau WebSocket)

### 4.5 Benchmark & Performance Budget

| Metrik                           | Target                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| API read (cached)                | p95 < 50ms                                                                         |
| API read (uncached, DB query)    | p95 < 150ms                                                                        |
| API write                        | p95 < 400ms                                                                        |
| Public site TTFB (ISR/cache hit) | < 100ms                                                                            |
| Admin panel Time to Interactive  | < 2.5s (3G Fast simulation)                                                        |
| Load test baseline               | 1000 concurrent read req/s tanpa error rate meningkat, di single instance (4 vCPU) |

Load testing dilakukan otomatis di CI untuk setiap release minor/major menggunakan **k6**, hasil dibandingkan dengan baseline sebelumnya (regression alert jika turun >15%).

---

## 5. Skalabilitas (Scalability) — Pilar Utama

### 5.1 Prinsip Arsitektur

- **Stateless API** — semua state (session, lock, cache) disimpan di Redis, bukan in-memory server, supaya API instance bisa di-scale horizontal bebas tanpa sticky session
- **Database connection pooling** via PgBouncer, wajib untuk deployment dengan banyak instance API
- **Read replica ready** — Prisma read/write splitting untuk query berat (report, search) diarahkan ke replica
- **Queue-based decoupling** — operasi berat dipisah dari request cycle (lihat 4.4), worker bisa di-scale terpisah dari API

### 5.2 Horizontal Scaling Blueprint

```
                    ┌────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
              ┌───────────────┼───────────────┐
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │ API Pod 1  │   │ API Pod 2  │   │ API Pod N  │   (stateless, autoscale via HPA)
        └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
              └───────────────┼───────────────┘
                    ┌────────▼────────┐
                    │  PgBouncer Pool  │
                    └────────┬────────┘
              ┌───────────────┼───────────────┐
        ┌─────▼─────┐                   ┌─────▼─────┐
        │  Postgres  │◄──replication────│  Read Replica │
        │  (Primary) │                   └───────────────┘
        └───────────┘
                    ┌────────────────┐
                    │  Redis Cluster  │  (cache + queue + session)
                    └────────────────┘
                    ┌────────────────┐
                    │  Worker Pods    │  (BullMQ consumer, autoscale berdasar queue depth)
                    └────────────────┘
```

- Kubernetes-native: Helm chart resmi disediakan, HPA (Horizontal Pod Autoscaler) berbasis CPU & custom metric (queue depth, request latency)
- Zero-downtime deployment (rolling update), health check `/healthz` & readiness probe `/readyz`

### 5.3 Skalabilitas Data

- Partisi tabel `content_entry` berdasarkan `content_type_id` untuk instalasi dengan volume sangat besar (opsional, v2.5+)
- Strategi arsip: entry lama/trashed dipindah ke cold storage table setelah periode tertentu (configurable)
- Media storage sepenuhnya di object storage (S3-compatible) sejak awal — tidak pernah di local disk di produksi, sehingga scaling API pod tidak terikat storage

### 5.4 Multi-Region Readiness (Roadmap v2.5+)

- Desain schema & cache key sudah mempertimbangkan future multi-region (tidak ada asumsi timezone/locale hardcoded)
- CDN untuk media & static asset otomatis multi-region by nature
- Database multi-region replication dijadikan opsi lanjutan (bukan requirement v1), didokumentasikan sebagai extension point

### 5.5 Observability (Prasyarat Skalabilitas yang Aman)

- **Structured logging** (JSON logs) dengan correlation ID per request, terintegrasi Pino
- **Distributed tracing** via OpenTelemetry, kompatibel dengan Jaeger/Grafana Tempo
- **Metrics** endpoint Prometheus-compatible (`/metrics`) — request rate, error rate, latency percentile, queue depth, cache hit ratio
- **Error tracking** terintegrasi (Sentry-compatible adapter)
- Dashboard contoh (Grafana) disediakan sebagai starter template di repo

---

## 6. Open Source Contribution Experience

Karena tujuan eksplisit project ini adalah **memungkinkan sebanyak mungkin developer berkontribusi**, ini jadi pilar keempat yang harus didesain sejak awal, bukan ditambahkan belakangan.

### 6.1 Governance Model

- **Core Team** — maintainer inti yang punya merge access, bertanggung jawab atas roadmap & keputusan arsitektur besar
- **RFC Process** — perubahan besar (breaking change, arsitektur baru) wajib lewat RFC document yang didiskusikan publik (folder `/rfcs` di repo) sebelum implementasi
- **Triage Team** — kontributor terpercaya yang bantu label & prioritaskan issue, tidak harus core team
- Model ini mirip governance Node.js/Vite: transparan, keputusan besar didiskusikan terbuka

### 6.2 Contributor Onboarding

- `CONTRIBUTING.md` lengkap: cara setup dev environment (`docker compose up`, 1 command), coding standard (ESLint + Prettier config di-enforce via pre-commit hook), commit convention (**Conventional Commits**, di-enforce via commitlint)
- `CODE_OF_CONDUCT.md` berbasis Contributor Covenant
- Label `good first issue` & `help wanted` dikurasi rutin oleh Triage Team
- Template PR & Issue yang jelas (bug report, feature request, RFC proposal)
- Setiap PR wajib lulus: lint, type-check, unit test, coverage tidak boleh turun dari baseline (CI gate otomatis)

### 6.3 Modular Contribution (Monorepo-Friendly)

- Struktur monorepo (Section 6.3 di PRD v1) memungkinkan kontributor fokus ke satu package (`packages/editor`, `plugins/seo`, dst) tanpa perlu paham keseluruhan sistem
- Setiap package punya `README.md` sendiri, test suite sendiri, bisa di-develop & di-test isolated (`turbo run test --filter=@nodepress/editor`)
- Plugin SDK didokumentasikan terpisah di situs dokumentasi dengan starter template (`npx nodepress-cli generate plugin`)

### 6.4 Release & Versioning

- **Semantic Versioning** ketat, dikelola via **Changesets** (setiap PR yang mengubah behavior wajib menyertakan changeset file)
- Release notes otomatis di-generate dari changeset + conventional commit
- Deprecation policy jelas: breaking change diumumkan minimal 1 minor version sebelumnya dengan warning runtime

### 6.5 Dokumentasi & Komunitas

- Situs dokumentasi terpisah (Docusaurus/Nextra), mencakup: Getting Started, API Reference (auto-generated dari TypeScript types), Plugin Development Guide, Architecture Decision Records (ADR)
- Channel komunitas (Discord/GitHub Discussions) untuk Q&A, showcase, RFC discussion
- Public roadmap (GitHub Projects board) yang bisa diakses siapapun untuk lihat prioritas & progress

### 6.6 Insentif Kontribusi (opsional, eksplorasi jangka panjang)

- Program bounty untuk issue berlabel `bounty` (didanai sponsor/core team)
- Kredit kontributor otomatis di release notes & halaman "Contributors" di dokumentasi
- Sertifikasi/badge untuk plugin developer terverifikasi

---

## 7. Prisma Schema — Tambahan untuk Fitur v2

```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String   // "content.publish", "user.login", "plugin.activate", dst
  targetType String?
  targetId   String?
  before     Json?
  after      Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([action, createdAt])
}

model ContentLock {
  entryId   String   @id
  lockedBy  String
  lockedAt  DateTime @default(now())
  expiresAt DateTime
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String
  payload   Json
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, readAt])
}

model ApiKey {
  id         String   @id @default(cuid())
  name       String
  hashedKey  String   @unique
  scopes     String[] // ["content:read", "content:product:write"]
  createdBy  String
  lastUsedAt DateTime?
  revokedAt  DateTime?
  createdAt  DateTime @default(now())
}

model WebhookDelivery {
  id           String   @id @default(cuid())
  subscription String
  payload      Json
  status       String   // "pending" | "success" | "failed"
  attempts     Int      @default(0)
  lastError    String?
  createdAt    DateTime @default(now())
}

model PluginPermission {
  id       String  @id @default(cuid())
  pluginId String
  scope    String  // "content:read", "network:fetch:domain.com/*"
  grantedBy String
  grantedAt DateTime @default(now())
}
```

---

## 8. Roadmap v2 — Fitur Tambahan (Setelah v1.0 Launch)

| Fase | Fokus                                                                                  | Estimasi |
| ---- | -------------------------------------------------------------------------------------- | -------- |
| v1.1 | Trash/restore, bulk operations, audit log dasar                                        | 3 minggu |
| v1.2 | Content locking, notification system, internal review notes                            | 3 minggu |
| v1.3 | Plugin sandboxing (isolated-vm) + permission manifest + registry MVP                   | 5 minggu |
| v1.4 | Observability stack (metrics, tracing, structured logging) + Grafana dashboard starter | 3 minggu |
| v1.5 | GDPR tools, email service abstraction, webhook signing & retry                         | 3 minggu |
| v1.6 | Import/export lengkap (termasuk WXR/WordPress migration tool)                          | 4 minggu |
| v2.0 | Multisite/network admin, multi-region readiness, partitioning strategi data besar      | 8 minggu |

---

## 9. Definition of Done — Tiga Pilar (Checklist per Fitur)

Setiap fitur baru sebelum dianggap "selesai", wajib lulus checklist berikut:

**Kecepatan**

- [ ] Ada test performa/benchmark (jika endpoint API)
- [ ] Query database sudah di-explain-analyze, index sesuai kebutuhan
- [ ] Operasi berat sudah dipindah ke background job jika relevan

**Keamanan**

- [ ] Input divalidasi via Zod schema
- [ ] Permission/capability check ada di setiap endpoint baru
- [ ] Sudah lolos automated security scan (SAST) di CI
- [ ] Tidak ada secret/credential hardcoded

**Skalabilitas**

- [ ] Tidak menyimpan state di memory lokal server (harus di Redis/DB)
- [ ] Kompatibel dengan multi-instance deployment (stateless)
- [ ] Sudah diuji dengan load test dasar jika fitur high-traffic

**Kontribusi**

- [ ] Dokumentasi ditulis (README/API doc)
- [ ] Unit test & integration test coverage memenuhi threshold
- [ ] Changeset ditambahkan untuk release notes

---

_PRD v2 ini melengkapi v1 dengan fokus pada tiga pilar non-negotiable (Speed, Security, Scalability) plus fondasi Open Source Contribution Experience, supaya NodePress bisa tumbuh sebagai project komunitas yang sehat, aman, dan performan sejak hari pertama._
