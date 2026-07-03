import type { PrismaClient } from "@nodepress/db";
import { HookRegistry } from "./hook-registry.js";

export interface ActivationHook {
  slug: string;
  callback: () => Promise<void>;
  priority: number;
}

export interface DeactivationHook {
  slug: string;
  callback: () => Promise<void>;
  priority: number;
}

export class ActivationHookManager {
  private prisma: PrismaClient;
  private hooks: HookRegistry;
  private activationHooks: Map<string, ActivationHook[]> = new Map();
  private deactivationHooks: Map<string, DeactivationHook[]> = new Map();

  constructor(prisma: PrismaClient, hooks: HookRegistry) {
    this.prisma = prisma;
    this.hooks = hooks;
  }

  registerActivationHook(slug: string, callback: () => Promise<void>, priority: number = 10): void {
    if (!this.activationHooks.has(slug)) {
      this.activationHooks.set(slug, []);
    }
    const hooks = this.activationHooks.get(slug)!;
    hooks.push({ slug, callback, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  registerDeactivationHook(slug: string, callback: () => Promise<void>, priority: number = 10): void {
    if (!this.deactivationHooks.has(slug)) {
      this.deactivationHooks.set(slug, []);
    }
    const hooks = this.deactivationHooks.get(slug)!;
    hooks.push({ slug, callback, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  async runActivationHooks(slug: string): Promise<void> {
    await this.hooks.doAction("plugin_before_activate", slug);

    const hooks = this.activationHooks.get(slug) ?? [];
    for (const hook of hooks) {
      await hook.callback();
    }

    await this.prisma.plugin.update({
      where: { slug },
      data: {
        active: true,
        updatedAt: new Date(),
      },
    });

    await this.prisma.$executeRawUnsafe(
      `UPDATE plugins SET activated_at = NOW() WHERE slug = $1`,
      slug
    );

    await this.hooks.doAction("plugin_after_activate", slug);
  }

  async runDeactivationHooks(slug: string): Promise<void> {
    await this.hooks.doAction("plugin_before_deactivate", slug);

    const hooks = this.deactivationHooks.get(slug) ?? [];
    for (const hook of hooks) {
      await hook.callback();
    }

    await this.prisma.plugin.update({
      where: { slug },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    });

    await this.prisma.$executeRawUnsafe(
      `UPDATE plugins SET deactivated_at = NOW() WHERE slug = $1`,
      slug
    );

    await this.hooks.doAction("plugin_after_deactivate", slug);
  }

  getActivationHooks(slug: string): ActivationHook[] {
    return this.activationHooks.get(slug) ?? [];
  }

  getDeactivationHooks(slug: string): DeactivationHook[] {
    return this.deactivationHooks.get(slug) ?? [];
  }
}
