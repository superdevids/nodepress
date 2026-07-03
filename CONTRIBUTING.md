# Contributing to NodePress

Thank you for considering contributing to NodePress! This guide will help you get started.

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose (for database)

### 1-Click Dev Setup

```bash
# Start database services
docker compose up -d

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Run dev servers
pnpm dev
```

Visit http://localhost:3000 for the admin panel and http://localhost:3001 for the API.

## Project Structure

```
nodepress/
├── apps/           # Application shells (admin, api, web-starter)
├── packages/       # Shared packages
│   ├── core/       # Business logic engine
│   ├── db/         # Database client & Prisma schema
│   ├── plugin-sdk/ # Plugin Development Kit
│   ├── testing/    # Test utilities & factories
│   ├── ui/         # UI components
│   ├── editor/     # Rich text editor
│   ├── config/     # Configuration
│   └── cli/        # CLI tools
├── plugins/        # Official plugins (13 WordPress-equivalent plugins)
└── rfcs/           # RFC proposals
```

## Coding Standards

### Linting & Formatting

This project uses ESLint and Prettier for code quality:

```bash
# Lint all packages
pnpm lint

# Format code
pnpm format

# Check formatting
pnpm format:check
```

### TypeScript

- Strict mode enabled
- Use explicit return types for public APIs
- Prefer `interface` over `type` for object definitions
- Use `type` for unions, intersections, and utility types
- Avoid `any` — use `unknown` when type is uncertain

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run tests for a specific package
pnpm --filter @nodepress/core test
```

- Write tests for all new features
- Maintain >80% coverage
- Use `@nodepress/testing` factories for test data

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Usage                         |
| ---------- | ----------------------------- |
| `feat`     | New feature                   |
| `fix`      | Bug fix                       |
| `chore`    | Maintenance                   |
| `docs`     | Documentation                 |
| `refactor` | Code refactoring              |
| `test`     | Tests                         |
| `style`    | Code style (formatting, etc.) |
| `perf`     | Performance improvement       |
| `ci`       | CI/CD changes                 |

### Scopes

| Scope        | Area                  |
| ------------ | --------------------- |
| `core`       | @nodepress/core       |
| `db`         | @nodepress/db         |
| `plugin-sdk` | @nodepress/plugin-sdk |
| `testing`    | @nodepress/testing    |
| `ui`         | @nodepress/ui         |
| `editor`     | @nodepress/editor     |
| `admin`      | Admin panel           |
| `api`        | API server            |
| `plugin:*`   | Specific plugin       |

### Examples

```
feat(core): add content revision diff API
fix(db): resolve migration ordering issue
docs: update API reference for v2.1
test(testing): add factory builder pattern tests
```

## Pull Request Process

### PR Checklist

Before submitting a PR:

- [ ] Code follows coding standards (lint + format)
- [ ] TypeScript compiles without errors
- [ ] Tests pass and coverage > 80%
- [ ] New features include tests
- [ ] Documentation updated (if applicable)
- [ ] Changeset added (`pnpm changeset`)
- [ ] PR title follows Conventional Commits

### Review Process

1. All PRs require at least one approval from a maintainer
2. CI must pass (lint, typecheck, test, build, security)
3. Changes that affect the database schema require review from the core team
4. Plugin API changes require review from the plugin-sdk maintainer

## Release Process

Releases are automated via Changesets:

1. Run `pnpm changeset` to create a changeset file
2. Commit the changeset file with your changes
3. When PR is merged to `main`, the release workflow creates a version PR
4. Merging the version PR publishes updates to npm

## Plugin Development

See [packages/plugin-sdk/README.md](packages/plugin-sdk/README.md) for the Plugin Development Kit documentation, including:

- Creating a new plugin with `npx nodepress-cli generate plugin`
- Registering hooks (actions & filters)
- Adding custom REST/GraphQL endpoints
- Creating custom block editor extensions
- Plugin manifest and permission system
- Testing plugins with `@nodepress/testing`

## Questions?

- Check existing issues or open a new one
- Join our community discussions
- See SUPPORT.md for more ways to get help
