import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApplicationPasswordsEngine } from '@nodepressjs/core';
import { PrismaService } from '../common/prisma.service';

export interface AppPasswordEntry {
  id: string;
  name: string;
  lastUsedAt: Date | null;
  revoked: boolean;
  createdAt: Date;
}

export interface AppPasswordCreateResult {
  id: string;
  name: string;
  password: string;
}

@Injectable()
export class ApplicationPasswordsService {
  private readonly logger = new Logger(ApplicationPasswordsService.name);
  private readonly engine = new ApplicationPasswordsEngine();

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, name: string): Promise<AppPasswordCreateResult> {
    const plain = this.engine.generatePassword(24);
    const hashedPassword = await this.engine.hashPassword(plain);

    const entry = await this.prisma.applicationPassword.create({
      data: {
        userId,
        name,
        hashedPassword,
      },
    });

    this.logger.log(`Application password "${name}" created for user ${userId}`);
    return { id: entry.id, name, password: plain };
  }

  async list(userId: string): Promise<AppPasswordEntry[]> {
    const entries = await this.prisma.applicationPassword.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((e) => ({
      id: e.id,
      name: e.name,
      lastUsedAt: e.lastUsedAt,
      revoked: e.revokedAt !== null,
      createdAt: e.createdAt,
    }));
  }

  async revoke(userId: string, passwordId: string): Promise<void> {
    const entry = await this.prisma.applicationPassword.findFirst({
      where: { id: passwordId, userId },
    });
    if (!entry) {
      throw new NotFoundException('Application password not found');
    }

    await this.prisma.applicationPassword.update({
      where: { id: passwordId },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Application password ${passwordId} revoked for user ${userId}`);
  }

  async verify(userId: string, candidate: string): Promise<boolean> {
    const entries = await this.prisma.applicationPassword.findMany({
      where: { userId, revokedAt: null },
    });

    if (entries.length === 0) return false;

    const formatted = this.engine.formatPassword(candidate);

    for (const entry of entries) {
      const matched = await this.engine.verifyPassword(formatted, entry.hashedPassword);
      if (matched) {
        await this.prisma.applicationPassword.update({
          where: { id: entry.id },
          data: { lastUsedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }
}
