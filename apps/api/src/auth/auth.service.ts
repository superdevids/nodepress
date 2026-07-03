import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApplicationPasswordsService } from './application-passwords.service';
import { SessionService } from './session.service';
import { PasswordPolicyService } from './password-policy.service';
import { TwoFactorService } from './two-factor.service';
import { SecurityAuditService } from '../common/security-audit.service';
import { PrismaService } from '../common/prisma.service';
import {
  JWT_ACCESS_TOKEN_EXPIRES_IN,
  JWT_REFRESH_TOKEN_EXPIRES_IN,
  JWT_ISSUER,
} from '../common/constants';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly appPasswordsService: ApplicationPasswordsService,
    private readonly sessionService: SessionService,
    private readonly passwordPolicyService: PasswordPolicyService,
    private readonly twoFactorService: TwoFactorService,
    private readonly auditService: SecurityAuditService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<Record<string, unknown> | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (valid) return this.sanitizeUser(user);

    const appPasswordValid = await this.appPasswordsService.verify(user.id, password);
    if (appPasswordValid) return this.sanitizeUser(user);

    return null;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    await this.passwordPolicyService.validateAndEnforce('new', dto.password);

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();

    const user = await this.prisma.user.create({
      data: {
        id,
        email: dto.email,
        passwordHash,
        name: `${dto.firstName} ${dto.lastName ?? ''}`.trim(),
        displayName: dto.username ?? dto.email.split('@')[0],
        role: 'SUBSCRIBER',
        capabilities: ['read'],
        forcePasswordChange: false,
        userRegistered: now,
      },
    });

    await this.passwordPolicyService.addToHistory(id, dto.password);
    this.logger.log(`User registered: ${dto.email}`);

    return this.sanitizeUser(user);
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    requires2fa: boolean;
  }> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      await this.auditService.logLogin({
        userId: 'unknown',
        email: dto.email,
        success: false,
        ipAddress,
        userAgent,
        failReason: 'Invalid credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const twoFactorEnabled = await this.twoFactorService.isEnabled(user.id);

    if (dto.twoFactorCode) {
      const twoFactorValid = await this.twoFactorService.verifyToken(user.id, dto.twoFactorCode);
      if (!twoFactorValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    } else if (twoFactorEnabled) {
      return {
        accessToken: '',
        refreshToken: '',
        sessionId: '',
        requires2fa: true,
      };
    }

    await this.auditService.logLogin({
      userId: user.id,
      email: dto.email,
      success: true,
      ipAddress,
      userAgent,
    });

    const result = await this.generateTokenPair(user, {
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      rememberMe: dto.rememberMe ?? false,
    });

    return { ...result, requires2fa: false };
  }

  async refresh(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }> {
    const session = await this.sessionService.findByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newRefreshToken = uuidv4();
    await this.sessionService.rotateRefreshToken(refreshToken, newRefreshToken);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      permissions: user.capabilities?.length ? user.capabilities : ['read'],
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN,
      issuer: JWT_ISSUER,
    });

    return { accessToken, refreshToken: newRefreshToken, sessionId: session.id };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      ...this.sanitizeUser(user),
      forcePasswordChange: user.forcePasswordChange ?? false,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.passwordPolicyService.validateAndEnforce(userId, newPassword);

    const newHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, forcePasswordChange: false },
    });

    await this.passwordPolicyService.addToHistory(userId, newPassword);
    this.logger.log(`Password changed for user ${userId}`);

    return { success: true };
  }

  async adminForcePasswordChange(userId: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    await this.prisma.user.update({
      where: { id: userId },
      data: { forcePasswordChange: true },
    });
    this.logger.log(`Password change forced for user ${userId}`);
    return { success: true };
  }

  private async generateTokenPair(
    user: Record<string, unknown>,
    sessionInfo?: { ipAddress: string; userAgent: string; rememberMe: boolean },
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role?.toLowerCase() ?? 'subscriber',
      permissions: user.permissions?.length ? user.permissions : ['read'],
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: JWT_ACCESS_TOKEN_EXPIRES_IN,
      issuer: JWT_ISSUER,
    });

    const refreshToken = uuidv4();

    if (sessionInfo) {
      const session = await this.sessionService.create({
        userId: user.id,
        refreshToken,
        ipAddress: sessionInfo.ipAddress,
        userAgent: sessionInfo.userAgent,
        rememberMe: sessionInfo.rememberMe,
      });

      return {
        accessToken,
        refreshToken,
        sessionId: session.id,
      };
    }

    return { accessToken, refreshToken, sessionId: '' };
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
