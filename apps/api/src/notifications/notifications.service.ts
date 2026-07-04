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
  data: NotificationResult[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    unread: number;
  };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find notifications for a user with pagination.
   * Returns data + meta in a standardized pagination format.
   */
  async findByUser(userId: string, page = 1, perPage = 20): Promise<PaginatedNotifications> {
    const skip = (page - 1) * perPage;

    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: perPage,
        skip,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    return {
      data: items.map((n) => this.toResult(n)),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage) || 1,
        unread,
      },
    };
  }

  /**
   * Get the total count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  /**
   * Mark a single notification as read. Scoped to userId for security.
   */
  async markAsRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      this.logger.warn(`Notification ${id} not found for user ${userId}`);
    }

    return result;
  }

  /**
   * Mark all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user ${userId}`);
    return result;
  }

  /**
   * Create a single notification.
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message?: string;
    link?: string;
    icon?: string;
  }): Promise<NotificationResult> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message ?? null,
        link: data.link ?? null,
        icon: data.icon ?? null,
      },
    });
    this.logger.log(`Notification created: ${notification.id} for user ${data.userId}`);
    return this.toResult(notification);
  }

  /**
   * Create the same notification for multiple users at once.
   */
  async createForUsers(
    userIds: string[],
    data: {
      type: string;
      title: string;
      message?: string;
      link?: string;
      icon?: string;
    },
  ): Promise<{ count: number }> {
    if (userIds.length === 0) return { count: 0 };

    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: data.type,
        title: data.title,
        message: data.message ?? null,
        link: data.link ?? null,
        icon: data.icon ?? null,
      })),
    });

    this.logger.log(`Notifications created for ${userIds.length} users (type: ${data.type})`);
    return { count: result.count };
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
