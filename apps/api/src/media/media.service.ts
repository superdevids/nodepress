import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export interface MediaEntry {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  caption: string;
  url: string;
  thumbnailUrl: string | null;
  uploadedBy: string;
  createdAt: Date;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20): Promise<{ items: MediaEntry[]; total: number; page: number; limit: number }> {
    const [entries, total] = await Promise.all([
      this.prisma.media.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.media.count(),
    ]);

    return {
      items: entries.map((e) => this.toEntry(e)),
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<MediaEntry> {
    const entry = await this.prisma.media.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Media ${id} not found`);
    return this.toEntry(entry);
  }

  async create(
    metadata: Omit<MediaEntry, 'id' | 'createdAt'>,
  ): Promise<MediaEntry> {
    const entry = await this.prisma.media.create({
      data: {
        url: metadata.url,
        mimeType: metadata.mimeType,
        altText: metadata.alt,
        caption: metadata.caption,
        title: metadata.originalName,
        width: metadata.width,
        height: metadata.height,
        fileSize: metadata.size,
        uploadedBy: metadata.uploadedBy,
      },
    });

    this.logger.log(`Media uploaded: ${entry.id}`);
    return this.toEntry(entry);
  }

  async delete(id: string): Promise<void> {
    const entry = await this.prisma.media.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException(`Media ${id} not found`);
    await this.prisma.media.delete({ where: { id } });
    this.logger.log(`Media deleted: ${id}`);
  }

  private toEntry(m: {
    id: string; url: string; mimeType: string; altText: string | null;
    caption: string | null; title: string | null; width: number | null;
    height: number | null; fileSize: number | null; uploadedBy: string;
    createdAt: Date;
  }): MediaEntry {
    return {
      id: m.id,
      filename: m.title ?? m.url.split('/').pop() ?? 'unknown',
      originalName: m.title ?? 'unknown',
      mimeType: m.mimeType,
      size: m.fileSize ?? 0,
      width: m.width,
      height: m.height,
      alt: m.altText ?? '',
      caption: m.caption ?? '',
      url: m.url,
      thumbnailUrl: null,
      uploadedBy: m.uploadedBy,
      createdAt: m.createdAt,
    };
  }
}
