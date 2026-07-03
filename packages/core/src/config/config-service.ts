/**
 * Configuration Service
 *
 * Centralized configuration management with support for:
 * - Environment variables
 * - Database settings (Setting model)
 * - Default values
 */

export interface ConfigOption {
  key: string;
  group: string;
  value: unknown;
  autoload: boolean;
}

export class ConfigService {
  private cache: Map<string, unknown> = new Map();
  private db: { settings: { findMany: (args: unknown) => Promise<ConfigOption[]> } } | null = null;

  constructor() {
    this.loadFromEnv();
  }

  /**
   * Set database adapter for loading persisted settings.
   */
  setDbAdapter(db: { settings: { findMany: (args: unknown) => Promise<ConfigOption[]> } }): void {
    this.db = db;
  }

  /**
   * Load all autoload settings from the database.
   */
  async loadFromDb(): Promise<void> {
    if (!this.db) return;

    const settings = await this.db.settings.findMany({
      where: { autoload: true },
    });

    for (const setting of settings) {
      this.cache.set(`${setting.group}.${setting.key}`, setting.value);
    }
  }

  /**
   * Get a configuration value.
   * Priority: cache > env > default
   */
  get<T>(key: string, defaultValue?: T): T {
    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    // Check environment variable (uppercased, dots replaced with underscores)
    const envKey = key.toUpperCase().replace(/\./g, "_");
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      try {
        return JSON.parse(envValue) as T;
      } catch {
        return envValue as unknown as T;
      }
    }

    return defaultValue as T;
  }

  /**
   * Set a configuration value at runtime.
   */
  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  /**
   * Get all configuration keys matching a group prefix.
   */
  getAll(group: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const prefix = `${group}.`;

    for (const [key, value] of this.cache) {
      if (key.startsWith(prefix)) {
        result[key.slice(prefix.length)] = value;
      }
    }

    return result;
  }

  /**
   * Preload configuration from environment variables.
   */
  private loadFromEnv(): void {
    // Application
    this.cache.set("app.url", process.env.APP_URL ?? "http://localhost:3000");
    this.cache.set("app.env", process.env.NODE_ENV ?? "development");
    this.cache.set("app.debug", process.env.NODEPRESS_DEBUG === "true");

    // Cache
    this.cache.set("cache.ttl.default", parseInt(process.env.CACHE_TTL_DEFAULT ?? "300", 10));
    this.cache.set("cache.ttl.long", parseInt(process.env.CACHE_TTL_LONG ?? "3600", 10));

    // Media
    this.cache.set("media.maxFileSize", parseInt(process.env.MEDIA_MAX_FILE_SIZE ?? "10485760", 10));

    // Rate limiting
    this.cache.set("rateLimit.ttl", parseInt(process.env.RATE_LIMIT_TTL ?? "60", 10));
    this.cache.set("rateLimit.max", parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10));
    this.cache.set("rateLimit.loginMax", parseInt(process.env.RATE_LIMIT_LOGIN_MAX ?? "10", 10));

    // Maintenance
    this.cache.set("maintenance.mode", process.env.MAINTENANCE_MODE === "true");
    this.cache.set("maintenance.secret", process.env.MAINTENANCE_SECRET ?? "");
  }
}
