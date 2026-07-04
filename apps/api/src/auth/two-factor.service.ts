import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TwoFactorEngine } from '@nodepressjs/core';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly engine = new TwoFactorEngine();

  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string): Promise<{
    secret: string;
    otpauthUrl: string;
    backupCodes: string[];
  }> {
    const { secret, otpauthUrl } = this.engine.generateSecret();
    const { codes, hashedCodes } = this.engine.generateBackupCodes();

    await this.prisma.twoFactorSecret.upsert({
      where: { userId },
      create: { userId, secret, verified: false, backupCodes: hashedCodes },
      update: { secret, verified: false, backupCodes: hashedCodes },
    });

    this.logger.log(`2FA secret generated for user ${userId}`);
    return { secret, otpauthUrl, backupCodes: codes };
  }

  async verify(userId: string, token: string): Promise<{ verified: boolean }> {
    const store = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!store) {
      throw new BadRequestException('2FA not set up. Generate a secret first.');
    }

    const valid = this.engine.verifyToken(store.secret, token);
    if (!valid) {
      throw new BadRequestException('Invalid 2FA token');
    }

    await this.prisma.twoFactorSecret.update({
      where: { userId },
      data: { verified: true },
    });

    this.logger.log(`2FA verified for user ${userId}`);
    return { verified: true };
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const store = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!store || !store.verified) return false;

    if (this.engine.verifyToken(store.secret, token)) {
      return true;
    }

    const codes = store.backupCodes as string[];
    const { valid, index } = this.engine.verifyBackupCode(token, codes);
    if (valid) {
      codes.splice(index, 1);
      await this.prisma.twoFactorSecret.update({
        where: { userId },
        data: { backupCodes: codes },
      });
      return true;
    }

    return false;
  }

  async isEnabled(userId: string): Promise<boolean> {
    const store = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    return store?.verified ?? false;
  }

  async disable(userId: string): Promise<void> {
    await this.prisma.twoFactorSecret
      .delete({ where: { userId } })
      .catch((err: Error) => this.logger.warn('Failed to disable 2FA', err.message));
    this.logger.log(`2FA disabled for user ${userId}`);
  }

  async getBackupCodes(userId: string): Promise<string[]> {
    const store = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!store) return [];
    return store.backupCodes as string[];
  }

  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const store = await this.prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!store) throw new BadRequestException('2FA not set up');

    const { codes, hashedCodes } = this.engine.generateBackupCodes();
    await this.prisma.twoFactorSecret.update({
      where: { userId },
      data: { backupCodes: hashedCodes },
    });

    return codes;
  }
}
