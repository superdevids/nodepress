/**
 * Security Service (Gap F-01 — Security Keys/Salts)
 *
 * WordPress-compatible security keys and salts system.
 * Provides encryption, hashing, nonce generation, and input validation.
 */
import crypto from "node:crypto";

export interface SecurityKeys {
  authKey: string;
  secureAuthKey: string;
  loggedInKey: string;
  nonceKey: string;
  authSalt: string;
  secureAuthSalt: string;
  loggedInSalt: string;
  nonceSalt: string;
}

export class SecurityService {
  private keys: SecurityKeys;

  constructor() {
    this.keys = this.loadKeys();
  }

  /**
   * Initialize the security service.
   */
  async initialize(): Promise<void> {
    // Keys are loaded from environment variables in constructor
  }

  /**
   * Generate a nonce token (WordPress-compatible).
   * Nonces are valid for 12 hours by default.
   */
  createNonce(action: string, userId: string = "guest"): string {
    const hash = crypto
      .createHmac("sha256", this.keys.nonceKey)
      .update(`${action}:${userId}:${this.getNonceTick()}`)
      .digest("hex")
      .substring(0, 10);

    return hash;
  }

  /**
   * Verify a nonce token.
   */
  verifyNonce(nonce: string, action: string, userId: string = "guest"): boolean {
    // Check current tick
    const currentTick = this.getNonceTick();
    const expectedHash = crypto
      .createHmac("sha256", this.keys.nonceKey)
      .update(`${action}:${userId}:${currentTick}`)
      .digest("hex")
      .substring(0, 10);

    if (crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(expectedHash))) {
      return true;
    }

    // Check previous tick (tolerate 12-hour clock skew)
    const prevTick = currentTick - 1;
    if (prevTick >= 0) {
      const prevHash = crypto
        .createHmac("sha256", this.keys.nonceKey)
        .update(`${action}:${userId}:${prevTick}`)
        .digest("hex")
        .substring(0, 10);

      return crypto.timingSafeEqual(Buffer.from(nonce), Buffer.from(prevHash));
    }

    return false;
  }

  /**
   * Generate a salt for password hashing.
   */
  generateSalt(length: number = 64): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash a value with a secret key (used for cookie tokens, etc.).
   */
  hashWithKey(value: string, key: string): string {
    return crypto
      .createHmac("sha256", key)
      .update(value)
      .digest("hex");
  }

  /**
   * Verify a hashed value.
   */
  verifyHash(value: string, hash: string, key: string): boolean {
    const expectedHash = this.hashWithKey(value, key);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }

  /**
   * Sanitize HTML input (strip dangerous tags/attributes).
   */
  sanitizeHtml(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "")
      .replace(/on\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "");
  }

  /**
   * Validate a URL is from a trusted host.
   */
  validateTrustedHost(url: string, allowedHosts: string[]): boolean {
    try {
      const parsed = new URL(url);
      return allowedHosts.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a cryptographically secure random token.
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Get the current nonce tick (half-day intervals since Unix epoch).
   */
  private getNonceTick(): number {
    return Math.floor(Date.now() / (12 * 3600 * 1000));
  }

  /**
   * Load security keys from environment variables with fallback generation.
   */
  private loadKeys(): SecurityKeys {
    return {
      authKey: process.env.AUTH_KEY ?? this.generateSalt(32),
      secureAuthKey: process.env.SECURE_AUTH_KEY ?? this.generateSalt(32),
      loggedInKey: process.env.LOGGED_IN_KEY ?? this.generateSalt(32),
      nonceKey: process.env.NONCE_KEY ?? this.generateSalt(32),
      authSalt: process.env.AUTH_SALT ?? this.generateSalt(32),
      secureAuthSalt: process.env.SECURE_AUTH_SALT ?? this.generateSalt(32),
      loggedInSalt: process.env.LOGGED_IN_SALT ?? this.generateSalt(32),
      nonceSalt: process.env.NONCE_SALT ?? this.generateSalt(32),
    };
  }

  getKeys(): SecurityKeys {
    return { ...this.keys };
  }
}
