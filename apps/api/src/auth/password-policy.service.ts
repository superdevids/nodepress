import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PasswordPolicyEngine, type PasswordPolicyConfig } from '@nodepressjs/core';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PasswordPolicyService {
  private readonly logger = new Logger(PasswordPolicyService.name);
  private engine: PasswordPolicyEngine;

  constructor(private readonly prisma: PrismaService) {
    this.engine = new PasswordPolicyEngine();
  }

  getConfig(): PasswordPolicyConfig {
    return this.engine.getConfig();
  }

  updateConfig(partial: Partial<PasswordPolicyConfig>): void {
    this.engine.updateConfig(partial);
    this.logger.log('Password policy config updated');
  }

  validate(password: string): {
    valid: boolean;
    errors: string[];
    strength: { score: number; label: string; feedback: string[] };
  } {
    return this.engine.validate(password);
  }

  async checkHistory(userId: string, password: string): Promise<boolean> {
    const hash = this.engine.hashPassword(password);
    const maxHistory = await this.getPasswordHistoryCount();

    const recentPasswords = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: maxHistory,
      select: { passwordHash: true },
    });

    const isReused = recentPasswords.some((p) => p.passwordHash === hash);
    return !isReused;
  }

  async addToHistory(userId: string, password: string): Promise<void> {
    const hash = this.engine.hashPassword(password);

    // Store the hashed password in the PasswordHistory table
    await this.prisma.passwordHistory.create({
      data: { userId, passwordHash: hash },
    });

    // Clean up old entries beyond the retention count
    const maxHistory = await this.getPasswordHistoryCount();
    const totalCount = await this.prisma.passwordHistory.count({ where: { userId } });

    if (totalCount > maxHistory) {
      const excess = totalCount - maxHistory;
      const oldest = await this.prisma.passwordHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: excess,
        select: { id: true },
      });

      await this.prisma.passwordHistory.deleteMany({
        where: { id: { in: oldest.map((o) => o.id) } },
      });
    }

    this.logger.debug(`Password history updated for user ${userId}`);
  }

  async isPasswordExpired(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { updatedAt: true },
    });
    // Use updatedAt as a proxy for password changed at
    return this.engine.isPasswordExpired(user?.updatedAt ?? null);
  }

  async validateAndEnforce(userId: string, password: string): Promise<void> {
    const validation = this.validate(password);
    if (!validation.valid) {
      throw new BadRequestException(`Password validation failed: ${validation.errors.join('; ')}`);
    }

    const historyOk = await this.checkHistory(userId, password);
    if (!historyOk) {
      throw new BadRequestException(
        'Password has been used recently. Choose a different password.',
      );
    }
  }

  /**
   * Retrieve the configured password history retention count from the settings table.
   * Falls back to the engine's default (5) if no setting is found.
   */
  private async getPasswordHistoryCount(): Promise<number> {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { group_key: { group: 'security', key: 'password_history_count' } },
      });
      if (setting?.value !== undefined && setting?.value !== null) {
        const value = setting.value as number;
        return value > 0 ? value : 5;
      }
    } catch {
      // If settings table is not accessible, fall back to engine config
    }
    return this.engine.getConfig().historyCount;
  }
}
