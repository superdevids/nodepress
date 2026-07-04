# ❓ Frequently Asked Questions

---

## General

### What is NodePress?

NodePress is a modern, open-source Content Management System (CMS) built entirely in TypeScript. It's designed as a modern alternative to WordPress for JavaScript/TypeScript development teams. It runs on Node.js, uses PostgreSQL for data, and has a Next.js admin panel.

### Is NodePress production-ready?

**Not yet.** NodePress is currently in **beta** (v1.0.0-beta.2). It's under active development and works well for testing and development, but we don't recommend it for production websites yet. Key features like the install wizard and forgot password flow are still being built. Check [docs/PRD7.md](PRD7.md) for the full production readiness plan.

### Is NodePress a WordPress clone?

No. NodePress is **inspired by WordPress** — it uses similar concepts (posts, pages, plugins, themes, hooks) — but it's built from scratch using modern technology. It's not a drop-in replacement. You can't install WordPress plugins or themes on it.

### Do I need to know coding to use NodePress?

- **Using the admin panel:** No — content editors can create and manage content without coding.
- **Installing NodePress:** Basic terminal/command line skills are needed.
- **Building plugins/themes:** Yes, you'll need TypeScript/React knowledge.

### Can I migrate my WordPress site to NodePress?

**Tools exist, but expect manual work.**

We provide a WXR (WordPress eXtended RSS) importer that handles:

- ✅ Posts, pages, custom content types
- ✅ Media library (images, files)
- ✅ Users
- ✅ Comments
- ✅ Menus
- ✅ ACF field groups

**What requires manual work:**

- ⚠️ Gutenberg custom blocks (known blocks map cleanly)
- ⚠️ WordPress plugins must be rewritten as NodePress plugins
- ⚠️ Themes must be rebuilt in React/Next.js
- ❌ WooCommerce data (migration tool coming in v2.0)

**Estimated migration time:** 1-4 hours for a standard site.

### What about plugins?

NodePress ships with **13 official plugins** covering the most common CMS needs:

| Plugin         | What It Does                                  |
| -------------- | --------------------------------------------- |
| SEO            | Meta tags, sitemaps, Open Graph, JSON-LD      |
| Cache-Redis    | Redis caching, cache invalidation             |
| Comments       | Gravatar, moderation, anti-spam (Akismet)     |
| Forms          | Drag-and-drop form builder, Stripe, reCAPTCHA |
| Analytics      | Google Analytics 4, real-time dashboard       |
| Security       | Web firewall, malware scan, 2FA, audit log    |
| Social Sharing | Share buttons, count tracking                 |
| Backup         | Scheduled backups, S3/GDrive storage          |
| Newsletter     | Email campaigns, subscriber management        |
| Redirection    | 301/302 redirects, 404 tracking               |
| Performance    | Minification, lazy loading, CDN               |
| Multilingual   | 11 languages, auto-translate (DeepL/Google)   |
| File Editor    | Monaco code editor, file browser              |

This is **not as extensive** as WordPress's 60,000+ plugin ecosystem. For niche plugins, you'll need to build your own using the Plugin SDK.

### Do I need to know coding to contribute?

Yes for code contributions (TypeScript/React). No for documentation, bug reports, or translations — those are all welcome regardless of coding skill.

---

## Installation

### What are the system requirements?

| Requirement    | Minimum                             |
| -------------- | ----------------------------------- |
| **Node.js**    | v20 or higher                       |
| **RAM**        | 4 GB                                |
| **Disk Space** | 10 GB                               |
| **OS**         | Windows 10+, macOS 12+, Linux       |
| **Database**   | PostgreSQL 16 (via Docker or local) |
| **Redis**      | v7 (via Docker or local)            |

### Can I install on shared hosting?

**No.** NodePress requires Node.js and PostgreSQL, which aren't available on most shared hosting plans ($5-20/month cPanel). You'll need a VPS, cloud server, or Docker-capable host.

### Do I need Docker?

**No, but it helps.** NodePress can run with just Node.js + npm. Docker makes it easier (PostgreSQL, Redis, and MinIO spin up automatically). If Docker isn't available, you'll need to install PostgreSQL and Redis separately.

### What if Docker fails on Windows?

1. **Download Docker Desktop:** https://www.docker.com/products/docker-desktop/
2. Install and start it
3. Re-run the installer

**Still failing?** Use the pure Node.js approach:

```bash
npm install
npm start
```

You'll need PostgreSQL and Redis installed separately or running via a cloud service.

### The installer says "command not found"

You probably need to install Node.js first:

- Download from https://nodejs.org (LTS v20 or higher)
- Restart your terminal after installing

### Can I use MySQL instead of PostgreSQL?

**No.** NodePress is designed specifically for PostgreSQL 16, taking advantage of its advanced features (JSONB, `tsvector` full-text search, etc.).

---

## Usage

### How do I create a blog post?

1. Go to **Content → Posts**
2. Click **"Add New"**
3. Enter your title and content
4. Set categories and tags on the right sidebar
5. Click **"Publish"**

### How do I change my password?

Click your avatar (top-right) → **Profile** → **Change Password**.

### I forgot my password. What do I do?

Currently the "Forgot Password" flow on the login page is **still being built**. As a workaround:

- Contact your admin to reset it
- Or use the CLI: `npx nodepressjs user reset-password <email>`

### How do I add users?

Go to **Users → Add New**. Fill in their details and assign a role.

### What user roles are available?

| Role            | Permissions                    |
| --------------- | ------------------------------ |
| **Super Admin** | Full access to everything      |
| **Admin**       | Manage all content and users   |
| **Editor**      | Manage and publish all content |
| **Author**      | Create and publish own content |
| **Contributor** | Create drafts only             |
| **Subscriber**  | Read only, manage own profile  |

### Can I have multiple websites (multisite)?

**Not yet.** Multisite/Network support is planned for v2.0.

---

## Technical

### What's the tech stack?

| Layer         | Technology                 |
| ------------- | -------------------------- |
| Runtime       | Node.js 20+                |
| Language      | TypeScript (strict mode)   |
| API Framework | NestJS                     |
| Admin Panel   | Next.js 14 (React 18, RSC) |
| Database      | PostgreSQL 16              |
| ORM           | Prisma                     |
| Cache         | Redis 7                    |
| Queue         | BullMQ                     |
| Container     | Docker + Compose           |
| Styling       | Tailwind CSS               |

### Is there a REST API?

Yes. Auto-generated for every content type, at `/api/` path. Swagger documentation at `/docs`.

### Is there GraphQL?

Yes — built-in, no plugin needed. Apollo Server at `/graphql` with code-first schema.

### Can I create custom content types?

Yes — two ways:

1. **Code-first:** Register via `registerPostType()` in your plugin
2. **UI-first:** Admins can create custom types via the admin panel

### How does caching work?

Redis is built-in for:

- Object cache (database query results)
- Page cache (rendered HTML)
- Session storage
- Rate limiting counters

### How does the search work?

PostgreSQL `tsvector` full-text search (with Meilisearch integration planned). Supports typo-tolerant and faceted search.

---

## Troubleshooting

### "npm install" hangs or fails

```bash
npm cache clean --force
npm install --no-optional
```

### The server won't start

```bash
# Check if ports are free
netstat -ano | findstr :3000   # Windows
lsof -i :3000                   # Mac/Linux

# Check Node.js version
node -v   # Must be v20+
```

### The admin panel shows a blank page

```bash
# Check the terminal running npm start for errors
# Make sure the API server (port 3001) is running too
# Try clearing browser cache (Ctrl+Shift+R)
```

---

## Support

### Where can I get help?

- 📖 **This FAQ** — `docs/FAQ.md`
- 📘 **User Guide** — `docs/USER-GUIDE.md`
- 🐛 **Report bugs** — https://github.com/superdevids/nodepress/issues
- 💬 **Ask questions** — https://github.com/superdevids/nodepress/discussions
- 💬 **Discord** — (coming soon)
- 🔒 **Security issues** — See `SECURITY.md`
