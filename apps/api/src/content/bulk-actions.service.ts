import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { BulkActionDto } from './dto/bulk-action.dto';

@Injectable()
export class BulkActionsService {
  private readonly logger = new Logger(BulkActionsService.name);

  constructor(private prisma: PrismaService) {}

  async execute(dto: BulkActionDto) {
    const { action, ids } = dto;
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const id of ids) {
      try {
        switch (action) {
          case 'publish':
            await this.prisma.contentEntry.update({
              where: { id },
              data: { status: 'PUBLISHED', publishedAt: new Date() },
            });
            break;
          case 'unpublish':
            await this.prisma.contentEntry.update({
              where: { id },
              data: { status: 'DRAFT', publishedAt: null },
            });
            break;
          case 'draft':
            await this.prisma.contentEntry.update({
              where: { id },
              data: { status: 'DRAFT' },
            });
            break;
          case 'trash':
            await this.prisma.contentEntry.update({
              where: { id },
              data: { status: 'TRASHED' },
            });
            break;
          case 'restore':
            await this.prisma.contentEntry.update({
              where: { id },
              data: { status: 'DRAFT' },
            });
            break;
          case 'delete':
            await this.prisma.contentEntry.delete({ where: { id } });
            break;
        }
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Entry ${id}: ${error.message}`);
      }
    }

    if (results.failed > 0) {
      this.logger.warn(
        `Bulk ${action}: ${results.success} OK, ${results.failed} failed — ${results.errors.join('; ')}`,
      );
    } else {
      this.logger.log(`Bulk ${action}: ${results.success} entries processed successfully`);
    }

    return {
      success: true,
      message: `${results.success} entries processed. ${results.failed} failed.`,
      details: results,
    };
  }
}
