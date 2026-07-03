import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PingbackService {
  constructor(private prisma: PrismaService) {}

  async handlePingback(sourceUrl: string, targetUrl: string, entryId: string): Promise<void> {
    await this.prisma.comment.create({
      data: {
        entryId,
        authorName: 'Pingback',
        authorEmail: '',
        content: `Pingback from: ${sourceUrl}`,
        status: 'PENDING',
        commentType: 'pingback',
      },
    });
  }

  async handleTrackback(sourceUrl: string, title: string, excerpt: string, entryId: string): Promise<void> {
    await this.prisma.comment.create({
      data: {
        entryId,
        authorName: 'Trackback',
        authorEmail: '',
        content: `Trackback from: ${sourceUrl}\n\nTitle: ${title}\n\n${excerpt}`,
        status: 'PENDING',
        commentType: 'trackback',
      },
    });
  }
}
