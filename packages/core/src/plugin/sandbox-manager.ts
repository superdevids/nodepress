import { HookRegistry } from "./hook-registry.js";
import type { PrismaClient } from "@nodepressjs/db";

export interface SandboxConfig {
  memoryLimit: number;
  timeout: number;
  maxAsyncListeners: number;
}

export interface SandboxContext {
  hooks: HookRegistry;
  prisma: PrismaClient;
  logger: typeof console;
  cache: Map<string, unknown>;
}

export class SandboxManager {
  private config: SandboxConfig;
  private hooks: HookRegistry;
  private prisma: PrismaClient;
  private contextCache = new Map<string, SandboxContext>();
  private crashCount = new Map<string, number>();
  private maxCrashes = 3;

  constructor(
    prisma: PrismaClient,
    hooks: HookRegistry,
    config?: Partial<SandboxConfig>
  ) {
    this.prisma = prisma;
    this.hooks = hooks;
    this.config = {
      memoryLimit: 128,
      timeout: 5000,
      maxAsyncListeners: 10,
      ...config,
    };
  }

  createContext(slug: string): SandboxContext {
    if (this.contextCache.has(slug)) {
      return this.contextCache.get(slug)!;
    }

    const prismaProxy = this.createPrismaProxy();

    const context: SandboxContext = {
      hooks: this.hooks,
      prisma: prismaProxy,
      logger: this.createLogger(slug),
      cache: new Map(),
    };

    this.contextCache.set(slug, context);
    return context;
  }

  invalidateContext(slug: string): void {
    this.contextCache.delete(slug);
  }

  async executeInSandbox<T>(
    slug: string,
    fn: (ctx: SandboxContext) => T | Promise<T>
  ): Promise<T> {
    const context = this.createContext(slug);

    const crashKey = slug;
    const crashes = this.crashCount.get(crashKey) ?? 0;
    if (crashes >= this.maxCrashes) {
      throw new Error(
        `Plugin "${slug}" has been auto-deactivated due to ${crashes} crashes.`
      );
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Sandbox execution timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);
    });

    try {
      const result = await Promise.race([fn(context), timeoutPromise]);
      this.crashCount.set(crashKey, 0);
      return result;
    } catch (err) {
      const current = (this.crashCount.get(crashKey) ?? 0) + 1;
      this.crashCount.set(crashKey, current);

      console.error(`[SandboxManager] Plugin "${slug}" crashed (${current}/${this.maxCrashes}):`, err);

      if (current >= this.maxCrashes) {
        await this.autoDeactivate(slug);
      }

      throw err;
    }
  }

  isDeactivated(slug: string): boolean {
    return (this.crashCount.get(slug) ?? 0) >= this.maxCrashes;
  }

  resetCrashCount(slug: string): void {
    this.crashCount.set(slug, 0);
  }

  private createPrismaProxy(): PrismaClient {
    const handler: ProxyHandler<PrismaClient> = {
      get(target, prop, receiver) {
        if (prop === "then" || prop === "catch" || prop === "finally") {
          return undefined;
        }
        return Reflect.get(target, prop, receiver);
      },
    };

    return new Proxy(this.prisma, handler);
  }

  private createLogger(slug: string): typeof console {
    return {
      ...console,
      log: (...args: unknown[]) => console.log(`[Plugin:${slug}]`, ...args),
      info: (...args: unknown[]) => console.info(`[Plugin:${slug}]`, ...args),
      warn: (...args: unknown[]) => console.warn(`[Plugin:${slug}]`, ...args),
      error: (...args: unknown[]) => console.error(`[Plugin:${slug}]`, ...args),
      debug: (...args: unknown[]) => console.debug(`[Plugin:${slug}]`, ...args),
    };
  }

  private async autoDeactivate(slug: string): Promise<void> {
    try {
      await this.prisma.plugin.update({
        where: { slug },
        data: { active: false },
      });

      await this.hooks.doAction("plugin_auto_deactivated", slug);
      console.warn(`[SandboxManager] Plugin "${slug}" auto-deactivated due to repeated crashes.`);
    } catch (err) {
      console.error(`[SandboxManager] Failed to auto-deactivate "${slug}":`, err);
    }
  }
}

type ProxyHandler<T> = {
  get?(target: T, prop: string | symbol, receiver: unknown): unknown;
};
