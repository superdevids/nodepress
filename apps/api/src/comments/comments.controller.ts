import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Public()
  @Get(':contentId')
  @ApiOperation({ summary: 'List comments for a content entry' })
  async findByContentId(
    @Param('contentId') contentId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.commentsService.findByContentId(
      contentId,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Post(':contentId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new comment' })
  async create(
    @Param('contentId') contentId: string,
    @Body() data: { parentId?: string; authorName?: string; authorEmail?: string; content: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.commentsService.create({
      contentId,
      parentId: data.parentId,
      authorId: user.sub,
      authorName: data.authorName ?? 'Anonymous',
      authorEmail: data.authorEmail ?? '',
      content: data.content,
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'EDITOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update comment status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() data: { status: 'approved' | 'pending' | 'spam' | 'trash' },
  ) {
    return this.commentsService.updateStatus(id, data.status);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'EDITOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  async delete(@Param('id') id: string) {
    await this.commentsService.delete(id);
  }
}
