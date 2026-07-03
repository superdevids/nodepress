import type { PrismaClient } from "@nodepress/db";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { HookRegistry } from "./hook-registry.js";

export interface UninstallHook {
  pluginSlug: string;
  callback: () => Promise<void>;
  priority: number;
}

export class UninstallManager {
  private prisma: PrismaClient;
  private hooks: HookRegistry;
  private pluginsDir: string;
  private uninstallHooks: Map<string, UninstallHook[]> = new Map();

  constructor(prisma: PrismaClient, hooks: HookRegistry, pluginsDir: string) {
    this.prisma = prisma;
    this.hooks = hooks;
    this.pluginsDir = pluginsDir;
  }

  registerUninstallHook(slug: string, callback: () => Promise<void>, priority: number = 10): void {
    if (!this.uninstallHooks.has(slug)) {
      this.uninstallHooks.set(slug, []);
    }
    const hooks = this.uninstallHooks.get(slug)!;
    hooks.push({ pluginSlug: slug, callback, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  async uninstall(slug: string): Promise<void> {
    await this.hooks.doAction("plugin_before_uninstall", slug);

    const hooks = this.uninstallHooks.get(slug) ?? [];
    for (const hook of hooks) {
      await hook.callback();
    }

    await this.dropPluginTables(slug);

    await this.prisma.setting.deleteMany({
      where: { pluginId: slug },
    });

    const pluginRecord = await this.prisma.plugin.findUnique({ where: { slug } });
    if (pluginRecord) {
      await this.prisma.pluginPermission.deleteMany({
        where: { pluginId: pluginRecord.id },
      });
      await this.prisma.plugin.delete({ where: { slug } });
    }

    const pluginDir = join(this.pluginsDir, slug);
    if (existsSync(pluginDir)) {
      rmSync(pluginDir, { recursive: true, force: true });
    }

    await this.hooks.doAction("plugin_after_uninstall", slug);
  }

  async trackCreatedTable(slug: string, tableName: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO _plugin_created_tables (plugin_slug, table_name, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING`,
      slug,
      tableName
    );
  }

  private async dropPluginTables(slug: string): Promise<void> {
    try {
      const tables = await this.prisma.$queryRawUnsafe<{ table_name: string }[]>(
        `SELECT table_name FROM _plugin_created_tables WHERE plugin_slug = $1`,
        slug
      );

      for (const { table_name } of tables) {
        await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table_name}" CASCADE`);
      }

      await this.prisma.$executeRawUnsafe(
        `DELETE FROM _plugin_created_tables WHERE plugin_slug = $1`,
        slug
      );
    } catch {
      // _plugin_created_tables might not exist yet
    }
  }

  getUninstallHooks(slug: string): UninstallHook[] {
    return this.uninstallHooks.get(slug) ?? [];
  }
}
