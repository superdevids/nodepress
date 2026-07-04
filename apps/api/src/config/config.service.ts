import { Injectable, Logger } from '@nestjs/common';

/**
 * Config service — Security Keys (Gap F-01)
 *
 * Centralised configuration access with environment variable
 * validation and sensible defaults for development.
 *
 * In production all secrets should be injected via environment
 * variables or a secret manager (HashiCorp Vault, AWS Secrets Manager).
 */
@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  /**
   * Provenance map — tracks whether each key was loaded from
   * env, default, or an explicit setter.
   */
  private readonly provenance = new Map<string, string>();

  constructor() {
    this.logger.log('ConfigService initialised');
  }

  /**
   * Get a configuration value by key.
   *
   * Looks up `NODEPRESS_<KEY>` first, falls back to `<KEY>`,
   * then returns the provided default.
   */
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    // Try NODEPRESS_ prefixed env var first
    const prefixed = process.env[`NODEPRESS_${key}`];
    if (prefixed !== undefined) {
      this.provenance.set(key, 'env:NODEPRESS_*');
      return this.coerce<T>(prefixed);
    }

    // Try raw env var
    const raw = process.env[key];
    if (raw !== undefined) {
      this.provenance.set(key, 'env');
      return this.coerce<T>(raw);
    }

    // Return default
    if (defaultValue !== undefined) {
      this.provenance.set(key, 'default');
      return defaultValue;
    }

    return undefined;
  }

  /** Check the provenance (source) of a configuration value. */
  getProvenance(key: string): string | undefined {
    return this.provenance.get(key);
  }

  /** List all known configuration keys. */
  keys(): string[] {
    return Array.from(this.provenance.keys());
  }

  /**
   * Validate that required configuration keys are set.
   * Throws on first missing key.
   */
  require(...keys: string[]): void {
    for (const key of keys) {
      const value = this.get(key);
      if (value === undefined || value === '') {
        throw new Error(
          `Required configuration "${key}" is not set. ` +
            `Set it via NODEPRESS_${key} environment variable.`,
        );
      }
    }
  }

  /**
   * Secret key rotation helper.
   * Returns the current secret and validates minimum length.
   */
  getSecret(key: string, minLength = 32): string {
    const secret = this.get<string>(key, '');
    if (!secret || secret.length < minLength) {
      throw new Error(
        `Secret "${key}" is too short or unset ` +
          `(min ${minLength} chars). Set it via NODEPRESS_${key} environment variable.`,
      );
    }
    return secret;
  }

  // ---- primitive type coercion ----

  private coerce<T>(value: string): T {
    // Boolean
    if (value === 'true') return true as T;
    if (value === 'false') return false as T;

    // Number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') return num as T;

    // Default: string
    return value as T;
  }
}
