# ⚡ NodePress Quick Start

> For developers who want to get up and running fast.

---

## 🚀 One-Click Install

```bash
# Windows: double-click install.bat
# Mac/Linux: double-click install.sh

# Or in terminal:
bash install.sh
```

---

## 🛠️ Manual Install (npm)

### Prerequisites

| Requirement       | Version | Check Command      |
| ----------------- | ------- | ------------------ |
| Node.js           | >= 20   | `node -v`          |
| npm               | >= 9    | `npm -v`           |
| Docker (optional) | Latest  | `docker --version` |

### Install & Start

```bash
# Clone the repo
git clone https://github.com/superdevids/nodepress.git
cd nodepress

# Install dependencies
npm install

# Start everything
npm start
```

---

## 📝 Essential Commands

### npm (recommended for most users)

```bash
npm start              # Start dev servers
npm run dev            # Development mode with hot reload
npm run build          # Build for production
npm test               # Run tests
npm run lint           # Check code quality
npm run format         # Format code
npm run typecheck      # Check TypeScript types
```

### Database

```bash
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed sample data
npm run db:studio      # Open database UI (Prisma Studio)
npm run db:generate    # Regenerate Prisma client
```

### Docker

```bash
docker compose up -d                  # Start all services
docker compose up -d --build          # Rebuild and start
docker compose down                    # Stop all services
docker compose logs -f                # Follow logs
docker compose down -v                # Full reset (deletes data!)
```

### pnpm (if you prefer)

```bash
pnpm install          # Install dependencies (faster, disk-efficient)
pnpm dev              # Start dev servers
pnpm test             # Run tests
pnpm build            # Build for production
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed sample data
```

---

## 🌐 Services

| Service            | URL                        | Notes          |
| ------------------ | -------------------------- | -------------- |
| 🖥️ **Admin Panel** | http://localhost:3000      | Main dashboard |
| 🔌 **REST API**    | http://localhost:3001      | API server     |
| 📖 **API Docs**    | http://localhost:3001/docs | Swagger UI     |
| 📁 **MinIO (S3)**  | http://localhost:9000      | File storage   |
| 🗄️ **PostgreSQL**  | localhost:5432             | Database       |
| ⚡ **Redis**       | localhost:6379             | Cache & queues |

---

## 🔑 Default Login

> **Email:** `admin@nodepress.local`  
> **Password:** `admin`

---

## ⚠️ Common Issues

### "npm install" hangs or fails

```bash
# Try increasing npm timeout
npm config set fetch-timeout 120000
npm install

# Or use a different registry
npm install --registry=https://registry.npmmirror.com
```

### "EADDRINUSE" port conflict

```bash
# Check which process is using the port
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -i :3000

# Kill the process or use a different port
```

### "prisma: command not found"

```bash
# Prisma is a project dependency, install first
npm install
```

### Windows: "node is not recognized"

Download Node.js from https://nodejs.org and restart your terminal.

---

## 🧪 Quick Test

Verify everything is working:

```bash
# 1. Start the services
npm start

# 2. In another terminal, test the API
curl http://localhost:3001/api/health

# Expected response: {"status":"ok"}
```

---

## 📚 Next Steps

- 📖 [GETTING-STARTED.md](GETTING-STARTED.md) — Full walkthrough
- ❓ [docs/FAQ.md](docs/FAQ.md) — Frequently asked questions
- 🐛 [Report Issues](https://github.com/superdevids/nodepress/issues)
