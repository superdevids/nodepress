/**
 * PluginStorage — persistent-amenable in-memory storage for NodePress plugins.
 *
 * Provides key-value and array-style storage backed by an in-memory Map.
 * Accepts an optional `persistCallback` that is invoked on every mutation,
 * enabling a future Prisma/DB bridge without changing plugin code.
 *
 * @example
 * ```ts
 * const store = new PluginStorage<CommentData>('comments', {
 *   persistCallback: async (key, value) => {
 *     await prisma.pluginData.upsert({ ... });
 *   },
 * });
 * store.set(id, comment);
 * store.find(c => c.authorEmail === 'foo@bar.com');
 * ```
 */
export interface PluginStorageOptions {
  /** Optional async callback fired after every write/deletion. */
  persistCallback?: (
    operation: 'set' | 'delete' | 'clear',
    key: string,
    value?: unknown,
  ) => Promise<void>;
}

export class PluginStorage<T> {
  private data: Map<string, T>;
  private pluginSlug: string;
  private persistCallback?: PluginStorageOptions['persistCallback'];

  constructor(pluginSlug: string, options?: PluginStorageOptions) {
    this.pluginSlug = pluginSlug;
    this.data = new Map();
    this.persistCallback = options?.persistCallback;
  }

  // ── Key-value API ──────────────────────────────────────────────

  get(key: string): T | undefined {
    return this.data.get(key);
  }

  set(key: string, value: T): void {
    this.data.set(key, value);
    this.persistCallback?.('set', key, value).catch(() => {});
  }

  delete(key: string): boolean {
    const existed = this.data.delete(key);
    if (existed) this.persistCallback?.('delete', key).catch(() => {});
    return existed;
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  clear(): void {
    this.data.clear();
    this.persistCallback?.('clear', '').catch(() => {});
  }

  get size(): number {
    return this.data.size;
  }

  keys(): IterableIterator<string> {
    return this.data.keys();
  }

  values(): IterableIterator<T> {
    return this.data.values();
  }

  entries(): IterableIterator<[string, T]> {
    return this.data.entries();
  }

  /** Returns a snapshot of all entries as a plain object (for serialisation). */
  toObject(): Record<string, T> {
    const obj: Record<string, T> = {};
    for (const [k, v] of this.data) obj[k] = v;
    return obj;
  }

  /** Hydrate from a plain object (e.g. loaded from DB on boot). */
  hydrate(obj: Record<string, T>): void {
    for (const [k, v] of Object.entries(obj)) this.data.set(k, v);
  }

  // ── Array-like helpers ─────────────────────────────────────────

  /** Generate a unique key and insert the value. Returns the generated key. */
  push(value: T): string {
    const key = `${this.pluginSlug}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.set(key, value);
    return key;
  }

  toArray(): T[] {
    return Array.from(this.data.values());
  }

  find(predicate: (item: T, key: string) => boolean): T | undefined {
    for (const [key, value] of this.data) {
      if (predicate(value, key)) return value;
    }
    return undefined;
  }

  filter(predicate: (item: T, key: string) => boolean): T[] {
    const result: T[] = [];
    for (const [key, value] of this.data) {
      if (predicate(value, key)) result.push(value);
    }
    return result;
  }

  map<U>(fn: (item: T, key: string) => U): U[] {
    return Array.from(this.data.entries()).map(([k, v]) => fn(v, k));
  }

  reduce<U>(fn: (acc: U, item: T, key: string) => U, initial: U): U {
    let acc = initial;
    for (const [key, value] of this.data) {
      acc = fn(acc, value, key);
    }
    return acc;
  }

  /** Remove the first `n` entries (FIFO eviction). */
  spliceFirst(n: number): void {
    const keys = Array.from(this.data.keys()) as string[];
    const limit = Math.min(n, keys.length);
    for (let i = 0; i < limit; i++) {
      const k = keys[i];
      if (k !== undefined) this.data.delete(k);
    }
  }

  /** Find the index of the first item matching predicate (by insertion order). */
  findIndex(predicate: (item: T) => boolean): number {
    let idx = 0;
    for (const value of this.data.values()) {
      if (predicate(value)) return idx;
      idx++;
    }
    return -1;
  }

  /** Remove item at the given index. Returns the removed item or undefined. */
  removeAt(index: number): T | undefined {
    const keys = Array.from(this.data.keys()) as string[];
    if (index < 0 || index >= keys.length) return undefined;
    const key = keys[index];
    const value = key !== undefined ? this.data.get(key) : undefined;
    if (key !== undefined && value !== undefined) {
      this.data.delete(key);
      this.persistCallback?.('delete', key).catch(() => {});
    }
    return value;
  }
}

/** Convenience factory for creating a plugin-scoped storage. */
export function createPluginStorage<T>(
  pluginSlug: string,
  options?: PluginStorageOptions,
): PluginStorage<T> {
  return new PluginStorage<T>(pluginSlug, options);
}

// ─────────────────────────────────────────────────────────────
// PersistentPluginStore — Prisma-backed key-value store
// ─────────────────────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';

/**
 * PersistentPluginStore — persists plugin data to the PluginData table.
 *
 * Keeps an in-memory cache for fast reads, writes through to PostgreSQL.
 * Data survives restarts and is partitioned by (pluginId, namespace).
 *
 * @example
 * ```ts
 * const store = createPersistentStore(ctx.prisma, 'comments', 'comments');
 * await store.load();
 * await store.set('comment-1', { id: '1', text: 'hello' });
 * const comment = await store.get('comment-1');
 * ```
 */
export class PersistentPluginStore {
  private cache: Map<string, unknown>;
  private loaded: boolean = false;

  constructor(
    private prisma: PrismaClient,
    private pluginId: string,
    private namespace: string,
  ) {
    this.cache = new Map();
  }

  /**
   * Load all records from the database into the in-memory cache.
   * Call once after construction (typically in boot or activate).
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const records = await this.prisma.pluginData.findMany({
        where: { pluginId: this.pluginId, namespace: this.namespace },
      });
      for (const r of records) {
        this.cache.set(r.key, r.value);
      }
      this.loaded = true;
    } catch (err) {
      // If DB is not available, operate in memory-only mode
      this.loaded = true;
    }
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    if (!this.loaded) await this.load();
    return this.cache.get(key) as T | undefined;
  }

  async set<T = any>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
    try {
      await this.prisma.pluginData.upsert({
        where: {
          pluginId_namespace_key: { pluginId: this.pluginId, namespace: this.namespace, key },
        },
        create: { pluginId: this.pluginId, namespace: this.namespace, key, value: value as any },
        update: { value: value as any },
      });
    } catch {
      // DB unavailable — keep in-memory
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    try {
      await this.prisma.pluginData.delete({
        where: {
          pluginId_namespace_key: { pluginId: this.pluginId, namespace: this.namespace, key },
        },
      });
    } catch {
      // not found or DB unavailable
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    try {
      await this.prisma.pluginData.deleteMany({
        where: { pluginId: this.pluginId, namespace: this.namespace },
      });
    } catch {
      // DB unavailable
    }
  }

  async getAll<T = any>(): Promise<Record<string, T>> {
    if (!this.loaded) await this.load();
    const result: Record<string, T> = {};
    for (const [k, v] of this.cache) {
      result[k] = v as T;
    }
    return result;
  }

  async keys(): Promise<string[]> {
    if (!this.loaded) await this.load();
    return Array.from(this.cache.keys());
  }

  async values<T = any>(): Promise<T[]> {
    if (!this.loaded) await this.load();
    return Array.from(this.cache.values()) as T[];
  }

  async size(): Promise<number> {
    if (!this.loaded) await this.load();
    return this.cache.size;
  }

  /** Check if a key exists in the cache. */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // ── Array-like helpers ──────────────────────────────────────

  /** Generate a unique key and insert the value. Returns the generated key. */
  async push<T = any>(value: T): Promise<string> {
    const key = `${this.pluginId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await this.set(key, value);
    return key;
  }

  async toArray<T = any>(): Promise<T[]> {
    if (!this.loaded) await this.load();
    return Array.from(this.cache.values()) as T[];
  }

  async find<T = any>(predicate: (item: T, key: string) => boolean): Promise<T | undefined> {
    if (!this.loaded) await this.load();
    for (const [key, value] of this.cache) {
      if (predicate(value as T, key)) return value as T;
    }
    return undefined;
  }

  async filter<T = any>(predicate: (item: T, key: string) => boolean): Promise<T[]> {
    if (!this.loaded) await this.load();
    const result: T[] = [];
    for (const [key, value] of this.cache) {
      if (predicate(value as T, key)) result.push(value as T);
    }
    return result;
  }

  async map<U = any>(fn: (item: any, key: string) => U): Promise<U[]> {
    if (!this.loaded) await this.load();
    return Array.from(this.cache.entries()).map(([k, v]) => fn(v, k));
  }

  async reduce<U = any>(fn: (acc: U, item: any, key: string) => U, initial: U): Promise<U> {
    if (!this.loaded) await this.load();
    let acc = initial;
    for (const [key, value] of this.cache) {
      acc = fn(acc, value, key);
    }
    return acc;
  }

  /** Remove the first `n` entries (FIFO eviction). */
  async spliceFirst(n: number): Promise<void> {
    if (!this.loaded) await this.load();
    const keys = Array.from(this.cache.keys()) as string[];
    const limit = Math.min(n, keys.length);
    const toDelete = keys.slice(0, limit);
    for (const k of toDelete) {
      this.cache.delete(k);
    }
    if (toDelete.length > 0) {
      try {
        await this.prisma.pluginData.deleteMany({
          where: {
            pluginId: this.pluginId,
            namespace: this.namespace,
            key: { in: toDelete },
          },
        });
      } catch {
        // DB unavailable
      }
    }
  }

  /** Find the index of the first item matching predicate (by insertion order). */
  async findIndex(predicate: (item: any) => boolean): Promise<number> {
    if (!this.loaded) await this.load();
    let idx = 0;
    for (const value of this.cache.values()) {
      if (predicate(value)) return idx;
      idx++;
    }
    return -1;
  }

  /** Remove item at the given index. Returns the removed item or undefined. */
  async removeAt(index: number): Promise<any | undefined> {
    if (!this.loaded) await this.load();
    const keys = Array.from(this.cache.keys()) as string[];
    if (index < 0 || index >= keys.length) return undefined;
    const key = keys[index];
    const value = key !== undefined ? this.cache.get(key) : undefined;
    if (key !== undefined) {
      this.cache.delete(key);
      try {
        await this.prisma.pluginData.delete({
          where: {
            pluginId_namespace_key: { pluginId: this.pluginId, namespace: this.namespace, key },
          },
        });
      } catch {
        // DB unavailable
      }
    }
    return value;
  }
}

/** Convenience factory for creating a persistent plugin store. */
export function createPersistentStore(
  prisma: PrismaClient,
  pluginId: string,
  namespace: string,
): PersistentPluginStore {
  return new PersistentPluginStore(prisma, pluginId, namespace);
}
