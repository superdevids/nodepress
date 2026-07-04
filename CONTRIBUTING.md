# 🤝 Contributing to NodePress

Thank you for considering contributing to NodePress! This guide will help you get started.

> **Current Status:** Beta (v1.0.0-beta.2) — active development. All contributions welcome!

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- npm >= 9 (or pnpm >= 9)
- Docker & Docker Compose (for database — optional but recommended)

### One-Click Dev Setup

```bash
# Clone the repo
git clone https://github.com/superdevids/nodepress.git
cd nodepress

# Start database services (PostgreSQL, Redis, MinIO)
docker compose up -d

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed sample data (optional)
npm run db:seed

# Start dev servers
npm start
```

Visit http://localhost:3000 for the admin panel and http://localhost:3001 for the API.

### Without Docker

If you don't have Docker, install PostgreSQL 16 and Redis 7 locally, then:

```bash
# Copy and edit .env with your local database credentials
cp .env.example .env
# Edit .env to point to your local PostgreSQL and Redis

npm install
npm run db:generate
npm run db:migrate
npm start
```

---

## 📁 Project Structure

```
nodepress/
├── apps/               # Application shells
│   ├── admin/          # Admin panel (Next.js 14)
│   ├── api/            # REST + GraphQL API (NestJS)
│   ├── web-starter/    # Public-facing theme
│   └── e2e/            # End-to-end tests (Playwright)
├── packages/           # Shared libraries
│   ├── core/           # Business logic engine
│   ├── db/             # Database client & Prisma schema
│   ├── plugin-sdk/     # Plugin Development Kit
│   ├── testing/        # Test utilities & factories
│   ├── ui/             # Shared UI components
│   ├── editor/         # Rich text editor (Tiptap)
│   ├── config/         # Configuration
│   └── cli/            # CLI tools
├── plugins/            # 13 official plugins
└── docs/               # Documentation
```

---

## 📐 Coding Standards

### Linting & Formatting

```bash
# Lint all packages
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# TypeScript type check
npm run typecheck
```

### TypeScript

- **Strict mode** enabled — don't disable it
- Use explicit return types for public APIs
- Prefer `interface` over `type` for object definitions
- Use `type` for unions, intersections, and utility types
- **Avoid `any`** — use `unknown` when the type is uncertain
- No `// @ts-ignore` or `// @ts-expect-error` without justification

---

## 🧪 Testing

### Current Coverage

```
📊 Test files: 24 (and growing!)
   ├── Core engine:     6 test files
   ├── API:             8 test files
   ├── Admin UI:        5 test files
   ├── Media:           2 test files
   ├── E2E:             2 test files
   └── Other:           1 test file
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run a specific package's tests
npx turbo run test --filter=@nodepress/core
```

### Testing Guidelines

- Write tests for **all new features** and **bug fixes**
- Use `@nodepress/testing` factories for test data
- Aim for meaningful tests, not just coverage numbers
- We're working toward 100+ tests — help us get there!
- **Current priority:** API integration tests and plugin tests

---

## 📝 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Usage                   |
| ---------- | ----------------------- |
| `feat`     | New feature             |
| `fix`      | Bug fix                 |
| `chore`    | Maintenance             |
| `docs`     | Documentation           |
| `refactor` | Code refactoring        |
| `test`     | Tests                   |
| `style`    | Code style (formatting) |
| `perf`     | Performance improvement |
| `ci`       | CI/CD changes           |

### Scopes

| Scope        | Area                                 |
| ------------ | ------------------------------------ |
| `core`       | @nodepress/core                      |
| `db`         | @nodepress/db                        |
| `plugin-sdk` | @nodepress/plugin-sdk                |
| `admin`      | Admin panel                          |
| `api`        | API server                           |
| `plugin:*`   | Specific plugin (e.g., `plugin:seo`) |

### Examples

```
feat(core): add content revision diff API
fix(db): resolve migration ordering issue
docs: update API reference
test(api): add auth service tests
```

---

## 🔄 Pull Request Process

### PR Checklist

Before submitting a PR:

- [ ] Code follows coding standards (lint + format pass)
- [ ] TypeScript compiles without errors
- [ ] Tests pass (`npm test`)
- [ ] New features include tests
- [ ] Documentation updated (if applicable)
- [ ] PR title follows Conventional Commits

### Review Process

1. All PRs require at least **one approval** from a maintainer
2. CI must pass (lint, typecheck, test, build)
3. Database schema changes need core team review
4. Plugin API changes need plugin-sdk maintainer review

---

## 🔌 Plugin Development

See the Plugin SDK documentation for creating plugins:

```bash
# Generate a new plugin scaffold
npx nodepressjs generate plugin my-plugin
```

The plugin SDK provides:

- Hook registration (actions & filters)
- Custom REST/GraphQL endpoints
- Block editor extensions
- Manifest and permission system
- Testing utilities

Location: `packages/plugin-sdk/`

---

## ❓ Questions?

- 💬 **GitHub Discussions:** https://github.com/superdevids/nodepress/discussions
- 🐛 **Report bugs:** https://github.com/superdevids/nodepress/issues
- 📖 **Documentation:** See `docs/` and `SUPPORT.md`
