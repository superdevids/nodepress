/**
 * Plugin/Theme Unit Test Framework (Gap H-04).
 * Provides mocks and test harnesses for plugin developers.
 */

import { HookRegistry } from "@nodepress/plugin-sdk";
import type { PluginManifest, PluginLifecycle, PluginContext } from "@nodepress/plugin-sdk";

/**
 * Create a mock PluginSDK instance for testing.
 * Uses vi.fn() if vitest is available, otherwise falls back to jest.fn().
 */
export function createPluginSDKMock() {
  const mockFn = typeof vi !== "undefined" ? vi.fn : typeof jest !== "undefined" ? jest.fn : () => {
    const fn = (...args: unknown[]) => { fn.mock.calls.push(args); };
    fn.mock = { calls: [] as unknown[][] };
    return fn;
  };

  return {
    hooks: createHookRegistryMock(),
    registerContentType: mockFn(),
    defineField: mockFn(),
    registerBlock: mockFn(),
    registerSetting: mockFn(),
    registerCron: mockFn(),
    registerCapability: mockFn(),
    registerShortcode: mockFn(),
    db: createPrismaMock(),
    logger: createLoggerMock(),
    settings: new Map<string, unknown>(),
    storage: new Map<string, unknown>(),
  };
}

/**
 * Create an isolated HookRegistry mock.
 */
export function createHookRegistryMock() {
  const mockFn = typeof vi !== "undefined" ? vi.fn : typeof jest !== "undefined" ? jest.fn : () => {
    const fn = (...args: unknown[]) => { fn.mock.calls.push(args); };
    fn.mock = { calls: [] as unknown[][] };
    return fn;
  };

  const hooks = new HookRegistry();
  const actions = new Map<string, Set<() => void>>();
  const filters = new Map<string, Set<(v: unknown) => unknown>>();

  return {
    ...hooks,
    addAction: mockFn(),
    removeAction: mockFn(),
    doAction: mockFn(),
    addFilter: mockFn(),
    removeFilter: mockFn(),
    applyFilter: mockFn(),
    hasAction: mockFn(() => false),
    hasFilter: mockFn(() => false),
    getActionNames: mockFn(() => []),
    getFilterNames: mockFn(() => []),
    _realHooks: hooks,
    _actions: actions,
    _filters: filters,
  };
}

/**
 * Create a mock Prisma client with all standard models.
 */
export function createPrismaMock() {
  const mockFn = typeof vi !== "undefined" ? vi.fn : typeof jest !== "undefined" ? jest.fn : () => {
    const fn = (...args: unknown[]) => { fn.mock.calls.push(args); };
    fn.mock = { calls: [] as unknown[][] };
    return fn;
  };

  const modelMethods = (): Record<string, unknown> => ({
    findUnique: mockFn(),
    findFirst: mockFn(),
    findMany: mockFn(),
    create: mockFn(),
    update: mockFn(),
    upsert: mockFn(),
    delete: mockFn(),
    deleteMany: mockFn(),
    count: mockFn(),
    aggregate: mockFn(),
  });

  return {
    $connect: mockFn(),
    $disconnect: mockFn(),
    $transaction: mockFn((cb: (tx: Record<string, unknown>) => unknown) => cb({})),
    user: modelMethods(),
    userMeta: modelMethods(),
    session: modelMethods(),
    applicationPassword: modelMethods(),
    apiKey: modelMethods(),
    setting: modelMethods(),
    contentType: modelMethods(),
    contentEntry: modelMethods(),
    revision: modelMethods(),
    contentMeta: modelMethods(),
    taxonomy: modelMethods(),
    term: modelMethods(),
    termRelation: modelMethods(),
    termMeta: modelMethods(),
    media: modelMethods(),
    comment: modelMethods(),
    commentMeta: modelMethods(),
    menu: modelMethods(),
    menuItem: modelMethods(),
    plugin: modelMethods(),
    pluginPermission: modelMethods(),
    webhookSubscription: modelMethods(),
    webhookDelivery: modelMethods(),
    auditLog: modelMethods(),
    notification: modelMethods(),
    contentLock: modelMethods(),
    scheduledAction: modelMethods(),
    $extends: mockFn(),
    $on: mockFn(),
    $use: mockFn(),
  };
}

/**
 * Create a mock logger.
 */
export function createLoggerMock() {
  const mockFn = typeof vi !== "undefined" ? vi.fn : typeof jest !== "undefined" ? jest.fn : () => {
    const fn = (...args: unknown[]) => { fn.mock.calls.push(args); };
    fn.mock = { calls: [] as unknown[][] };
    return fn;
  };

  return {
    info: mockFn(),
    warn: mockFn(),
    error: mockFn(),
    debug: mockFn(),
    log: mockFn(),
  };
}

export interface PluginTestHarnessOptions {
  manifest?: Partial<PluginManifest>;
  lifecycle?: Partial<PluginLifecycle>;
}

/**
 * PluginTestHarness — boot a plugin in isolation and test its hooks.
 */
export class PluginTestHarness {
  public readonly hooks: HookRegistry;
  public readonly db: ReturnType<typeof createPrismaMock>;
  public readonly logger: ReturnType<typeof createLoggerMock>;
  public readonly manifest: PluginManifest;
  private lifecycle: PluginLifecycle;
  private activated = false;

  constructor(slug: string, options: PluginTestHarnessOptions = {}) {
    this.hooks = new HookRegistry();
    this.db = createPrismaMock();
    this.logger = createLoggerMock();
    this.manifest = {
      slug,
      name: options.manifest?.name ?? slug,
      version: options.manifest?.version ?? "1.0.0-test",
      description: options.manifest?.description,
      author: options.manifest?.author,
      requires: options.manifest?.requires,
      permissions: options.manifest?.permissions,
    };
    this.lifecycle = {
      install: options.lifecycle?.install,
      activate: options.lifecycle?.activate,
      boot: options.lifecycle?.boot,
      deactivate: options.lifecycle?.deactivate,
      uninstall: options.lifecycle?.uninstall,
    };
  }

  get context(): PluginContext {
    return {
      hooks: this.hooks,
      db: this.db,
      logger: this.logger,
    };
  }

  async install(): Promise<void> {
    await this.lifecycle.install?.();
  }

  async activate(): Promise<void> {
    await this.lifecycle.activate?.();
    await this.lifecycle.boot?.(this.context);
    this.activated = true;
  }

  async deactivate(): Promise<void> {
    await this.lifecycle.deactivate?.();
    this.activated = false;
  }

  async uninstall(): Promise<void> {
    await this.lifecycle.uninstall?.();
  }

  isActive(): boolean {
    return this.activated;
  }
}
