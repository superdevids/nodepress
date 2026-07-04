# ============================================================
# NodePress - Multi-Stage Dockerfile
# WordPress-compatible CMS built with Node.js / TypeScript
# ============================================================
# Usage:
#   docker build --target production -t nodepress:latest .
#   docker build --target api -t nodepress-api:latest .
#   docker build --target admin -t nodepress-admin:latest .
# ============================================================

# ---- Stage 0: Base Image ----
FROM node:20-alpine AS base

ARG PNPM_VERSION=9.1.4

RUN apk add --no-cache libc6-compat curl gcompat \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && pnpm --version

WORKDIR /app

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY turbo.json ./

COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/plugin-sdk/package.json ./packages/plugin-sdk/
COPY packages/ui/package.json ./packages/ui/
COPY packages/editor/package.json ./packages/editor/
COPY packages/config/package.json ./packages/config/
COPY packages/cli/package.json ./packages/cli/
COPY packages/testing/package.json ./packages/testing/

# ---- Stage 1: Dependencies ----
FROM base AS deps

RUN pnpm install --frozen-lockfile

COPY packages/db/prisma ./packages/db/prisma
RUN cd packages/db && pnpm exec prisma generate

# ---- Stage 2: Builder ----
FROM deps AS builder

COPY . .

ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=/api

RUN pnpm exec turbo run build --filter=./packages/* \
    && pnpm exec turbo run build --filter=./apps/api \
    && pnpm exec turbo run build --filter=./apps/admin

# ---- Stage 3: Production API Image ----
FROM node:20-alpine AS api

RUN apk add --no-cache libc6-compat curl \
    && corepack enable \
    && corepack prepare pnpm@9.1.4 --activate

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/turbo.json ./turbo.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/plugin-sdk ./packages/plugin-sdk

COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma

RUN pnpm install --frozen-lockfile --prod \
    && mkdir -p storage/logs storage/uploads \
    && addgroup -g 1001 -S nodepress \
    && adduser -S -u 1001 -G nodepress nodepress \
    && chown -R nodepress:nodepress /app/storage

USER nodepress

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:3001/healthz || exit 1

CMD ["node", "apps/api/dist/main"]

# ---- Stage 4: Production Admin Image ----
FROM node:20-alpine AS admin

RUN apk add --no-cache libc6-compat curl \
    && corepack enable \
    && corepack prepare pnpm@9.1.4 --activate

WORKDIR /app

COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/next.config.js ./apps/admin/next.config.js
COPY --from=builder /app/apps/admin/tsconfig.json ./apps/admin/tsconfig.json

COPY --from=builder /app/packages/ui ./packages/ui
COPY --from=builder /app/packages/core ./packages/core
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/packages/editor ./packages/editor

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

RUN pnpm install --frozen-lockfile --prod \
    && addgroup -g 1001 -S nodepress \
    && adduser -S -u 1001 -G nodepress nodepress \
    && chown -R nodepress:nodepress /app/apps/admin

USER nodepress

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node_modules/.bin/next", "start", "-p", "3000"]

# ---- Stage 5: Combined Production Image ----
FROM node:20-alpine AS production

RUN apk add --no-cache libc6-compat curl \
    && corepack enable \
    && corepack prepare pnpm@9.1.4 --activate

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/turbo.json ./turbo.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/admin/.next ./apps/admin/.next
COPY --from=builder /app/apps/admin/package.json ./apps/admin/package.json
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder /app/apps/admin/next.config.js ./apps/admin/next.config.js
COPY --from=builder /app/apps/admin/tsconfig.json ./apps/admin/tsconfig.json

COPY --from=builder /app/packages ./packages

RUN pnpm install --frozen-lockfile --prod \
    && mkdir -p storage/logs storage/uploads \
    && addgroup -g 1001 -S nodepress \
    && adduser -S -u 1001 -G nodepress nodepress \
    && chown -R nodepress:nodepress /app/storage /app/apps

USER nodepress

EXPOSE 3000 3001

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=30s \
    CMD curl -f http://localhost:3001/healthz || exit 1

CMD ["node", "apps/api/dist/main"]
