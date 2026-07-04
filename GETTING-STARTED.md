# 🚀 Getting Started with NodePress

## 👋 Welcome!

**NodePress** is a Content Management System (CMS) — like WordPress, but built with modern JavaScript. You can use it to create blogs, websites, online stores, and more!

---

## 📥 Installation (2 Minutes)

### Step 1: Get the Files

```bash
git clone https://github.com/superdevids/nodepress.git
cd nodepress
```

Or download the ZIP from GitHub and extract it.

### Step 2: Run the Installer

| Your Computer  | What to Do                                                     |
| -------------- | -------------------------------------------------------------- |
| 🪟 **Windows** | Double-click `install.bat`                                     |
| 🍎 **Mac**     | Double-click `install.sh` or run `bash install.sh` in Terminal |
| 🐧 **Linux**   | Double-click `install.sh` or run `bash install.sh` in Terminal |

**That's it!** The installer will:

1. ✅ Check if you have Docker or Node.js
2. 🔗 Guide you if anything is missing (with download links)
3. 🚀 Start NodePress automatically
4. 🌐 Open your browser when ready

### Step 3: Follow the Setup Wizard

Your browser opens to **http://localhost:3000** showing a friendly **5-step Setup Wizard**:

| Step                 | What to Do                                             |
| -------------------- | ------------------------------------------------------ |
| 1️⃣ **Database**      | Just click **"Test Connection"** — it's pre-configured |
| 2️⃣ **Admin Account** | Create your account (email + password)                 |
| 3️⃣ **Site Settings** | Give your site a name and tagline                      |
| 4️⃣ **Plugins**       | Pick features: SEO, Comments, Security, Forms...       |
| 5️⃣ **Theme**         | Choose a starter theme for your site                   |

> 🎉 **You're done!** Start creating content immediately!

---

## 🖥️ Your Dashboard

After setup, you'll see the admin dashboard:

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

---

## ✏️ Your First Post

1. Click **Content → Posts** in the left menu
2. Click the **"Add New"** button
3. Type your title in the top field
4. Write your content in the block editor (just like WordPress!)
5. Click **"Publish"** in the top-right corner

> 💡 **Tip:** You can add images, videos, buttons, and more by clicking the **+** button in the editor.

---

## 🔌 Installing Plugins

1. Go to **Plugins** in the left menu
2. Click **"Add New"**
3. Browse available plugins (SEO, Analytics, Comments, Cache...)
4. Click **"Install"** then **"Activate"**

> NodePress comes with **13 official plugins** — everything from SEO to backups.

---

## 🎨 Changing Your Theme

1. Go to **Appearance → Themes**
2. Browse available themes
3. Click **"Activate"** on any theme to preview it
4. Customize under **Appearance → Customize**

---

## ❓ Need Help?

| Resource           | Where to Find It                                     |
| ------------------ | ---------------------------------------------------- |
| 📖 User Guide      | `docs/USER-GUIDE.md`                                 |
| ❓ FAQ             | `docs/FAQ.md`                                        |
| 🔄 Upgrade Guide   | `UPGRADE.md`                                         |
| 🐛 Report a Bug    | https://github.com/superdevids/nodepress/issues      |
| 💬 Ask Questions   | https://github.com/superdevids/nodepress/discussions |
| 🔒 Security Issues | `SECURITY.md`                                        |

---

## 🐳 Docker Tips

If you used the Docker installer:

```bash
# Stop NodePress
docker compose down

# Start again
docker compose up -d

# See logs
docker compose logs -f

# Update to latest version
git pull
docker compose up -d --build
```

---

## 🧪 Local Dev Tips

If you used the Node.js installer:

```bash
# Start development servers
pnpm dev

# Run database migrations
pnpm db:migrate

# Open database UI
pnpm db:studio

# Run tests
pnpm test
```

---

## 📊 Tech Overview

| Service        | Address                    | What It Does                        |
| -------------- | -------------------------- | ----------------------------------- |
| 🖥️ Admin Panel | http://localhost:3000      | Your dashboard and editor           |
| 🔌 API         | http://localhost:3001      | Powers everything behind the scenes |
| 📖 API Docs    | http://localhost:3001/docs | Interactive API documentation       |
| 🗄️ PostgreSQL  | localhost:5432             | Stores all your data                |
| ⚡ Redis       | localhost:6379             | Makes things faster (caching)       |
| 📁 MinIO (S3)  | http://localhost:9000      | Stores images and files             |

> All default credentials: `admin@nodepress.local` / `admin`

---

## 🚀 Deployment Ready

When you're ready to go live, check out:

- `docker-compose.prod.yml` — Production Docker setup
- `docs/` — Full documentation
- https://github.com/superdevids/nodepress — Latest releases
