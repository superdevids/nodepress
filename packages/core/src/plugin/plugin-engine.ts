import type { PrismaClient } from '@nodepressjs/db';
import { HookRegistry } from './hook-registry.js';
import type { ShortcodeEngine } from '../shortcode/shortcode-engine.js';
import { DependencyResolver } from './dependency-resolver.js';
import { RegistryClient } from './registry-client.js';
import { RollbackManager } from './rollback-manager.js';
import { UninstallManager } from './uninstall-manager.js';
import { SettingsApi } from './settings-api.js';
import { MuPluginLoader } from './mu-plugin-loader.js';
import { ActivationHookManager } from './activation-hooks.js';
import { CapabilityRegistrar } from './capability-registrar.js';
import { DbMigrationManager } from './db-migration.js';
import { CronApi } from './cron-api.js';
import { AssetRegistry } from './asset-registry.js';
import { FileEditor } from './file-editor.js';
import { AutoUpdater } from './auto-updater.js';
import { PluginI18n } from './plugin-i18n.js';
import { SandboxManager } from './sandbox-manager.js';
import path from 'node:path';

export interface PluginManifest {
  slug: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  requires?: string;
  permissions?: string[];
  sandbox?: 'isolated-vm' | 'none';
  type?: 'mu' | 'regular';
  dependencies?: { plugin: string; version: string }[];
  main?: string;
}

export interface PluginLifecycle {
  install?: () => Promise<void>;
  activate?: () => Promise<void>;
  boot?: (engine: PluginBootContext) => Promise<void>;
  deactivate?: () => Promise<void>;
  uninstall?: () => Promise<void>;
}

export interface PluginBootContext {
  hooks: HookRegistry;
  prisma: PrismaClient;
  logger: Console;
  cache: Map<string, unknown>;
  shortcode?: {
    register: (
      tag: string,
      handler: (attrs: Record<string, string>, content?: string) => string | Promise<string>,
      description?: string,
    ) => void;
  };
}

interface LoadedPlugin {
  manifest: PluginManifest;
  lifecycle: PluginLifecycle;
  active: boolean;
  activatedAt: Date | null;
  deactivatedAt: Date | null;
}

export interface PluginEngineOptions {
  pluginsDir: string;
  backupDir: string;
  registryUrl?: string;
  muDir?: string;
}

export class PluginEngine {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private prisma: PrismaClient;

  public readonly hooks: HookRegistry;
  public readonly dependencyResolver: DependencyResolver;
  public readonly registryClient: RegistryClient;
  public readonly rollbackManager: RollbackManager;
  public readonly uninstallManager: UninstallManager;
  public readonly settingsApi: SettingsApi;
  public readonly muPluginLoader: MuPluginLoader;
  public readonly activationHooks: ActivationHookManager;
  public readonly capabilityRegistrar: CapabilityRegistrar;
  public readonly dbMigration: DbMigrationManager;
  public readonly cronApi: CronApi;
  public readonly assetRegistry: AssetRegistry;
  public readonly fileEditor: FileEditor;
  public readonly autoUpdater: AutoUpdater;
  public readonly pluginI18n: PluginI18n;
  public readonly sandboxManager: SandboxManager;

  private options: PluginEngineOptions;
  private _shortcodeEngine: ShortcodeEngine | null = null;

  constructor(prisma: PrismaClient, options?: Partial<PluginEngineOptions>) {
    this.prisma = prisma;
    this.hooks = new HookRegistry();

    this.options = {
      pluginsDir: options?.pluginsDir ?? path.join(process.cwd(), 'plugins'),
      backupDir: options?.backupDir ?? path.join(process.cwd(), '.backups', 'plugins'),
      muDir: options?.muDir ?? path.join(process.cwd(), 'plugins', 'mu'),
      registryUrl: options?.registryUrl ?? 'https://registry.nodepress.dev',
    };

    this.dependencyResolver = new DependencyResolver();
    this.registryClient = new RegistryClient(prisma, {
      registryUrl: this.options.registryUrl,
      pluginsDir: this.options.pluginsDir,
      backupDir: this.options.backupDir,
    });
    this.rollbackManager = new RollbackManager(
      prisma,
      this.options.backupDir,
      this.options.pluginsDir,
    );
    this.uninstallManager = new UninstallManager(prisma, this.hooks, this.options.pluginsDir);
    this.settingsApi = new SettingsApi(prisma, this.hooks);
    this.muPluginLoader = new MuPluginLoader(
      this.options.muDir ?? path.join(this.options.pluginsDir, 'mu'),
      this.hooks,
    );
    this.activationHooks = new ActivationHookManager(prisma, this.hooks);
    this.capabilityRegistrar = new CapabilityRegistrar(prisma, this.hooks);
    this.dbMigration = new DbMigrationManager(prisma, this.hooks);
    this.cronApi = new CronApi(prisma, this.hooks);
    this.assetRegistry = new AssetRegistry(process.env.NODE_ENV === 'production');
    this.fileEditor = new FileEditor(this.options.pluginsDir, this.options.backupDir);
    this.autoUpdater = new AutoUpdater(
      prisma,
      this.hooks,
      this.registryClient,
      this.rollbackManager,
      { intervalMs: 6 * 60 * 60 * 1000 },
    );
    this.pluginI18n = new PluginI18n(this.hooks, this.options.pluginsDir);
    this.sandboxManager = new SandboxManager(prisma, this.hooks);
  }

  setShortcodeEngine(engine: ShortcodeEngine): void {
    this._shortcodeEngine = engine;
  }

  registerPlugin(manifest: PluginManifest, lifecycle: PluginLifecycle = {}): void {
    if (this.plugins.has(manifest.slug)) {
      throw new Error(`Plugin "${manifest.slug}" is already registered.`);
    }

    if (manifest.dependencies) {
      this.dependencyResolver.registerPlugin(
        manifest.slug,
        manifest.version,
        manifest.dependencies.map((d) => ({ plugin: d.plugin, version: d.version })),
      );
    }

    this.plugins.set(manifest.slug, {
      manifest,
      lifecycle,
      active: false,
      activatedAt: null,
      deactivatedAt: null,
    });
  }

  getPlugin(slug: string): LoadedPlugin | undefined {
    return this.plugins.get(slug);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  async activatePlugin(slug: string): Promise<void> {
    const plugin = this.plugins.get(slug);
    if (!plugin) throw new Error(`Plugin "${slug}" not found.`);
    if (plugin.active) return;

    if (plugin.manifest.dependencies && plugin.manifest.dependencies.length > 0) {
      const resolved = this.dependencyResolver.resolve(slug);
      for (const dep of resolved.order) {
        if (dep !== slug) {
          const depPlugin = this.plugins.get(dep);
          if (depPlugin && !depPlugin.active) {
            await this.activatePlugin(dep);
          }
        }
      }

      if (resolved.missing.length > 0) {
        throw new Error(`Missing dependencies: ${resolved.missing.join(', ')}`);
      }
      if (resolved.circular.length > 0) {
        throw new Error(`Circular dependencies detected: ${resolved.circular.join(' -> ')}`);
      }
    }

    await this.dbMigration.runPending(slug);

    await this.activationHooks.runActivationHooks(slug);

    await plugin.lifecycle.activate?.();

    plugin.active = true;
    plugin.activatedAt = new Date();

    await this.prisma.plugin.upsert({
      where: { slug },
      update: { active: true, version: plugin.manifest.version },
      create: {
        slug,
        version: plugin.manifest.version,
        active: true,
      },
    });

    await this.cronApi.startAll(slug);

    await this.hooks.doAction('plugin_activated', slug);
  }

  async deactivatePlugin(slug: string): Promise<void> {
    const plugin = this.plugins.get(slug);
    if (!plugin) throw new Error(`Plugin "${slug}" not found.`);
    if (!plugin.active) return;

    if (this.muPluginLoader.isMuPlugin(slug)) {
      throw new Error(`Cannot deactivate must-use plugin "${slug}".`);
    }

    await this.hooks.doAction('plugin_before_deactivate', slug);

    await this.cronApi.stopAll(slug);

    await this.activationHooks.runDeactivationHooks(slug);

    await plugin.lifecycle.deactivate?.();

    plugin.active = false;
    plugin.deactivatedAt = new Date();

    await this.prisma.plugin.update({
      where: { slug },
      data: { active: false },
    });

    await this.hooks.doAction('plugin_deactivated', slug);
  }

  async uninstallPlugin(slug: string): Promise<void> {
    const plugin = this.plugins.get(slug);
    if (!plugin) throw new Error(`Plugin "${slug}" not found.`);

    await this.deactivatePlugin(slug);

    await this.dbMigration.rollbackAll(slug);

    this.cronApi.stopAll(slug);

    await this.uninstallManager.uninstall(slug);

    await plugin.lifecycle.uninstall?.();

    this.dependencyResolver.unregisterPlugin(slug);
    this.plugins.delete(slug);

    await this.hooks.doAction('plugin_uninstalled', slug);
  }

  async bootActivePlugins(): Promise<void> {
    await this.muPluginLoader.loadAll();

    const dbPlugins = await this.prisma.plugin.findMany({
      where: { active: true },
    });

    const sorted = this.dependencyResolver.getActivationOrder(dbPlugins.map((p) => p.slug));

    const sortMap = new Map(sorted.map((s, i) => [s, i]));
    dbPlugins.sort((a, b) => {
      const ia = sortMap.get(a.slug) ?? 999;
      const ib = sortMap.get(b.slug) ?? 999;
      return ia - ib;
    });

    for (const dbPlugin of dbPlugins) {
      const plugin = this.plugins.get(dbPlugin.slug);
      if (plugin && !plugin.active) {
        try {
          plugin.active = true;
          plugin.activatedAt = dbPlugin.updatedAt;
          const context: PluginBootContext = {
            hooks: this.hooks,
            prisma: this.prisma,
            logger: console,
            cache: new Map(),
            shortcode: this._shortcodeEngine
              ? {
                  register: (tag, handler, description) => {
                    this._shortcodeEngine!.register(tag, handler, description);
                  },
                }
              : undefined,
          };
          await plugin.lifecycle.boot?.(context);
          await this.cronApi.startAll(dbPlugin.slug);
        } catch (err) {
          console.error(`[PluginEngine] Failed to boot "${dbPlugin.slug}":`, err);
        }
      }
    }

    this.autoUpdater.start();
  }

  async shutdown(): Promise<void> {
    this.autoUpdater.stop();

    for (const [slug, plugin] of this.plugins) {
      if (plugin.active) {
        try {
          await this.cronApi.stopAll(slug);
          await plugin.lifecycle.deactivate?.();
        } catch (err) {
          console.error(`[PluginEngine] Error shutting down "${slug}":`, err);
        }
        plugin.active = false;
      }
    }
  }
}

// Cross-platform path handling: use path.join() from Node.js directly.
// On Windows, path.join() produces backslashes which are correct for the OS.
// File operations (readFile, writeFile, existsSync) all accept backslashes on Windows.
