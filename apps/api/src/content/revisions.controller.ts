import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { PrismaService } from '../common/prisma.service';

@ApiTags('Revisions')
@Controller('revisions')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class RevisionsController {
  constructor(
    private readonly contentService: ContentService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':contentId')
  @ApiOperation({ summary: 'List all revisions for a content entry' })
  async findAll(@Param('contentId') contentId: string) {
    await this.contentService.findById(contentId);
    const revisions = await this.prisma.revision.findMany({
      where: { entryId: contentId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      contentId,
      revisions: revisions.map((r) => ({
        id: r.id,
        data: r.data,
        createdBy: r.createdBy,
        autoSave: r.autoSave,
        note: r.note,
        createdAt: r.createdAt,
      })),
    };
  }

  @Get(':contentId/:revisionId')
  @ApiOperation({ summary: 'Get a specific revision' })
  async findOne(
    @Param('contentId') contentId: string,
    @Param('revisionId') revisionId: string,
  ) {
    await this.contentService.findById(contentId);
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
    });
    if (!revision || revision.entryId !== contentId) {
      throw new NotFoundException(`Revision ${revisionId} not found`);
    }
    return { contentId, revision };
  }

  @Post(':contentId/rollback/:revisionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rollback content to a previous revision' })
  async rollback(
    @Param('contentId') contentId: string,
    @Param('revisionId') revisionId: string,
  ) {
    const entry = await this.contentService.findById(contentId);
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
    });
    if (!revision || revision.entryId !== contentId) {
      throw new NotFoundException(`Revision ${revisionId} not found`);
    }

    await this.prisma.contentEntry.update({
      where: { id: contentId },
      data: { data: revision.data as any, updatedAt: new Date() },
    });

    return { contentId, revisionId, restored: true };
  }

  @Delete(':contentId/:revisionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a revision' })
  async delete(
    @Param('contentId') contentId: string,
    @Param('revisionId') revisionId: string,
  ) {
    await this.contentService.findById(contentId);
    const revision = await this.prisma.revision.findUnique({
      where: { id: revisionId },
    });
    if (revision && revision.entryId === contentId) {
      await this.prisma.revision.delete({ where: { id: revisionId } });
    }
  }
}
