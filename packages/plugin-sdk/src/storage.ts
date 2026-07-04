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
