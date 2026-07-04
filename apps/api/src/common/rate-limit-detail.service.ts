import { Injectable, Logger } from '@nestjs/common';

export interface RateLimitRecord {
  identifier: string;
  action: string;
  attempts: { timestamp: number }[];
  blockedUntil: number | null;
  lockoutLevel: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  lockoutDurations: number[];
  captchaAfter: number;
}

const ACTION_CONFIGS: Record<string, RateLimitConfig> = {
  login: {
    windowMs: 60000,
    maxAttempts: 5,
    lockoutDurations: [300000, 900000, 3600000],
    captchaAfter: 5,
  },
  'password-reset': {
    windowMs: 3600000,
    maxAttempts: 3,
    lockoutDurations: [3600000, 7200000],
    captchaAfter: 3,
  },
  'api.create': {
    windowMs: 60000,
    maxAttempts: 30,
    lockoutDurations: [300000, 900000, 3600000],
    captchaAfter: 20,
  },
  'api.read': {
    windowMs: 60000,
    maxAttempts: 1000,
    lockoutDurations: [60000, 300000, 900000],
    captchaAfter: 500,
  },
};

@Injectable()
export class RateLimitDetailService {
  private readonly logger = new Logger(RateLimitDetailService.name);
  private readonly records = new Map<string, RateLimitRecord>();

  async check(
    identifier: string,
    action: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
    requiresCaptcha: boolean;
  }> {
    const config = ACTION_CONFIGS[action] || ACTION_CONFIGS['api.read'];
    const key = `${identifier}:${action}`;
    const now = Date.now();
    let record = this.records.get(key);

    if (!record) {
      record = { identifier, action, attempts: [], blockedUntil: null, lockoutLevel: 0 };
      this.records.set(key, record);
    }

    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      return { allowed: false, remaining: 0, retryAfter, requiresCaptcha: true };
    }

    record.attempts = record.attempts.filter((a) => now - a.timestamp < config.windowMs);
    record.attempts.push({ timestamp: now });

    const attemptCount = record.attempts.length;
    const remaining = Math.max(0, config.maxAttempts - attemptCount);
    const requiresCaptcha = attemptCount >= config.captchaAfter;

    if (attemptCount > config.maxAttempts) {
      record.lockoutLevel = Math.min(record.lockoutLevel + 1, config.lockoutDurations.length - 1);
      const duration = config.lockoutDurations[record.lockoutLevel];
      record.blockedUntil = now + duration;
      const retryAfter = Math.ceil(duration / 1000);
      this.logger.warn(
        `Rate limit exceeded for ${identifier}:${action}, blocked for ${duration}ms`,
      );
      return { allowed: false, remaining: 0, retryAfter, requiresCaptcha: true };
    }

    record.blockedUntil = null;

    return { allowed: true, remaining, retryAfter: 0, requiresCaptcha };
  }

  async reset(identifier: string, action?: string): Promise<void> {
    if (action) {
      this.records.delete(`${identifier}:${action}`);
    } else {
      for (const key of this.records.keys()) {
        if (key.startsWith(`${identifier}:`)) {
          this.records.delete(key);
        }
      }
    }
  }

  getActionConfig(action: string): RateLimitConfig {
    return ACTION_CONFIGS[action] || ACTION_CONFIGS['api.read'];
  }

  isBlocked(identifier: string, action: string): boolean {
    const record = this.records.get(`${identifier}:${action}`);
    if (!record) return false;
    if (!record.blockedUntil) return false;
    return Date.now() < record.blockedUntil;
  }

  getAttemptCount(identifier: string, action: string): number {
    const record = this.records.get(`${identifier}:${action}`);
    if (!record) return 0;
    const now = Date.now();
    const config = ACTION_CONFIGS[action] || ACTION_CONFIGS['api.read'];
    return record.attempts.filter((a) => now - a.timestamp < config.windowMs).length;
  }
}
