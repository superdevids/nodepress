import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface AuditEntry {
  id: string;
  actorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface SecurityAuditFilter {
  action?: string;
  actorId?: string;
  targetType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actorId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        before: (params.before ?? {}) as any,
        after: (params.after ?? {}) as any,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    this.logger.debug(`Audit: ${params.action} by ${params.actorId}`);
  }

  async logLogin(params: {
    userId: string;
    email: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    failReason?: string;
  }): Promise<void> {
    await this.log({
      actorId: params.userId,
      action: params.success ? 'login.success' : 'login.failed',
      targetType: 'auth',
      targetId: params.userId,
      after: { email: params.email, failReason: params.failReason },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async logPermissionChange(params: {
    actorId: string;
    targetUserId: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      actorId: params.actorId,
      action: 'permission.changed',
      targetType: 'user',
      targetId: params.targetUserId,
      before: params.before,
      after: params.after,
      ipAddress: params.ipAddress,
    });
  }

  async logPluginAction(params: {
    actorId: string;
    pluginSlug: string;
    action: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      actorId: params.actorId,
      action: `plugin.${params.action}`,
      targetType: 'plugin',
      targetId: params.pluginSlug,
      ipAddress: params.ipAddress,
    });
  }

  async logUserAction(params: {
    actorId: string;
    action: string;
    targetUserId: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      actorId: params.actorId,
      action: `user.${params.action}`,
      targetType: 'user',
      targetId: params.targetUserId,
      ipAddress: params.ipAddress,
    });
  }

  async logSettingChange(params: {
    actorId: string;
    group: string;
    key: string;
    before: unknown;
    after: unknown;
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      actorId: params.actorId,
      action: 'setting.changed',
      targetType: `setting:${params.group}`,
      targetId: params.key,
      before: { value: params.before } as Record<string, unknown>,
      after: { value: params.after } as Record<string, unknown>,
      ipAddress: params.ipAddress,
    });
  }

  async query(filter: SecurityAuditFilter): Promise<{ items: AuditEntry[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (filter.action) {
      where.action = { contains: filter.action };
    }
    if (filter.actorId) {
      where.actorId = filter.actorId;
    }
    if (filter.targetType) {
      where.targetType = filter.targetType;
    }
    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) (where.createdAt as Record<string, unknown>).gte = filter.dateFrom;
      if (filter.dateTo) (where.createdAt as Record<string, unknown>).lte = filter.dateTo;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.offset || 0,
        take: filter.limit || 50,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        actorId: e.actorId,
        action: e.action,
        targetType: e.targetType ?? undefined,
        targetId: e.targetId ?? undefined,
        before: (e.before ?? undefined) as Record<string, unknown> | undefined,
        after: (e.after ?? undefined) as Record<string, unknown> | undefined,
        ipAddress: e.ipAddress ?? undefined,
        userAgent: e.userAgent ?? undefined,
        createdAt: e.createdAt,
      })),
      total,
    };
  }
}
