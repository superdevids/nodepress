export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  group?: string;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
  group: string;
}

export interface ObjectCache {
  get<T>(key: string, group?: string): Promise<T | null>;
  set<T>(key: string, value: T, group?: string, ttl?: number): Promise<void>;
  delete(key: string, group?: string): Promise<void>;
  flush(): Promise<void>;
  getStats?(): CacheStats;
}

export interface CacheStats {
  entries: number;
  hits: number;
  misses: number;
  size: number;
  memoryEstimate?: string;
}

export class CacheService implements ObjectCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private groupIndex: Map<string, Set<string>> = new Map();
  private defaultTTL: number;
  private hits: number = 0;
  private misses: number = 0;

  constructor(defaultTTL: number = 300) {
    this.defaultTTL = defaultTTL;
  }

  async initialize(): Promise<void> {
    // Redis connection or in-memory setup
  }

  async get<T>(key: string, group?: string): Promise<T | null> {
    const cacheKey = group ? `${group}:${key}` : key;
    const entry = this.store.get(cacheKey) as CacheEntry<T> | undefined;
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(cacheKey);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  async set<T>(key: string, value: T, group?: string, ttl?: number): Promise<void>;
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  async set<T>(key: string, value: T, groupOrOptions?: string | CacheOptions, ttl?: number): Promise<void> {
    let group = "";
    let optionsTtl: number | undefined;
    let tags: string[] = [];

    if (typeof groupOrOptions === "string") {
      group = groupOrOptions;
      optionsTtl = ttl;
    } else if (groupOrOptions) {
      group = groupOrOptions.group ?? "";
      optionsTtl = groupOrOptions.ttl;
      tags = groupOrOptions.tags ?? [];
    }

    const cacheKey = group ? `${group}:${key}` : key;
    const resolvedTtl = (optionsTtl ?? this.defaultTTL) * 1000;

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + resolvedTtl,
      tags,
      group,
    };

    this.store.set(cacheKey, entry);

    if (group) {
      if (!this.groupIndex.has(group)) {
        this.groupIndex.set(group, new Set());
      }
      this.groupIndex.get(group)!.add(cacheKey);
    }

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(cacheKey);
    }
  }

  async delete(key: string, group?: string): Promise<void> {
    const cacheKey = group ? `${group}:${key}` : key;
    const entry = this.store.get(cacheKey);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagIndex.get(tag)?.delete(cacheKey);
      }
      if (entry.group) {
        this.groupIndex.get(entry.group)?.delete(cacheKey);
      }
    }
    this.store.delete(cacheKey);
  }

  async flush(): Promise<void> {
    this.store.clear();
    this.tagIndex.clear();
    this.groupIndex.clear();
    this.hits = 0;
    this.misses = 0;
  }

  async flushGroup(group: string): Promise<void> {
    const keys = this.groupIndex.get(group);
    if (!keys) return;
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry) {
        for (const tag of entry.tags) {
          this.tagIndex.get(tag)?.delete(key);
        }
      }
      this.store.delete(key);
    }
    this.groupIndex.delete(group);
  }

  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.tagIndex.get(tag);
    if (!keys) return;
    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry?.group) {
        this.groupIndex.get(entry.group)?.delete(key);
      }
      this.store.delete(key);
    }
    this.tagIndex.delete(tag);
  }

  async clear(): Promise<void> {
    await this.flush();
  }

  getStats(): CacheStats {
    return {
      entries: this.store.size,
      hits: this.hits,
      misses: this.misses,
      size: this.tagIndex.size,
    };
  }

  async shutdown(): Promise<void> {
    await this.flush();
  }
}
