# NodePress — Modern CMS Inspired by WordPress

> **A TypeScript-based CMS alternative for developers who love modern tooling.**
> Currently in **Beta (v1.0.0-beta.2)** — under active development.

[![Version](https://img.shields.io/badge/version-1.0.0--beta.2-blue)](https://github.com/superdevids/nodepress)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-orange)](CONTRIBUTING.md)

---

## 🚀 Quick Install

```bash
git clone https://github.com/superdevids/nodepress.git
cd nodepress
npm install
npm start
```

**✅ That's it!** Your browser opens to the Setup Wizard at `http://localhost:3000`.

> **System Requirements:** Node.js 20+, 4GB RAM, 10GB free disk space. Docker optional.

---

## ✨ What NodePress Does

| Feature                    | Status       | Details                                                  |
| -------------------------- | ------------ | -------------------------------------------------------- |
| 📝 **Content Management**  | ✅ Working   | Posts, pages, custom content types                       |
| 🖼️ **Media Library**       | ✅ Working   | Upload, organize, edit images                            |
| 🔌 **13 Plugins**          | ✅ Working   | SEO, Comments, Analytics, Security, Backup, Forms & more |
| 👥 **User Roles**          | ✅ Working   | 6 roles with granular permissions                        |
| 🌐 **REST + GraphQL APIs** | ✅ Working   | Both built-in, auto-generated                            |
| 🎨 **Block Editor**        | ⚠️ Partial   | Tiptap-based, 22 extensions, some edge cases remain      |
| 🔒 **Security**            | ✅ Working   | CSP, CORS, 2FA, Rate Limiting, JWT auth                  |
| 📦 **Docker Support**      | ✅ Working   | Single-command dev & production stacks                   |
| 👤 **Forgot Password**     | ⚠️ Partial   | Backend works, frontend page pending                     |
| 📋 **Install Wizard**      | ⚠️ Partial   | API ready, UI screens in progress                        |
| 🧪 **Test Coverage**       | ⚠️ Improving | 24 test files, working towards 100+                      |

> **Honest status:** NodePress is ~90% feature-complete compared to WordPress core. The foundation is solid (APIs, content engine, plugin system, security). What remains is polish: install wizard UX, forgot password flow, and testing coverage. Not yet recommended for production sites.

---

## 📖 Documentation

| Guide                                       | What's Inside                      |
| ------------------------------------------- | ---------------------------------- |
| 🚀 [GETTING-STARTED.md](GETTING-STARTED.md) | Step-by-step install with pictures |
| ⚡ [QUICK-START.md](QUICK-START.md)         | Developer cheat sheet              |
| 📘 [docs/USER-GUIDE.md](docs/USER-GUIDE.md) | Complete user manual               |
| ❓ [docs/FAQ.md](docs/FAQ.md)               | Frequently asked questions         |
| 🔄 [UPGRADE.md](UPGRADE.md)                 | How to upgrade versions            |
| 🔒 [SECURITY.md](SECURITY.md)               | Security policies                  |
| 🤝 [CONTRIBUTING.md](CONTRIBUTING.md)       | How to contribute                  |

---

## 🔌 Plugin Ecosystem

NodePress ships with **13 official plugins**, each matching common WordPress functionality:

| Plugin           | What It Does                                  | Status |
| ---------------- | --------------------------------------------- | ------ |
| `seo`            | Meta tags, sitemaps, Open Graph, JSON-LD      | ✅     |
| `cache-redis`    | Redis caching, cache invalidation             | ✅     |
| `comments`       | Gravatar, moderation, Akismet anti-spam       | ✅     |
| `forms`          | Drag-and-drop form builder, Stripe, reCAPTCHA | ✅     |
| `analytics`      | Google Analytics 4, real-time dashboard       | ✅     |
| `security`       | Web firewall, malware scan, login security    | ✅     |
| `social-sharing` | Share buttons, share count tracking           | ✅     |
| `backup`         | Scheduled backups, S3/GDrive storage          | ✅     |
| `newsletter`     | Email campaigns, subscriber management        | ✅     |
| `redirection`    | 301/302 redirects, 404 tracking               | ✅     |
| `performance`    | Minification, lazy loading, CDN               | ✅     |
| `multilingual`   | 11 languages, auto-translate (DeepL/Google)   | ✅     |
| `file-editor`    | Monaco code editor, syntax highlighting       | ✅     |

> **Note:** These plugins are functional but store data in memory by default. Database persistence is implemented for beta.2 but is still being hardened.

---

## 🏗️ Project Structure

```
nodepress/
├── apps/                  # Application shells
│   ├── admin/             # Admin panel (Next.js 14)
│   ├── api/               # REST + GraphQL API (NestJS)
│   ├── web-starter/       # Public facing theme
│   └── e2e/               # End-to-end tests
├── packages/              # Shared libraries
│   ├── core/              # Business logic engine
│   ├── db/                # Database (Prisma + PostgreSQL)
│   ├── plugin-sdk/        # Plugin Development Kit
│   ├── cli/               # CLI tools
│   ├── editor/            # Block editor (Tiptap)
│   ├── ui/                # Shared UI components
│   └── testing/           # Test utilities
├── plugins/               # 13 official plugins
└── docs/                  # Documentation
```

---

## 🧪 Current Test Coverage

```
📊 Total test files: 24
   ├── Core engine:  6 tests
   ├── API:          8 tests
   ├── Admin UI:     5 tests
   ├── Media:        2 tests
   ├── E2E:          2 test files
   └── Other:        1 test
```

We're working toward 100+ tests. Contributions welcome!

---

## 🌐 Tech Stack

| Layer             | Technology                                 |
| ----------------- | ------------------------------------------ |
| **Runtime**       | Node.js 20+ (LTS)                          |
| **Language**      | TypeScript (strict mode)                   |
| **API Framework** | NestJS                                     |
| **Admin Panel**   | Next.js 14 (React 18, RSC, Server Actions) |
| **Database**      | PostgreSQL 16                              |
| **ORM**           | Prisma                                     |
| **Cache / Queue** | Redis 7 + BullMQ                           |
| **Container**     | Docker + Docker Compose                    |
| **Styling**       | Tailwind CSS                               |

---

## 📜 License

MIT — Free for personal and commercial use.

---

_Built with ❤️ by the NodePress Team_
