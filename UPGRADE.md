# 🔄 Upgrade Guide

> ⚠️ **NodePress is beta software.** Upgrades may have breaking changes. Always back up your data first.

---

## Before You Upgrade (⚠️ IMPORTANT)

### 1. Back Up Everything

```bash
# Backup database (PostgreSQL)
pg_dump -U nodepress nodepress > nodepress-backup-$(date +%Y%m%d).sql

# Or using Docker
docker exec -t nodepress-postgres-1 pg_dump -U nodepress nodepress > nodepress-backup.sql

# Backup media files
# If using MinIO/S3: copy your bucket contents
# If using local storage: zip the uploads directory

# Backup environment config
cp .env .env.backup
```

### 2. Check Your Current Version

```bash
# Check package.json version
grep '"version"' package.json

# Or check git tag
git tag --list
```

### 3. Read Release Notes

Check the [CHANGELOG.md](CHANGELOG.md) for breaking changes between versions.

---

## Upgrade Steps

### Step 1: Pull Latest Code

```bash
git pull origin main
```

If you have local changes:

```bash
git stash
git pull origin main
git stash pop  # May cause conflicts — resolve carefully
```

### Step 2: Install Dependencies

```bash
npm install
```

If using pnpm:

```bash
pnpm install
```

### Step 3: Run Database Migrations

```bash
npm run db:migrate
```

> This applies any new database schema changes. It's non-destructive — existing data is preserved.

### Step 4: Regenerate Prisma Client

```bash
npm run db:generate
```

### Step 5: Clear Cache

```bash
# Clear Redis cache and restart
docker compose down
docker compose up -d

# Or if not using Docker, restart the services manually
npx nodepressjs cache flush
```

### Step 6: Restart Services

```bash
# With Docker
docker compose up -d --force-recreate

# Without Docker
npm start
```

---

## Rollback Instructions

If the upgrade fails, here's how to go back:

### Option 1: Rollback Code

```bash
# Check available versions
git log --oneline -20

# Go back to a specific commit or tag
git checkout <previous-commit-hash>

# Reinstall dependencies
npm install

# Rollback database (restore from backup)
psql -U nodepress nodepress < nodepress-backup.sql

# Restart
npm start
```

### Option 2: Restore from Git Tag

```bash
# List tags
git tag

# Checkout previous version
git checkout v1.0.0-beta.1

npm install
npm start
```

### Option 3: Full Reset (⚠️ Destructive)

```bash
# Stop everything
docker compose down -v   # -v deletes ALL data volumes

# Get clean code
git clean -fd
git checkout main
git pull

# Fresh install
npm install
npm run db:migrate
npm run db:seed
npm start
```

---

## Common Upgrade Issues

### "Migration failed" error

```bash
# Check migration status
npx prisma migrate status

# If a migration is stuck, resolve manually
npx prisma migrate resolve --applied <migration-name>
```

### "Module not found" after upgrade

```bash
# Clean install
rm -rf node_modules
npm install

# If using pnpm
rm -rf node_modules
pnpm install
```

### "Port already in use"

```bash
# Kill the old process
# Windows:
netstat -ano | findstr :3000
taskkill /PID <pid> /F

# Mac/Linux:
kill $(lsof -t -i:3000)
```

### TypeScript compilation errors

```bash
# Clear TypeScript build cache
rm -rf apps/*/.next
rm -rf packages/*/dist
npm run build
```

---

## Breaking Changes History

### v0.0.1 → v1.0.0-beta.1

- **Plugin data now persists in database** instead of memory. Existing in-memory data will be lost. Run plugins to regenerate data.
- **API client base URL** now includes `/api` prefix. Update any custom API calls.
- **JWT roles** now use UPPERCASE format. All existing tokens are invalidated. Users must re-login.
- **Environment variables** restructured. Copy `.env.example` to `.env` and reconfigure.

### v1.0.0-beta.1 → v1.0.0-beta.2

- **No breaking changes.** This release focused on installation improvements and bug fixes.

---

## Need Help?

- 📖 [docs/FAQ.md](docs/FAQ.md) — Common questions
- 🐛 [Report upgrade issues](https://github.com/superdevids/nodepress/issues)
- 💬 [Ask on Discussions](https://github.com/superdevids/nodepress/discussions)
