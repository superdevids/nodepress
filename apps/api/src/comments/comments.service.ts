import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface Comment {
  id: string;
  contentId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: 'approved' | 'pending' | 'spam' | 'trash';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByContentId(
    contentId: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: Comment[]; total: number; page: number; limit: number }> {
    const where: Record<string, unknown> = { entryId: contentId };
    if (status) {
      where.status = this.parseStatus(status);
    }

    const [entries, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      items: entries.map((c) => this.toComment(c)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    return this.toComment(comment);
  }

  async create(data: {
    contentId: string;
    parentId?: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    content: string;
  }): Promise<Comment> {
    const comment = await this.prisma.comment.create({
      data: {
        entryId: data.contentId,
        parentId: data.parentId ?? null,
        userId: data.authorId,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        content: data.content,
        status: 'PENDING',
      },
    });

    this.logger.log(`Comment created: ${comment.id}`);
    return this.toComment(comment);
  }

  async updateStatus(id: string, status: Comment['status']): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { status: this.parseStatus(status) as any },
    });

    return this.toComment(updated);
  }

  async delete(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException(`Comment ${id} not found`);
    await this.prisma.comment.delete({ where: { id } });
  }

  private toComment(c: {
    id: string; entryId: string; parentId: string | null;
    userId: string | null; authorName: string; authorEmail: string;
    content: string; status: string; createdAt: Date; updatedAt: Date;
  }): Comment {
    return {
      id: c.id,
      contentId: c.entryId,
      parentId: c.parentId,
      authorId: c.userId ?? '',
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      content: c.content,
      status: this.toCommentStatus(c.status),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private parseStatus(s: string): string {
    const map: Record<string, string> = {
      approved: 'APPROVED', pending: 'PENDING', spam: 'SPAM', trash: 'TRASHED',
    };
    return map[s.toLowerCase()] ?? 'PENDING';
  }

  private toCommentStatus(s: string): 'approved' | 'pending' | 'spam' | 'trash' {
    const map: Record<string, 'approved' | 'pending' | 'spam' | 'trash'> = {
      APPROVED: 'approved', PENDING: 'pending', SPAM: 'spam', TRASHED: 'trash',
    };
    return map[s] ?? 'pending';
  }
}
