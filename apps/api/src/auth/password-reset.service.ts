import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PasswordResetEngine } from '@nodepressjs/core';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly engine = new PasswordResetEngine();

  constructor(private readonly prisma: PrismaService) {}

  async requestReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    const { token, hashedToken, expiresAt } = this.engine.generateToken();

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    const resetUrl = this.engine.generateResetUrl(token);
    this.logger.log(`Password reset requested for user ${user.id}: ${resetUrl}`);

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const hashedToken = this.engine.hashToken(token);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
    });

    if (!stored) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (this.engine.isTokenExpired(stored.expiresAt)) {
      await this.prisma.passwordResetToken.delete({ where: { id: stored.id } });
      throw new BadRequestException('Reset token has expired');
    }

    if (this.engine.isTokenUsed(stored.usedAt)) {
      throw new BadRequestException('Reset token has already been used');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`Password reset completed for user ${stored.userId}`);
    return { success: true };
  }
}
