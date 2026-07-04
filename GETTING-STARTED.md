# 🚀 Getting Started with NodePress

## 👋 Welcome!

**NodePress** is a Content Management System (CMS) — like WordPress, but built with modern JavaScript (TypeScript). You can use it to create blogs, websites, and content platforms.

> ⚠️ **Beta Notice:** NodePress is v1.0.0-beta.2 — under active development. It works well for testing and development, but we don't recommend it for production websites yet.

---

## 📋 System Requirements

| Requirement           | Minimum                       | Recommended |
| --------------------- | ----------------------------- | ----------- |
| **RAM**               | 4 GB                          | 8 GB        |
| **Disk Space**        | 10 GB free                    | 20 GB free  |
| **Node.js**           | v20+                          | v22 LTS     |
| **npm**               | v9+                           | v10+        |
| **OS**                | Windows 10+, macOS 12+, Linux | Same        |
| **Docker** (optional) | Docker Desktop 4.x+           | Latest      |

---

## 📥 Installation (2 Minutes)

### Step 1: Get the Files

Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux):

```bash
git clone https://github.com/superdevids/nodepress.git
cd nodepress
```

> **No git?** Download the ZIP from https://github.com/superdevids/nodepress and extract it.

### Step 2: Run the Installer

| Your Computer  | What to Do                        |
| -------------- | --------------------------------- |
| 🪟 **Windows** | Double-click `install.bat`        |
| 🍎 **Mac**     | Run `bash install.sh` in Terminal |
| 🐧 **Linux**   | Run `bash install.sh` in Terminal |

**What the installer does:**

1. ✅ Checks if you have Node.js (or Docker)
2. 🔗 Opens download links if anything is missing
3. 🚀 Installs dependencies and starts NodePress
4. 🌐 Opens your browser at `http://localhost:3000`

### Step 3: Manual Install (if installer fails)

If the one-click installer doesn't work, here's what to do:

```bash
# 1. Install dependencies
npm install

# 2. Start NodePress
npm start
```

This runs both the API server and admin panel simultaneously.

---

## 🐳 Troubleshooting: Docker Failures

### Docker Desktop Not Installed (Windows)

The installer may try to use Docker. If you see Docker errors:

1. **Download Docker Desktop:** https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Re-run `install.bat`

**OR skip Docker entirely** — just use the Node.js method:

```bash
npm install
npm start
```

### Docker Port Conflicts

If you see `port is already allocated` errors:

```bash
# Check what's using the port
docker ps

# Stop conflicting containers
docker stop <container-id>

# Or change ports in docker-compose.yml
```

### Common Docker Errors

| Error                                 | Cause                    | Fix                                     |
| ------------------------------------- | ------------------------ | --------------------------------------- |
| `Cannot connect to the Docker daemon` | Docker not running       | Start Docker Desktop                    |
| `docker: command not found`           | Docker not installed     | Install Docker Desktop                  |
| `port 5432 already in use`            | Another Postgres running | Stop local Postgres or use Node.js mode |

---

## 🌐 After Installation

Your browser opens to **http://localhost:3000**.

### What You'll See

```
┌──────────────────────────────────────────────────┐
│  📊 Dashboard                                    │
│                                                  │
│  At a Glance:                                    │
│  📝 Posts: 0    📄 Pages: 0    💬 Comments: 0    │
│  👥 Users: 1 (you!)   📦 Plugins: 13 available   │
│                                                  │
│  Quick Actions:                                  │
│  [✏️ Create Post] [📁 Upload Media]              │
│  [👤 Manage Users] [⚙️ Site Settings]            │
└──────────────────────────────────────────────────┘
```

> ⚠️ **Note:** The Install Wizard (5-step setup UI) is still in development. For now, the system comes pre-configured with default settings. You can change everything later in Settings.

---

## ✏️ Creating Your First Post

1. Click **Content → Posts** in the left menu
2. Click the **"Add New"** button
3. Type your title
4. Write your content in the block editor
5. Click **"Publish"** in the top-right corner

> 💡 **Tip:** Click the **+** button in the editor to add images, videos, buttons, and more.

---

## 🔌 Installing Plugins

1. Go to **Plugins** in the left menu
2. Click **"Add New"**
3. Browse the available plugins
4. Click **"Install"** then **"Activate"**

> NodePress comes with **13 official plugins** — SEO, Analytics, Comments, Cache, Security, Forms, and more.

---

## ❓ Troubleshooting

### "npm install" fails

```bash
# Try clearing npm cache
npm cache clean --force

# Make sure you have the right Node version
node -v  # Should show v20 or higher

# If you have nvm (Node Version Manager):
nvm use 20
```

### "npm start" fails

```bash
# Check if ports are already in use
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Mac/Linux

# Try different approaches
node start.js         # Simple start
npm run dev           # Development mode with hot reload
```

### White screen / blank page in browser

```bash
# Check the terminal for error messages
# Make sure both API (port 3001) and Admin (port 3000) are running
# Try clearing browser cache (Ctrl+Shift+R)
```

### Default credentials don't work

The default login is:

- **Email:** `admin@nodepress.local`
- **Password:** `admin`

If this doesn't work, check the terminal output — the installer may have generated different credentials.

---

## 🐳 Docker Commands Reference

```bash
# Stop NodePress
docker compose down

# Start again
docker compose up -d

# See logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build

# Full reset (lose all data!)
docker compose down -v
```

---

## 📊 Services Overview

| Service            | Address                    | What It Does                            |
| ------------------ | -------------------------- | --------------------------------------- |
| 🖥️ **Admin Panel** | http://localhost:3000      | Your dashboard and editor               |
| 🔌 **REST API**    | http://localhost:3001      | Powers everything behind the scenes     |
| 📖 **API Docs**    | http://localhost:3001/docs | Interactive API documentation (Swagger) |
| 🗄️ **PostgreSQL**  | localhost:5432             | Stores all your data                    |
| ⚡ **Redis**       | localhost:6379             | Makes things faster (caching + queues)  |
| 📁 **MinIO (S3)**  | http://localhost:9000      | Stores images and files                 |

---

## 🚀 Deploying to Production

> ⚠️ NodePress is beta software. Production deployment is **not yet recommended** for live websites.

If you want to try deploying:

```bash
# Production Docker stack (experimental)
docker compose -f docker-compose.prod.yml up -d
```

Check `docs/PRD7.md` for the complete production readiness plan.

---

## 📚 Need Help?

| Resource           | Where to Find It                                     |
| ------------------ | ---------------------------------------------------- |
| 📖 User Guide      | `docs/USER-GUIDE.md`                                 |
| ❓ FAQ             | `docs/FAQ.md`                                        |
| ⚡ Quick Start     | `QUICK-START.md`                                     |
| 🔄 Upgrade Guide   | `UPGRADE.md`                                         |
| 🐛 Report a Bug    | https://github.com/superdevids/nodepress/issues      |
| 💬 Ask Questions   | https://github.com/superdevids/nodepress/discussions |
| 🔒 Security Issues | `SECURITY.md`                                        |
