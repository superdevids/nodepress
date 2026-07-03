import crypto from "node:crypto";

export interface PluginErrorRecord {
  slug: string;
  errors: { time: number; error: Error }[];
  deactivated: boolean;
  deactivatedAt?: number;
}

export interface RecoveryTokenRecord {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

export class RecoveryMode {
  private pluginErrors: Map<string, PluginErrorRecord> = new Map();
  private recoveryTokens: Map<string, RecoveryTokenRecord> = new Map();
  private active = false;
  private readonly ERROR_THRESHOLD = 3;
  private readonly WINDOW_MS = 5 * 60 * 1000;
  private readonly RECOVERY_TOKEN_EXPIRY = 30 * 60 * 1000;

  isActive(): boolean {
    return this.active;
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  recordPluginError(slug: string, error: Error): boolean {
    const now = Date.now();
    let record = this.pluginErrors.get(slug);

    if (!record) {
      record = { slug, errors: [], deactivated: false };
      this.pluginErrors.set(slug, record);
    }

    record.errors = record.errors.filter((e) => now - e.time < this.WINDOW_MS);
    record.errors.push({ time: now, error });

    if (record.errors.length >= this.ERROR_THRESHOLD && !record.deactivated) {
      record.deactivated = true;
      record.deactivatedAt = now;
      this.autoActivate(slug);
      return true;
    }

    return false;
  }

  private autoActivate(slug: string): void {
    this.active = true;
  }

  getDeactivatedPlugins(): string[] {
    const result: string[] = [];
    for (const [, record] of this.pluginErrors) {
      if (record.deactivated) {
        result.push(record.slug);
      }
    }
    return result;
  }

  generateRecoveryToken(userId: string): { token: string; expiresAt: Date } {
    const raw = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + this.RECOVERY_TOKEN_EXPIRY);
    const record: RecoveryTokenRecord = {
      token: raw,
      userId,
      createdAt: Date.now(),
      expiresAt: expiresAt.getTime(),
      consumed: false,
    };
    this.recoveryTokens.set(raw, record);
    return { token: raw, expiresAt };
  }

  verifyRecoveryToken(token: string, userId: string): boolean {
    const record = this.recoveryTokens.get(token);
    if (!record) return false;
    if (record.userId !== userId) return false;
    if (record.consumed) return false;
    if (Date.now() > record.expiresAt) {
      this.recoveryTokens.delete(token);
      return false;
    }
    return true;
  }

  consumeRecoveryToken(token: string): boolean {
    const record = this.recoveryTokens.get(token);
    if (!record) return false;
    if (record.consumed) return false;
    if (Date.now() > record.expiresAt) {
      this.recoveryTokens.delete(token);
      return false;
    }
    record.consumed = true;
    return true;
  }

  cleanExpiredTokens(): void {
    const now = Date.now();
    for (const [token, record] of this.recoveryTokens.entries()) {
      if (now > record.expiresAt || record.consumed) {
        this.recoveryTokens.delete(token);
      }
    }
  }

  clearPluginErrors(): void {
    this.pluginErrors.clear();
  }

  isPluginDeactivated(slug: string): boolean {
    const record = this.pluginErrors.get(slug);
    return record?.deactivated ?? false;
  }
}
