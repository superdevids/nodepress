import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginEngine } from '../plugin/plugin-engine.js';
import { HookRegistry } from '../plugin/hook-registry.js';

const mockPrisma = {
  $executeRawUnsafe: vi.fn(),
  $queryRawUnsafe: vi.fn().mockResolvedValue([]),
  setting: {
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  plugin: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pluginSetting: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  pluginPermission: {
    deleteMany: vi.fn(),
  },
  pluginMigration: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
} as any;

describe('PluginEngine', () => {
  let engine: PluginEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new PluginEngine(mockPrisma, {
      pluginsDir: '/tmp/test-plugins',
      backupDir: '/tmp/test-backups',
      muDir: '/tmp/test-mu',
    });
  });

  describe('registerPlugin', () => {
    it('registers a plugin with manifest', () => {
      engine.registerPlugin({
        slug: 'hello-world',
        name: 'Hello World',
        version: '1.0.0',
      });

      const plugin = engine.getPlugin('hello-world');
      expect(plugin).toBeDefined();
      expect(plugin?.manifest.name).toBe('Hello World');
      expect(plugin?.active).toBe(false);
    });

    it('throws when registering a duplicate plugin', () => {
      engine.registerPlugin({
        slug: 'test',
        name: 'Test',
        version: '1.0.0',
      });

      expect(() =>
        engine.registerPlugin({
          slug: 'test',
          name: 'Test Duplicate',
          version: '1.0.0',
        }),
      ).toThrow('already registered');
    });

    it('registers plugin with dependencies', () => {
      const depResolver = engine.dependencyResolver;
      const spy = vi.spyOn(depResolver, 'registerPlugin');

      engine.registerPlugin({
        slug: 'dependent',
        name: 'Dependent',
        version: '1.0.0',
        dependencies: [{ plugin: 'base', version: '^1.0.0' }],
      });

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getPlugin / getAllPlugins', () => {
    it('returns undefined for non-existent plugin', () => {
      expect(engine.getPlugin('nonexistent')).toBeUndefined();
    });

    it('returns all registered plugins', () => {
      engine.registerPlugin({ slug: 'a', name: 'A', version: '1.0.0' });
      engine.registerPlugin({ slug: 'b', name: 'B', version: '1.0.0' });

      const all = engine.getAllPlugins();
      expect(all).toHaveLength(2);
    });
  });

  describe('activatePlugin', () => {
    it('throws when plugin is not registered', async () => {
      await expect(engine.activatePlugin('nonexistent')).rejects.toThrow('not found');
    });

    it('activates a registered plugin', async () => {
      const activateFn = vi.fn();
      engine.registerPlugin(
        { slug: 'my-plugin', name: 'My Plugin', version: '1.0.0' },
        { activate: activateFn },
      );

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'my-plugin',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('my-plugin');

      const plugin = engine.getPlugin('my-plugin');
      expect(plugin?.active).toBe(true);
      expect(plugin?.activatedAt).toBeInstanceOf(Date);
      expect(activateFn).toHaveBeenCalled();
    });

    it('skips activation if already active', async () => {
      const activateFn = vi.fn();
      engine.registerPlugin(
        { slug: 'active-plugin', name: 'Active', version: '1.0.0' },
        { activate: activateFn },
      );

      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'active-plugin',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('active-plugin');
      await engine.activatePlugin('active-plugin');

      expect(activateFn).toHaveBeenCalledTimes(1);
    });

    it('persists activation to database', async () => {
      engine.registerPlugin({ slug: 'persist-me', name: 'Persist', version: '2.0.0' });

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'persist-me',
        active: true,
        version: '2.0.0',
      });

      await engine.activatePlugin('persist-me');

      expect(mockPrisma.plugin.upsert).toHaveBeenCalledWith({
        where: { slug: 'persist-me' },
        update: { active: true, version: '2.0.0' },
        create: { slug: 'persist-me', version: '2.0.0', active: true },
      });
    });

    it('fires plugin_activated hook', async () => {
      const hookSpy = vi.fn();
      engine.hooks.addAction('plugin_activated', hookSpy);
      engine.registerPlugin({ slug: 'hook-test', name: 'Hook Test', version: '1.0.0' });

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'hook-test',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('hook-test');

      expect(hookSpy).toHaveBeenCalledWith('hook-test');
    });
  });

  describe('deactivatePlugin', () => {
    it('throws when plugin not found', async () => {
      await expect(engine.deactivatePlugin('nonexistent')).rejects.toThrow('not found');
    });

    it('deactivates an active plugin', async () => {
      const deactivateFn = vi.fn();
      engine.registerPlugin(
        { slug: 'deactivate-me', name: 'Deactivate Me', version: '1.0.0' },
        { deactivate: deactivateFn },
      );

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'deactivate-me',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('deactivate-me');
      mockPrisma.plugin.update.mockResolvedValue({ slug: 'deactivate-me', active: false });

      await engine.deactivatePlugin('deactivate-me');

      const plugin = engine.getPlugin('deactivate-me');
      expect(plugin?.active).toBe(false);
      expect(plugin?.deactivatedAt).toBeInstanceOf(Date);
      expect(deactivateFn).toHaveBeenCalled();
    });

    it('skips deactivation if already inactive', async () => {
      const deactivateFn = vi.fn();
      engine.registerPlugin(
        { slug: 'inactive', name: 'Inactive', version: '1.0.0' },
        { deactivate: deactivateFn },
      );

      await engine.deactivatePlugin('inactive');

      expect(deactivateFn).not.toHaveBeenCalled();
    });

    it('fires deactivation hooks', async () => {
      const beforeSpy = vi.fn();
      const afterSpy = vi.fn();
      engine.hooks.addAction('plugin_before_deactivate', beforeSpy);
      engine.hooks.addAction('plugin_deactivated', afterSpy);

      engine.registerPlugin({ slug: 'hook-deact', name: 'Hook Deact', version: '1.0.0' });

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'hook-deact',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('hook-deact');
      mockPrisma.plugin.update.mockResolvedValue({ slug: 'hook-deact', active: false });
      await engine.deactivatePlugin('hook-deact');

      expect(beforeSpy).toHaveBeenCalledWith('hook-deact');
      expect(afterSpy).toHaveBeenCalledWith('hook-deact');
    });
  });

  describe('uninstallPlugin', () => {
    it('throws when plugin not found', async () => {
      await expect(engine.uninstallPlugin('nonexistent')).rejects.toThrow('not found');
    });

    it('deactivates and removes plugin', async () => {
      const uninstallFn = vi.fn();
      engine.registerPlugin(
        { slug: 'uninstall-me', name: 'Uninstall Me', version: '1.0.0' },
        { uninstall: uninstallFn },
      );

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'uninstall-me',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('uninstall-me');
      mockPrisma.plugin.update.mockResolvedValue({ slug: 'uninstall-me', active: false });

      await engine.uninstallPlugin('uninstall-me');

      expect(uninstallFn).toHaveBeenCalled();
      expect(engine.getPlugin('uninstall-me')).toBeUndefined();
    });

    it('fires uninstall hook', async () => {
      const hookSpy = vi.fn();
      engine.hooks.addAction('plugin_uninstalled', hookSpy);

      engine.registerPlugin({ slug: 'uninstall-hook', name: 'Uninstall Hook', version: '1.0.0' });

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'uninstall-hook',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('uninstall-hook');
      mockPrisma.plugin.update.mockResolvedValue({ slug: 'uninstall-hook', active: false });

      await engine.uninstallPlugin('uninstall-hook');

      expect(hookSpy).toHaveBeenCalledWith('uninstall-hook');
    });
  });

  describe('bootActivePlugins', () => {
    it('loads mu-plugins and boots active plugins', async () => {
      const bootFn = vi.fn();
      engine.registerPlugin(
        { slug: 'boot-me', name: 'Boot Me', version: '1.0.0' },
        { boot: bootFn },
      );

      mockPrisma.plugin.findMany.mockResolvedValue([
        { slug: 'boot-me', active: true, updatedAt: new Date() },
      ]);

      await engine.bootActivePlugins();

      expect(bootFn).toHaveBeenCalled();
    });

    it('handles boot errors gracefully without crashing', async () => {
      const bootFn = vi.fn().mockRejectedValue(new Error('Boot error'));
      engine.registerPlugin(
        { slug: 'failing', name: 'Failing', version: '1.0.0' },
        { boot: bootFn },
      );

      mockPrisma.plugin.findMany.mockResolvedValue([
        { slug: 'failing', active: true, updatedAt: new Date() },
      ]);

      await expect(engine.bootActivePlugins()).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    it('deactivates all active plugins', async () => {
      const deactivateFn = vi.fn();
      engine.registerPlugin(
        { slug: 'shutdown-me', name: 'Shutdown', version: '1.0.0' },
        { deactivate: deactivateFn },
      );

      mockPrisma.plugin.findUnique.mockResolvedValue(null);
      mockPrisma.plugin.upsert.mockResolvedValue({
        slug: 'shutdown-me',
        active: true,
        version: '1.0.0',
      });

      await engine.activatePlugin('shutdown-me');
      await engine.shutdown();

      expect(deactivateFn).toHaveBeenCalled();
      const plugin = engine.getPlugin('shutdown-me');
      expect(plugin?.active).toBe(false);
    });
  });
});

describe('HookRegistry (Plugin Integration)', () => {
  let hooks: HookRegistry;

  beforeEach(() => {
    hooks = new HookRegistry();
  });

  describe('action lifecycle', () => {
    it('runs actions with priority ordering', async () => {
      const order: number[] = [];
      hooks.addAction(
        'init',
        () => {
          order.push(1);
        },
        10,
      );
      hooks.addAction(
        'init',
        () => {
          order.push(2);
        },
        5,
      );
      hooks.addAction(
        'init',
        () => {
          order.push(3);
        },
        20,
      );

      await hooks.doAction('init');

      expect(order).toEqual([2, 1, 3]);
    });

    it('passes arguments to action handlers', async () => {
      const fn = vi.fn();
      hooks.addAction('test', fn);

      await hooks.doAction('test', 'arg1', 42);

      expect(fn).toHaveBeenCalledWith('arg1', 42);
    });
  });

  describe('filter lifecycle', () => {
    it('modifies data through filter pipeline', async () => {
      hooks.addFilter('content', (v: string) => v.toUpperCase());
      hooks.addFilter('content', (v: string) => `${v}!`);

      const result = await hooks.applyFilter('content', 'hello');

      expect(result).toBe('HELLO!');
    });

    it('passes additional arguments to filters', async () => {
      const fn = vi.fn();
      hooks.addFilter('name', fn);

      await hooks.applyFilter('name', 'World', 'Hello ');

      expect(fn).toHaveBeenCalledWith('World', 'Hello ');
    });
  });
});
