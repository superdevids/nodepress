import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAtAGlance() {
    const [posts, pages, comments, users, media, published, drafts] = await Promise.all([
      this.prisma.contentEntry.count({ where: { contentType: { name: 'post' } } }),
      this.prisma.contentEntry.count({ where: { contentType: { name: 'page' } } }),
      this.prisma.comment.count(),
      this.prisma.user.count(),
      this.prisma.media.count(),
      this.prisma.contentEntry.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.contentEntry.count({ where: { status: 'DRAFT' } }),
    ]);

    return { posts, pages, comments, users, media, published, drafts };
  }

  async getRecentActivity(limit = 10) {
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, email: true } } },
    });

    return logs.map((log) => ({
      id: log.id,
      actor: { id: log.actor.id, name: log.actor.name, email: log.actor.email },
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      createdAt: log.createdAt,
    }));
  }

  async getQuickDraftStats() {
    const draftsByAuthor = await this.prisma.contentEntry.groupBy({
      by: ['authorId'],
      where: { status: 'DRAFT' },
      _count: true,
    });

    return {
      totalDrafts: draftsByAuthor.reduce((sum, d) => sum + d._count, 0),
      authorsWithDrafts: draftsByAuthor.length,
    };
  }

  async getNodePressNews() {
    return [
      {
        id: '1',
        title: 'NodePress 2.0 Release Notes',
        excerpt: 'Major performance improvements and new WordPress-compatible APIs.',
        date: new Date().toISOString(),
        category: 'Release',
      },
      {
        id: '2',
        title: 'Security Best Practices',
        excerpt: 'Learn how to secure your NodePress installation with our latest security guide.',
        date: new Date().toISOString(),
        category: 'Security',
      },
      {
        id: '3',
        title: 'Plugin Development Workshop',
        excerpt: 'Join our upcoming workshop on building powerful plugins for NodePress.',
        date: new Date().toISOString(),
        category: 'Events',
      },
    ];
  }

  async getSiteHealth() {
    const totalEntries = await this.prisma.contentEntry.count();
    const mediaWithoutAlt = await this.prisma.media.count({ where: { altText: null } });
    const trashedEntries = await this.prisma.contentEntry.count({ where: { status: 'TRASHED' } });
    const pendingComments = await this.prisma.comment.count({ where: { status: 'PENDING' } });

    const checks = [
      {
        name: 'Database Connection',
        status: (await this.testDbConnection()) ? 'good' : ('critical' as const),
        detail: 'Prisma connection verified',
      },
      {
        name: 'Content Integrity',
        status: totalEntries > 0 ? ('good' as const) : ('warning' as const),
        detail: `${totalEntries} total content entries`,
      },
      {
        name: 'Media Alt Text',
        status: mediaWithoutAlt === 0 ? ('good' as const) : ('warning' as const),
        detail: `${mediaWithoutAlt} media items missing alt text`,
      },
      {
        name: 'Trash Management',
        status: trashedEntries < 100 ? ('good' as const) : ('warning' as const),
        detail: `${trashedEntries} items in trash`,
      },
      {
        name: 'Comment Moderation',
        status: pendingComments < 50 ? ('good' as const) : ('warning' as const),
        detail: `${pendingComments} pending comments`,
      },
    ];

    return { checks, lastUpdated: new Date().toISOString() };
  }

  private async testDbConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
