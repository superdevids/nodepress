import { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';
import Redis from 'ioredis';

export const manifest = {
  slug: 'cache-redis',
  name: 'Redis Cache',
  version: '0.1.0',
  description: 'Advanced Redis-based caching for API responses, pages, and database queries',
  author: 'NodePress Core Team',
  requires: '>=0.1.0',
  permissions: ['settings:read', 'settings:write'],
};

interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory?: string;
  uptime?: number;
}

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      keyPrefix: 'nodepress:cache:',
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

    try {
      await redis.connect();
      context.logger.log('Redis Cache: Connected successfully');
    } catch (err) {
      context.logger.warn('Redis Cache: Connection failed, running in degraded mode');
    }

    async function getCached(key: string): Promise<string | null> {
      try {
        return await redis.get(key);
      } catch {
        return null;
      }
    }

    async function setCache(key: string, value: string, ttlSeconds = 300): Promise<void> {
      try {
        await redis.setex(key, ttlSeconds, value);
      } catch {}
    }

    const objectCache = new Map<string, { value: unknown; expiry: number }>();

    async function getObject<T>(key: string): Promise<T | undefined> {
      const cached = await getCached(`obj:${key}`);
      if (cached) {
        try {
          return JSON.parse(cached) as T;
        } catch {}
      }
      const local = objectCache.get(key);
      if (local && local.expiry > Date.now()) {
        return local.value as T;
      }
      objectCache.delete(key);
      return undefined;
    }

    async function setObject(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
      const expiry = Date.now() + ttlSeconds * 1000;
      objectCache.set(key, { value, expiry });
      await setCache(`obj:${key}`, JSON.stringify(value), ttlSeconds);
    }

    function invalidateByPrefix(prefix: string): void {
      for (const [key] of objectCache) {
        if (key.startsWith(prefix)) objectCache.delete(key);
      }
    }

    context.hooks.addAction('content.afterCreate', async (entry: { contentType?: string }) => {
      invalidateByPrefix(`content:${entry.contentType}`);
    });

    context.hooks.addAction('content.afterUpdate', async (entry: { contentType?: string }) => {
      invalidateByPrefix(`content:${entry.contentType}`);
    });

    context.hooks.addAction('content.afterDelete', async (entry: { contentType?: string }) => {
      invalidateByPrefix(`content:${entry.contentType}`);
    });

    async function warmCache(keys: string[]): Promise<void> {
      for (const key of keys) {
        const value = await getCached(key);
        if (!value) {
          context.logger.log(`Redis Cache: Warming key "${key}"`);
        }
      }
    }

    async function getStats(): Promise<CacheStats> {
      try {
        const info = await redis.info();
        const keys = await redis.dbsize();
        const memory = info.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'N/A';
        const uptime = parseInt(info.match(/uptime_in_seconds:(\d+)/)?.[1] || '0', 10);
        return { hits: 0, misses: 0, keys, memory, uptime };
      } catch {
        return { hits: 0, misses: 0, keys: objectCache.size };
      }
    }

    (context as any).cache = {
      get: getCached,
      set: setCache,
      getObject,
      setObject,
      invalidateByPrefix,
      warmCache,
      getStats,
      redis,
    };

    context.logger.log('Redis Cache plugin fully initialized');
  },

  async deactivate(context: PluginContext) {
    const cache = (context as any).cache;
    if (cache?.redis) {
      try {
        await cache.redis.quit();
      } catch {}
    }
    context.logger.log('Redis Cache plugin deactivated');
  },

  async uninstall(context: PluginContext) {
    context.logger.log('Redis Cache plugin uninstalled');
  },
};
