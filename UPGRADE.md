# Upgrade Guide

## Upgrading from v0.0.1 to v1.0.0-beta.1

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16
- Redis 7

### Steps

1. **Backup your data**

   ```bash
   npx nodepressjs backup create
   ```

2. **Update dependencies**

   ```bash
   pnpm install
   ```

3. **Run database migrations**

   ```bash
   pnpm db:migrate
   ```

4. **Clear cache**

   ```bash
   npx nodepressjs cache flush
   ```

5. **Restart services**
   ```bash
   docker compose up -d --force-recreate
   ```

### Breaking Changes

- Plugin data now persists in database instead of memory. Existing in-memory data will be lost. Run plugins to regenerate data.
- API client base URL changed to include `/api` prefix. Update any custom API calls.
- JWT roles now use UPPERCASE format. All existing tokens are invalidated. Users must re-login.

### Rollback

To rollback to v0.0.1:

```bash
git checkout <previous-tag>
pnpm install
pnpm db:migrate
```
