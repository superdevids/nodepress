import type { PrismaClient } from "@nodepressjs/db";
import { HookRegistry } from "./hook-registry.js";

export interface PluginMigration {
  version: string;
  name?: string;
  up: (prisma: PrismaClient) => Promise<void>;
  down: (prisma: PrismaClient) => Promise<void>;
}

interface PendingMigration {
  version: string;
  name?: string;
  up: (prisma: PrismaClient) => Promise<void>;
}

export class DbMigrationManager {
  private prisma: PrismaClient;
  private hooks: HookRegistry;
  private migrations = new Map<string, PluginMigration[]>();

  constructor(prisma: PrismaClient, hooks: HookRegistry) {
    this.prisma = prisma;
    this.hooks = hooks;
    this.ensureTrackingTable();
  }

  registerMigration(slug: string, migration: PluginMigration): void {
    if (!this.migrations.has(slug)) {
      this.migrations.set(slug, []);
    }
    const list = this.migrations.get(slug)!;
    const existing = list.find((m) => m.version === migration.version);
    if (existing) {
      throw new Error(`Migration "${migration.version}" already registered for plugin "${slug}".`);
    }
    list.push(migration);
    list.sort((a, b) => this.compareVersions(a.version, b.version));
  }

  async runPending(slug: string): Promise<string[]> {
    const applied = await this.getAppliedVersions(slug);
    const pending = this.getPending(slug, applied);
    const ran: string[] = [];

    for (const migration of pending) {
      try {
        await migration.up(this.prisma);
        await this.recordMigration(slug, migration.version, migration.name);
        ran.push(migration.version);
        await this.hooks.doAction("plugin_migration_run", slug, migration.version);
      } catch (err) {
        console.error(`[DbMigration] Failed migration ${migration.version} for "${slug}":`, err);
        throw err;
      }
    }

    return ran;
  }

  async rollbackAll(slug: string): Promise<string[]> {
    const applied = await this.getAppliedVersions(slug);
    const all = this.migrations.get(slug) ?? [];
    const rolled: string[] = [];

    for (const migration of all.reverse()) {
      if (!applied.includes(migration.version)) continue;
      try {
        await migration.down(this.prisma);
        await this.removeMigration(slug, migration.version);
        rolled.push(migration.version);
        await this.hooks.doAction("plugin_migration_rollback", slug, migration.version);
      } catch (err) {
        console.error(`[DbMigration] Failed rollback ${migration.version} for "${slug}":`, err);
        throw err;
      }
    }

    return rolled;
  }

  getMigrations(slug: string): PluginMigration[] {
    return this.migrations.get(slug) ?? [];
  }

  private async getAppliedVersions(slug: string): Promise<string[]> {
    try {
      const rows = await this.prisma.$queryRawUnsafe<{ version: string }[]>(
        `SELECT version FROM _plugin_migrations WHERE plugin_slug = $1 ORDER BY applied_at ASC`,
        slug
      );
      return rows.map((r) => r.version);
    } catch {
      return [];
    }
  }

  private getPending(slug: string, applied: string[]): PendingMigration[] {
    const all = this.migrations.get(slug) ?? [];
    return all
      .filter((m) => !applied.includes(m.version))
      .map((m) => ({ version: m.version, name: m.name, up: m.up }));
  }

  private async recordMigration(slug: string, version: string, name?: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO _plugin_migrations (plugin_slug, version, name, applied_at) VALUES ($1, $2, $3, NOW())`,
        slug,
        version,
        name ?? null
      );
    } catch {
      // table may not exist yet
    }
  }

  private async removeMigration(slug: string, version: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM _plugin_migrations WHERE plugin_slug = $1 AND version = $2`,
        slug,
        version
      );
    } catch {
      // ignore
    }
  }

  private async ensureTrackingTable(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS _plugin_migrations (
          id SERIAL PRIMARY KEY,
          plugin_slug VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          name VARCHAR(255),
          applied_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(plugin_slug, version)
        )
      `);
    } catch {
      // ignore
    }
  }

  private compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] ?? 0;
      const nb = pb[i] ?? 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }
}
