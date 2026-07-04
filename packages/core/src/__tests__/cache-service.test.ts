import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CacheService } from '../cache/cache-service.js';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService(300);
  });

  describe('set and get', () => {
    it('stores and retrieves a value', async () => {
      await cacheService.set('key1', 'value1');
      const result = await cacheService.get<string>('key1');

      expect(result).toBe('value1');
    });

    it('stores and retrieves object values', async () => {
      const obj = { name: 'test', count: 42 };
      await cacheService.set('obj', obj);
      const result = await cacheService.get<typeof obj>('obj');

      expect(result).toEqual(obj);
    });

    it('stores and retrieves with group prefix', async () => {
      await cacheService.set('key', 'grouped-value', 'mygroup');
      const result = await cacheService.get<string>('key', 'mygroup');

      expect(result).toBe('grouped-value');
    });

    it('returns null for non-existent key', async () => {
      const result = await cacheService.get<string>('nonexistent');

      expect(result).toBeNull();
    });

    it('distinguishes keys in different groups', async () => {
      await cacheService.set('key', 'group-a-value', 'group-a');
      await cacheService.set('key', 'group-b-value', 'group-b');

      const resultA = await cacheService.get<string>('key', 'group-a');
      const resultB = await cacheService.get<string>('key', 'group-b');

      expect(resultA).toBe('group-a-value');
      expect(resultB).toBe('group-b-value');
    });

    it('stores values without group as ungrouped', async () => {
      await cacheService.set('ungrouped', 'no-group');

      const result = await cacheService.get<string>('ungrouped');

      expect(result).toBe('no-group');
    });

    it('retrieves ungrouped value when no group specified', async () => {
      await cacheService.set('simple', 'simple-value');

      const result = await cacheService.get<string>('simple');

      expect(result).toBe('simple-value');
    });
  });

  describe('TTL expiry', () => {
    it('returns value before TTL expiry', async () => {
      await cacheService.set('ttl-key', 'ttl-value', undefined, 60);

      const result = await cacheService.get<string>('ttl-key');
      expect(result).toBe('ttl-value');
    });

    it('returns null after TTL expiry with negative TTL (past expiry)', async () => {
      // Must pass empty string for group to reach the TTL parameter
      await cacheService.set('expire-key', 'expire-value', '', -1);

      const result = await cacheService.get<string>('expire-key');

      expect(result).toBeNull();
    });

    it('respects custom TTL per key', async () => {
      await cacheService.set('short', 'short-lived', '', -1);
      await cacheService.set('long', 'long-lived', '', 3600);

      expect(await cacheService.get<string>('short')).toBeNull();
      expect(await cacheService.get<string>('long')).toBe('long-lived');
    });

    it('uses default TTL when not specified', async () => {
      const shortCache = new CacheService(-1);
      await shortCache.set('default-ttl', 'value');

      const result = await shortCache.get<string>('default-ttl');
      expect(result).toBeNull();
    });

    it('uses tags with TTL', async () => {
      await cacheService.set('tagged', 'tagged-value', { ttl: 30, tags: ['important'] });

      expect(await cacheService.get<string>('tagged')).toBe('tagged-value');
    });
  });

  describe('delete', () => {
    it('removes a cached value by key', async () => {
      await cacheService.set('delete-me', 'value');
      await cacheService.delete('delete-me');

      const result = await cacheService.get<string>('delete-me');
      expect(result).toBeNull();
    });

    it('removes a cached value in a specific group', async () => {
      await cacheService.set('key', 'value', 'group');
      await cacheService.delete('key', 'group');

      const result = await cacheService.get<string>('key', 'group');
      expect(result).toBeNull();
    });

    it('does not affect other keys when deleting', async () => {
      await cacheService.set('keep', 'keep-value');
      await cacheService.set('remove', 'remove-value');
      await cacheService.delete('remove');

      expect(await cacheService.get<string>('keep')).toBe('keep-value');
      expect(await cacheService.get<string>('remove')).toBeNull();
    });

    it('does not throw when deleting nonexistent key', async () => {
      await expect(cacheService.delete('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('flush', () => {
    it('removes all cached values', async () => {
      await cacheService.set('a', 1);
      await cacheService.set('b', 2);
      await cacheService.flush();

      expect(await cacheService.get<number>('a')).toBeNull();
      expect(await cacheService.get<number>('b')).toBeNull();
    });

    it('resets stats after flush', async () => {
      await cacheService.set('a', 1);
      await cacheService.get('a'); // hit
      await cacheService.get('missing'); // miss
      await cacheService.flush();

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.entries).toBe(0);
    });
  });

  describe('flushGroup', () => {
    it('removes all keys in a group', async () => {
      await cacheService.set('a', 1, 'group1');
      await cacheService.set('b', 2, 'group1');
      await cacheService.set('c', 3, 'group2');

      await cacheService.flushGroup('group1');

      expect(await cacheService.get<number>('a', 'group1')).toBeNull();
      expect(await cacheService.get<number>('b', 'group1')).toBeNull();
      expect(await cacheService.get<number>('c', 'group2')).toBe(3);
    });

    it('handles nonexistent group gracefully', async () => {
      await expect(cacheService.flushGroup('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('invalidateByTag', () => {
    it('removes all keys with a specific tag', async () => {
      await cacheService.set('a', 1, { tags: ['tag1'] });
      await cacheService.set('b', 2, { tags: ['tag1', 'tag2'] });
      await cacheService.set('c', 3, { tags: ['tag2'] });

      await cacheService.invalidateByTag('tag1');

      expect(await cacheService.get<number>('a')).toBeNull();
      expect(await cacheService.get<number>('b')).toBeNull();
      expect(await cacheService.get<number>('c')).toBe(3);
    });

    it('handles nonexistent tag gracefully', async () => {
      await cacheService.set('keep', 'value');
      await cacheService.invalidateByTag('nonexistent');

      expect(await cacheService.get<string>('keep')).toBe('value');
    });

    it('removes tag-based entries in groups too', async () => {
      await cacheService.set('key', 'value', { group: 'g1', tags: ['important'] });
      await cacheService.invalidateByTag('important');

      expect(await cacheService.get<string>('key', 'g1')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns initial stats', () => {
      const stats = cacheService.getStats();

      expect(stats.entries).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('tracks cache hits', async () => {
      await cacheService.set('key', 'value');
      await cacheService.get('key');
      await cacheService.get('key');

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(2);
    });

    it('tracks cache misses', async () => {
      await cacheService.get('missing1');
      await cacheService.get('missing2');
      await cacheService.get('missing3');

      const stats = cacheService.getStats();
      expect(stats.misses).toBe(3);
    });

    it('tracks expired keys as misses', async () => {
      await cacheService.set('expire', 'value', '', -1);
      await cacheService.get<string>('expire');

      const stats = cacheService.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it('tracks entry count', async () => {
      await cacheService.set('a', 1);
      await cacheService.set('b', 2);
      await cacheService.set('c', 3);

      expect(cacheService.getStats().entries).toBe(3);
    });
  });

  describe('clear and shutdown', () => {
    it('clear delegates to flush', async () => {
      await cacheService.set('a', 1);
      await cacheService.clear();

      expect(await cacheService.get<number>('a')).toBeNull();
    });

    it('shutdown flushes all data', async () => {
      await cacheService.set('a', 1);
      await cacheService.set('b', 2);
      await cacheService.shutdown();

      expect(cacheService.getStats().entries).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles null values', async () => {
      await cacheService.set('null-key', null);
      const result = await cacheService.get('null-key');

      expect(result).toBe(null);
    });

    it('handles boolean values', async () => {
      await cacheService.set('bool-true', true);
      await cacheService.set('bool-false', false);

      expect(await cacheService.get<boolean>('bool-true')).toBe(true);
      expect(await cacheService.get<boolean>('bool-false')).toBe(false);
    });

    it('handles zero as a value', async () => {
      await cacheService.set('zero', 0);

      expect(await cacheService.get<number>('zero')).toBe(0);
    });

    it('handles empty string as a value', async () => {
      await cacheService.set('empty', '');

      expect(await cacheService.get<string>('empty')).toBe('');
    });

    it('set with options object using group', async () => {
      await cacheService.set('key', 'value', { group: 'my-group', ttl: 60 });

      const result = await cacheService.get<string>('key', 'my-group');
      expect(result).toBe('value');
    });

    it('overwrites existing key with new value', async () => {
      await cacheService.set('key', 'old');
      await cacheService.set('key', 'new');

      expect(await cacheService.get<string>('key')).toBe('new');
    });

    it('overwrites existing key in group', async () => {
      await cacheService.set('key', 'old', 'group');
      await cacheService.set('key', 'new', 'group');

      expect(await cacheService.get<string>('key', 'group')).toBe('new');
    });
  });
});
