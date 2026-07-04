# ⚡ NodePress Quick Start

## One-Click Install

```bash
# Windows: double-click install.bat
# Mac/Linux: double-click install.sh

# Or in terminal:
bash install.sh
```

## Prerequisites (if no Docker)

| Requirement | Version | Check     |
| ----------- | ------- | --------- |
| Node.js     | >= 20   | `node -v` |
| pnpm        | >= 9    | `pnpm -v` |

## Essential Commands

```bash
# Start everything
pnpm dev

# Run with Docker
docker compose up -d

# Database migrations
pnpm db:migrate

# Seed sample data
pnpm db:seed

# Open database UI
pnpm db:studio

# Run tests
pnpm test

# Build for production
pnpm build
```

## Services

| Service     | URL                        |
| ----------- | -------------------------- |
| Admin Panel | http://localhost:3000      |
| REST API    | http://localhost:3001      |
| API Docs    | http://localhost:3001/docs |

> **Login:** `admin@nodepress.local` / `admin`
