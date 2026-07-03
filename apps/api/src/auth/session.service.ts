import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../common/prisma.service';

export interface SessionEntry {
  id: string;
  userId: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  isRememberMe: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(params: {
    userId: string;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
    rememberMe: boolean;
  }): Promise<SessionEntry> {
    const id = randomUUID();
    const expiresIn = params.rememberMe
      ? 14 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const session = await this.prisma.session.create({
      data: {
        id,
        userId: params.userId,
        payload: {
          refreshToken: params.refreshToken,
          isRememberMe: params.rememberMe,
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        } as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        expiresAt: new Date(Date.now() + expiresIn),
      },
    });

    this.logger.log(`Session created for user ${params.userId}`);
    return this.toEntry(session);
  }

  async findByRefreshToken(refreshToken: string): Promise<SessionEntry | null> {
    const sessions = await this.prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    for (const session of sessions) {
      const payload = session.payload as Record<string, unknown>;
      if (payload?.refreshToken === refreshToken) {
        return this.toEntry(session);
      }
    }
    return null;
  }

  async rotateRefreshToken(oldToken: string, newToken: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    for (const session of sessions) {
      const payload = session.payload as Record<string, unknown>;
      if (payload?.refreshToken === oldToken) {
        payload.refreshToken = newToken;
        payload.lastUsedAt = new Date().toISOString();
        await this.prisma.session.update({
          where: { id: session.id },
          data: { payload: payload as any },
        });
        return;
      }
    }
  }

  async listForUser(userId: string): Promise<Omit<SessionEntry, 'refreshToken'>[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    });

    return sessions.map((session) => {
      const entry = this.toEntry(session);
      const { refreshToken: _, ...rest } = entry;
      return rest;
    });
  }

  async revoke(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.session.delete({ where: { id: sessionId } });
    this.logger.log(`Session ${sessionId} revoked for user ${userId}`);
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    const where: Record<string, unknown> = { userId };
    if (exceptSessionId) {
      await this.prisma.session.deleteMany({
        where: { userId, id: { not: exceptSessionId } },
      });
    } else {
      await this.prisma.session.deleteMany({ where: { userId } });
    }
    this.logger.log(`All sessions revoked for user ${userId}`);
  }

  async cleanupExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private toEntry(session: {
    id: string; userId: string; payload: unknown;
    ipAddress: string | null; userAgent: string | null; expiresAt: Date;
  }): SessionEntry {
    const payload = session.payload as Record<string, unknown>;
    return {
      id: session.id,
      userId: session.userId,
      refreshToken: (payload?.refreshToken as string) ?? '',
      ipAddress: session.ipAddress ?? '',
      userAgent: session.userAgent ?? '',
      isRememberMe: (payload?.isRememberMe as boolean) ?? false,
      createdAt: new Date((payload?.createdAt as string) ?? session.id),
      lastUsedAt: new Date((payload?.lastUsedAt as string) ?? session.id),
      expiresAt: session.expiresAt,
    };
  }
}
