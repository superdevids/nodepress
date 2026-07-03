import type { PrismaClient } from "@nodepress/db";
import { HookRegistry } from "./hook-registry.js";
import { RegistryClient, type UpdateCheckResult } from "./registry-client.js";
import { RollbackManager } from "./rollback-manager.js";

export interface AutoUpdateConfig {
  intervalMs: number;
  globalSetting: "all" | "none" | string[];
  securityOnly: boolean;
}

export interface PluginUpdateStatus {
  slug: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  security: boolean;
  autoUpdateEnabled: boolean;
  lastChecked: Date | null;
  lastUpdated: Date | null;
}

export class AutoUpdater {
  private prisma: PrismaClient;
  private hooks: HookRegistry;
  private registry: RegistryClient;
  private rollback: RollbackManager;
  private config: AutoUpdateConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private updateQueue = new Map<string, Promise<boolean>>();

  constructor(
    prisma: PrismaClient,
    hooks: HookRegistry,
    registry: RegistryClient,
    rollback: RollbackManager,
    config?: Partial<AutoUpdateConfig>
  ) {
    this.prisma = prisma;
    this.hooks = hooks;
    this.registry = registry;
    this.rollback = rollback;
    this.config = {
      intervalMs: config?.intervalMs ?? 6 * 60 * 60 * 1000,
      globalSetting: config?.globalSetting ?? "none",
      securityOnly: config?.securityOnly ?? false,
    };
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.runUpdateCheck(), this.config.intervalMs);
    this.runUpdateCheck().catch((err) =>
      console.error("[AutoUpdater] Initial check failed:", err)
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runUpdateCheck(): Promise<PluginUpdateStatus[]> {
    await this.hooks.doAction("auto_updater_before_check");

    const plugins = await this.prisma.plugin.findMany();
    const statuses: PluginUpdateStatus[] = [];

    for (const plugin of plugins) {
      try {
        const update = await this.registry.checkUpdate(plugin.slug, plugin.version);
        const autoUpdateEnabled = await this.isAutoUpdateEnabled(plugin.slug);
        const shouldAutoUpdate = this.shouldAutoUpdate(plugin.slug, autoUpdateEnabled, update.security);

        statuses.push({
          slug: plugin.slug,
          currentVersion: plugin.version,
          latestVersion: update.latestVersion,
          updateAvailable: update.available,
          security: update.security,
          autoUpdateEnabled,
          lastChecked: new Date(),
          lastUpdated: null,
        });

        if (shouldAutoUpdate && update.available) {
          this.queueUpdate(plugin.slug, update).catch((err) =>
            console.error(`[AutoUpdater] Failed to update "${plugin.slug}":`, err)
          );
        }
      } catch (err) {
        console.error(`[AutoUpdater] Check failed for "${plugin.slug}":`, err);
        statuses.push({
          slug: plugin.slug,
          currentVersion: plugin.version,
          latestVersion: plugin.version,
          updateAvailable: false,
          security: false,
          autoUpdateEnabled: false,
          lastChecked: new Date(),
          lastUpdated: null,
        });
      }
    }

    await this.hooks.doAction("auto_updater_after_check", statuses);
    return statuses;
  }

  async isAutoUpdateEnabled(slug: string): Promise<boolean> {
    const envSetting = process.env.NODEPRESS_AUTO_UPDATE_PLUGINS;
    if (envSetting === "all") return true;
    if (envSetting === "none") return false;
    if (envSetting) {
      const slugs = envSetting.split(",").map((s: string) => s.trim());
      return slugs.includes(slug);
    }

    try {
      const setting = await this.prisma.setting.findUnique({
        where: { group_key: { group: "auto_updater", key: slug } },
      });
      return setting?.value === true;
    } catch {
      return false;
    }
  }

  async setAutoUpdateEnabled(slug: string, enabled: boolean): Promise<void> {
    await this.prisma.setting.upsert({
      where: { group_key: { group: "auto_updater", key: slug } },
      create: { group: "auto_updater", key: slug, value: enabled, autoload: true },
      update: { value: enabled },
    });
  }

  setGlobalSetting(setting: "all" | "none" | string[]): void {
    this.config.globalSetting = setting;
  }

  private shouldAutoUpdate(_slug: string, enabled: boolean, isSecurity: boolean): boolean {
    if (isSecurity) return true;
    if (!enabled) return false;
    if (this.config.securityOnly) return false;
    return true;
  }

  private async queueUpdate(slug: string, update: UpdateCheckResult): Promise<boolean> {
    const existing = this.updateQueue.get(slug);
    if (existing) return existing;

    const promise = this.performUpdate(slug, update);
    this.updateQueue.set(slug, promise);
    const result = await promise;
    this.updateQueue.delete(slug);
    return result;
  }

  private async performUpdate(slug: string, update: UpdateCheckResult): Promise<boolean> {
    try {
      await this.hooks.doAction("auto_updater_before_update", slug, update.latestVersion);

      await this.rollback.createBackup(slug, update.latestVersion);

      const pkgPath = await this.registry.downloadPackage(update.downloadUrl, update.checksum);

      const installed = await this.registry.installPackage(slug, pkgPath, update.latestVersion);

      if (installed) {
        await this.hooks.doAction("auto_updater_after_update", slug, update.latestVersion);
      } else {
        await this.rollback.autoRollback(slug, update.latestVersion);
        await this.hooks.doAction("auto_updater_update_failed", slug, update.latestVersion);
      }

      return installed;
    } catch (err) {
      console.error(`[AutoUpdater] Update failed for "${slug}":`, err);
      try {
        await this.rollback.autoRollback(slug, update.latestVersion);
      } catch {
        // rollback failed too
      }
      return false;
    }
  }
}
