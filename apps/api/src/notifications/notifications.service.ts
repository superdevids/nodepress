import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface NotificationResult {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  icon: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface PaginatedNotifications {
  items: NotificationResult[];
  total: number;
  unread: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string, limit = 20, offset = 0): Promise<PaginatedNotifications> {
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      items: items.map((n: NotificationResult) => this.toResult(n)),
      total,
      unread: items.filter((n: NotificationResult) => !n.readAt).length,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message?: string;
    link?: string;
    icon?: string;
  }): Promise<NotificationResult> {
    const notification = await this.prisma.notification.create({ data });
    this.logger.log(`Notification created: ${notification.id} for user ${data.userId}`);
    return this.toResult(notification);
  }

  async createForUsers(
    userIds: string[],
    data: {
      type: string;
      title: string;
      message?: string;
      link?: string;
      icon?: string;
    },
  ) {
    if (userIds.length === 0) return { count: 0 };

    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({ ...data, userId })),
    });
    this.logger.log(`Notifications created for ${userIds.length} users`);
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toResult(n: any): NotificationResult {
    return {
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      icon: n.icon,
      readAt: n.readAt,
      createdAt: n.createdAt,
    };
  }
}
