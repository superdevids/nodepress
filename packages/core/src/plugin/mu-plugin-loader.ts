import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PluginManifest } from "./plugin-engine.js";
import { HookRegistry } from "./hook-registry.js";

export interface MuPluginManifest extends PluginManifest {
  type: "mu";
}

export interface MuPlugin {
  manifest: MuPluginManifest;
  boot?: (context: { hooks: HookRegistry }) => Promise<void>;
}

export class MuPluginLoader {
  private muDir: string;
  private hooks: HookRegistry;
  private loaded: Map<string, MuPlugin> = new Map();

  constructor(muDir: string, hooks: HookRegistry) {
    this.muDir = muDir;
    this.hooks = hooks;
  }

  async loadAll(): Promise<MuPlugin[]> {
    if (!existsSync(this.muDir)) {
      return [];
    }

    const entries = readdirSync(this.muDir, { withFileTypes: true });
    const plugins: MuPlugin[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pluginDir = join(this.muDir, entry.name);
      const manifestPath = join(pluginDir, "plugin.json");

      if (!existsSync(manifestPath)) continue;

      try {
        const manifestRaw = readFileSync(manifestPath, "utf-8");
        const manifest: MuPluginManifest = JSON.parse(manifestRaw);

        if (manifest.type !== "mu") continue;

        const mainPath = join(pluginDir, manifest.main ?? "index.js");
        if (!existsSync(mainPath)) continue;

        const pluginModule = await import(mainPath);
        const boot = pluginModule.boot || pluginModule.default?.boot;

        const muPlugin: MuPlugin = {
          manifest: {
            ...manifest,
            type: "mu",
          },
          boot: boot ? (ctx: { hooks: HookRegistry }) => boot(ctx) : undefined,
        };

        this.loaded.set(entry.name, muPlugin);
        plugins.push(muPlugin);
      } catch (err) {
        console.error(`[MuPluginLoader] Failed to load MU plugin "${entry.name}":`, err);
      }
    }

    for (const plugin of plugins) {
      if (plugin.boot) {
        try {
          await plugin.boot({ hooks: this.hooks });
        } catch (err) {
          console.error(`[MuPluginLoader] Failed to boot MU plugin "${plugin.manifest.name}":`, err);
        }
      }
    }

    return plugins;
  }

  getLoaded(): MuPlugin[] {
    return Array.from(this.loaded.values());
  }

  get(slug: string): MuPlugin | undefined {
    return this.loaded.get(slug);
  }

  isMuPlugin(slug: string): boolean {
    return this.loaded.has(slug);
  }
}
