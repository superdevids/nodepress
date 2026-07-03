import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PasswordPolicyEngine, type PasswordPolicyConfig } from '@nodepressjs/core';

@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);
  private engine: PasswordPolicyEngine;
  private passwordHistory: Map<string, string[]> = new Map();
  private passwordChangedAt: Map<string, Date> = new Map();

  constructor() {
    this.engine = new PasswordPolicyEngine();
  }

  getConfig(): PasswordPolicyConfig {
    return this.engine.getConfig();
  }

  updateConfig(partial: Partial<PasswordPolicyConfig>): void {
    this.engine.updateConfig(partial);
    this.logger.log('Password policy config updated');
  }

  validate(password: string): { valid: boolean; errors: string[]; strength: { score: number; label: string; feedback: string[] } } {
    return this.engine.validate(password);
  }

  async checkHistory(userId: string, password: string): Promise<boolean> {
    const history = this.passwordHistory.get(userId) || [];
    return !this.engine.isPasswordReused(password, history);
  }

  async addToHistory(userId: string, password: string): Promise<void> {
    const hash = this.engine.hashPassword(password);
    const history = this.passwordHistory.get(userId) || [];
    history.unshift(hash);
    const maxHistory = this.engine.getConfig().historyCount;
    if (history.length > maxHistory) {
      history.pop();
    }
    this.passwordHistory.set(userId, history);
    this.passwordChangedAt.set(userId, new Date());
  }

  isPasswordExpired(userId: string): boolean {
    const changedAt = this.passwordChangedAt.get(userId) || null;
    return this.engine.isPasswordExpired(changedAt);
  }

  async validateAndEnforce(userId: string, password: string): Promise<void> {
    const validation = this.validate(password);
    if (!validation.valid) {
      throw new BadRequestException(
        `Password validation failed: ${validation.errors.join('; ')}`,
      );
    }

    const historyOk = await this.checkHistory(userId, password);
    if (!historyOk) {
      throw new BadRequestException('Password has been used recently. Choose a different password.');
    }
  }
}
