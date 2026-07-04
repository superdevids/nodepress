import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PasswordResetEngine } from '@nodepressjs/core';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { MailService } from '../mail/mail.service';
import { RateLimitDetailService } from '../common/rate-limit-detail.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly engine = new PasswordResetEngine();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly rateLimiter: RateLimitDetailService,
  ) {}

  async requestReset(email: string): Promise<{ message: string }> {
    // Rate limit: max 3 requests per email per hour (no-enumeration safe — check BEFORE user lookup)
    const rateLimitResult = await this.rateLimiter.check(email, 'password-reset');
    if (!rateLimitResult.allowed) {
      // Return generic message even when rate-limited to prevent user enumeration
      this.logger.warn(`Password reset rate-limited for email: ${email}`);
      throw new HttpException(
        { message: 'If that email is registered, a reset link has been sent.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Always return the same message regardless of whether the email exists
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

    // Build the reset URL pointing to the admin frontend
    const adminUrl =
      process.env.ADMIN_URL ||
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:3000';
    const resetUrl = `${adminUrl.replace(/\/+$/, '')}/admin/login/reset-password?token=${token}`;
    const userName = user.displayName || user.name || user.email.split('@')[0];

    this.logger.log(`Password reset requested for user ${user.id}: ${resetUrl}`);

    // Send the password reset email (non-blocking — failures are logged, not thrown)
    this.mailService
      .sendPasswordResetEmail(user.email, resetUrl, userName)
      .catch((err) => this.logger.warn('Failed to send password reset email', err));

    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<{ success: boolean }> {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

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

    // Invalidate all sessions for this user
    await this.prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Mark the token as used
    await this.prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    this.logger.log(`Password reset completed for user ${stored.userId}`);
    return { success: true };
  }

  async verifyToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const hashedToken = this.engine.hashToken(token);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!stored) {
      return { valid: false };
    }

    if (this.engine.isTokenExpired(stored.expiresAt)) {
      // Clean up expired tokens silently
      await this.prisma.passwordResetToken.delete({ where: { id: stored.id } }).catch(() => {});
      return { valid: false };
    }

    if (this.engine.isTokenUsed(stored.usedAt)) {
      return { valid: false };
    }

    return { valid: true, email: stored.user.email };
  }
}
