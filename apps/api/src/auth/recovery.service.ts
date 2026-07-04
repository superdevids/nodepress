import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { RecoveryMode } from '@nodepressjs/core';

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);
  private readonly recoveryMode = new RecoveryMode();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  isInRecovery(): boolean {
    return this.recoveryMode.isActive();
  }

  recordPluginError(slug: string, error: Error): boolean {
    return this.recoveryMode.recordPluginError(slug, error);
  }

  async generateToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const result = this.recoveryMode.generateRecoveryToken(userId);
    await this.prisma.recoveryToken.create({
      data: {
        userId,
        token: result.token,
        expiresAt: result.expiresAt,
      },
    });
    return result;
  }

  async loginWithToken(
    token: string,
  ): Promise<{ accessToken: string; user: { id: string; role: string } }> {
    const stored = await this.prisma.recoveryToken.findUnique({
      where: { token },
    });

    if (!stored) {
      throw new BadRequestException('Invalid recovery token');
    }
    if (new Date() > stored.expiresAt) {
      await this.prisma.recoveryToken.delete({ where: { id: stored.id } });
      throw new BadRequestException('Recovery token has expired');
    }
    if (stored.usedAt) {
      throw new BadRequestException('Recovery token has already been used');
    }

    await this.prisma.recoveryToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });

    this.recoveryMode.activate();
    this.logger.log(`Recovery mode activated by user ${stored.userId}`);

    // SECURITY NOTE (Gap A-011): Only grant SUPER_ADMIN if the original user had admin-level role,
    // otherwise use the original user's role to prevent privilege escalation.
    const effectiveRole =
      user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
        ? 'SUPER_ADMIN'
        : (user?.role ?? 'SUBSCRIBER');

    const payload = {
      sub: stored.userId,
      email: user?.email || 'recovery@nodepress.local',
      role: effectiveRole,
      permissions: effectiveRole === 'SUPER_ADMIN' ? ['*'] : [],
    };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: { id: stored.userId, role: effectiveRole } };
  }

  deactivate(): void {
    this.recoveryMode.deactivate();
    this.recoveryMode.clearPluginErrors();
    this.logger.log('Recovery mode deactivated');
  }

  getDeactivatedPlugins(): string[] {
    return this.recoveryMode.getDeactivatedPlugins();
  }
}
