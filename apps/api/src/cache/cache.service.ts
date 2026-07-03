import { Injectable, Logger } from '@nestjs/common';
import { CACHE_TTL_DEFAULT, CACHE_TTL_LONG } from '../common/constants';

/**
 * Cache service — Gap G-01
 *
 * Lightweight in-memory cache with TTL support.
 * Replace with Redis in production.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, { value: unknown; expiresAt: number }>();

  private hits = 0;
  private misses = 0;

  /** Get a cached value. Returns undefined if missing or expired. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value as T;
  }

  /** Set a cached value with TTL (seconds). */
  set(key: string, value: unknown, ttlSeconds: number = CACHE_TTL_DEFAULT): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /** Delete a specific cache key. */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Flush the entire cache. */
  flush(): void {
    this.store.clear();
    this.logger.log('Cache flushed');
  }

  /** Get cache statistics. */
  stats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? `${((this.hits / total) * 100).toFixed(1)}%` : '0%',
    };
  }
}
