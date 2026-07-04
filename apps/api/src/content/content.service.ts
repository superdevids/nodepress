import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';

export interface ContentEntry {
  id: string;
  type: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'publish' | 'pending' | 'private';
  featured: boolean;
  tags: string[];
  parentId: string | null;
  authorId: string;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(type: string, dto: CreateContentDto, authorId: string): Promise<ContentEntry> {
    const contentType = await this.prisma.contentType.findFirst({
      where: { name: type },
    });
    if (!contentType) {
      throw new BadRequestException(`Content type "${type}" not found`);
    }

    const slug = dto.slug ?? this.slugify(dto.title);
    const now = new Date();
    const status = this.parseStatus(dto.status ?? 'draft');

    const entry = await this.prisma.contentEntry.create({
      data: {
        contentTypeId: contentType.id,
        slug,
        status,
        data: {
          title: dto.title,
          content: dto.content,
          tags: dto.tags ?? [],
          parentId: dto.parentId ?? null,
          featured: dto.featured ?? false,
          viewCount: 0,
        },
        excerpt: dto.excerpt ?? dto.content.substring(0, 240),
        authorId,
        publishedAt: dto.status === 'publish' ? now : null,
      },
      include: { contentType: true },
    });

    this.logger.log(`Content ${type} created: ${entry.id}`);
    return this.toContentEntry(entry);
  }

  async findByType(
    type: string,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: ContentEntry[]; total: number; page: number; limit: number }> {
    const contentType = await this.prisma.contentType.findFirst({
      where: { name: type },
    });

    if (!contentType) {
      return { items: [], total: 0, page, limit };
    }

    const where: Record<string, unknown> = { contentTypeId: contentType.id };
    if (status) {
      where.status = this.parseStatus(status);
    }

    const [entries, total] = await Promise.all([
      this.prisma.contentEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { contentType: true },
      }),
      this.prisma.contentEntry.count({ where }),
    ]);

    return {
      items: entries.map((e) => this.toContentEntry(e)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<ContentEntry> {
    const entry = await this.prisma.contentEntry.findUnique({
      where: { id },
      include: { contentType: true },
    });
    if (!entry) throw new NotFoundException(`Content ${id} not found`);
    return this.toContentEntry(entry);
  }

  async update(id: string, dto: UpdateContentDto): Promise<ContentEntry> {
    const entry = await this.prisma.contentEntry.findUnique({
      where: { id },
      include: { contentType: true },
    });
    if (!entry) throw new NotFoundException(`Content ${id} not found`);

    const data = entry.data as Record<string, unknown>;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.featured !== undefined) data.featured = dto.featured;

    const updateData: Record<string, unknown> = {
      data: data as any,
      updatedAt: new Date(),
    };

    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.excerpt !== undefined) updateData.excerpt = dto.excerpt;
    if (dto.status !== undefined) {
      updateData.status = this.parseStatus(dto.status);
      if (dto.status === 'publish' && !entry.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updated = await this.prisma.contentEntry.update({
      where: { id },
      data: updateData,
      include: { contentType: true },
    });

    return this.toContentEntry(updated);
  }

  async delete(id: string): Promise<void> {
    const entry = await this.prisma.contentEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Content ${id} not found`);
    await this.prisma.contentEntry.delete({ where: { id } });
    this.logger.log(`Content deleted: ${id}`);
  }

  async recordView(id: string): Promise<void> {
    const entry = await this.prisma.contentEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Content ${id} not found`);

    const data = entry.data as Record<string, unknown>;
    const viewCount = ((data.viewCount as number) ?? 0) + 1;
    data.viewCount = viewCount;

    await this.prisma.contentEntry.update({
      where: { id },
      data: { data: data as any },
    });
  }

  private toContentEntry(entry: {
    id: string;
    contentType: { name: string };
    slug: string;
    status: string;
    data: unknown;
    excerpt: string | null;
    authorId: string;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ContentEntry {
    const data = entry.data as Record<string, unknown>;
    return {
      id: entry.id,
      type: entry.contentType.name,
      title: (data.title as string) ?? '',
      slug: entry.slug,
      content: (data.content as string) ?? '',
      excerpt: entry.excerpt ?? '',
      status: this.toStatusString(entry.status),
      featured: (data.featured as boolean) ?? false,
      tags: (data.tags as string[]) ?? [],
      parentId: (data.parentId as string) ?? null,
      authorId: entry.authorId,
      viewCount: (data.viewCount as number) ?? 0,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      publishedAt: entry.publishedAt,
    };
  }

  private parseStatus(s: string): string {
    const map: Record<string, string> = {
      draft: 'DRAFT',
      publish: 'PUBLISHED',
      pending: 'PENDING_REVIEW',
      private: 'PRIVATE',
    };
    return map[s.toLowerCase()] ?? 'DRAFT';
  }

  private toStatusString(s: string): 'draft' | 'publish' | 'pending' | 'private' {
    const map: Record<string, 'draft' | 'publish' | 'pending' | 'private'> = {
      DRAFT: 'draft',
      PUBLISHED: 'publish',
      PENDING_REVIEW: 'pending',
      PRIVATE: 'private',
      SCHEDULED: 'draft',
      TRASHED: 'draft',
    };
    return map[s] ?? 'draft';
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 255);
  }
}
