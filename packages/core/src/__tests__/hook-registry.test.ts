import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HookRegistry } from '../plugin/hook-registry.js';

describe('HookRegistry', () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = new HookRegistry();
  });

  describe('actions', () => {
    it('addAction registers a callback', () => {
      const fn = vi.fn();
      registry.addAction('init', fn);
      expect(registry.hasAction('init')).toBe(true);
    });

    it('doAction executes registered callbacks', async () => {
      const fn = vi.fn();
      registry.addAction('init', fn);
      await registry.doAction('init', 'arg1', 42);
      expect(fn).toHaveBeenCalledWith('arg1', 42);
    });

    it('doAction executes multiple callbacks in priority order', async () => {
      const order: number[] = [];
      registry.addAction('test', () => { order.push(10); }, 10);
      registry.addAction('test', () => { order.push(5); }, 5);
      registry.addAction('test', () => { order.push(20); }, 20);
      await registry.doAction('test');
      expect(order).toEqual([5, 10, 20]);
    });

    it('removeAction removes a specific callback', async () => {
      const fn1 = vi.fn();
      const fn2 = vi.fn();
      registry.addAction('test', fn1);
      registry.addAction('test', fn2);
      registry.removeAction('test', fn1);
      await registry.doAction('test');
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalled();
    });

    it('doAction does nothing when no callbacks are registered', async () => {
      await expect(registry.doAction('nonexistent')).resolves.toBeUndefined();
    });

    it('hasAction returns false for unregistered actions', () => {
      expect(registry.hasAction('unknown')).toBe(false);
    });

    it('getActionNames returns registered action names', () => {
      registry.addAction('init', vi.fn());
      registry.addAction('shutdown', vi.fn());
      const names = registry.getActionNames();
      expect(names).toContain('init');
      expect(names).toContain('shutdown');
    });
  });

  describe('filters', () => {
    it('addFilter registers a filter callback', () => {
      const fn = vi.fn();
      registry.addFilter('title', fn);
      expect(registry.hasFilter('title')).toBe(true);
    });

    it('applyFilter passes value through registered filters', async () => {
      registry.addFilter('title', (value: string) => `Filtered: ${value}`);
      const result = await registry.applyFilter('title', 'Hello');
      expect(result).toBe('Filtered: Hello');
    });

    it('applyFilter pipes through multiple filters in priority order', async () => {
      registry.addFilter('price', (value: number) => value * 2, 10);
      registry.addFilter('price', (value: number) => value + 5, 5);
      const result = await registry.applyFilter('price', 10);
      // priority 5: 10 + 5 = 15; priority 10: 15 * 2 = 30
      expect(result).toBe(30);
    });

    it('applyFilter returns original value when no filters registered', async () => {
      const result = await registry.applyFilter('nonexistent', 'original');
      expect(result).toBe('original');
    });

    it('filters can modify arguments beyond the value', async () => {
      const fn = vi.fn((value: string, _prefix: string) => `${_prefix}${value}`);
      registry.addFilter('name', fn);
      await registry.applyFilter('name', 'World', 'Hello ');
      expect(fn).toHaveBeenCalledWith('World', 'Hello ');
    });

    it('removeFilter removes a specific filter callback', async () => {
      const fn1 = vi.fn((v: string) => `${v} [modified]`);
      const fn2 = vi.fn((v: string) => `${v} [also]`);
      registry.addFilter('test', fn1);
      registry.addFilter('test', fn2);
      registry.removeFilter('test', fn1);
      const result = await registry.applyFilter('test', 'value');
      expect(result).toBe('value [also]');
    });
  });
});
