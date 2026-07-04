import { Controller, Get, Query, Header, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { FeedsService } from './feeds.service';

@ApiTags('Feeds')
@Controller('feeds')
export class FeedsController {
  constructor(private readonly feedsService: FeedsService) {}

  @Public()
  @Get('posts')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @ApiOperation({ summary: 'Get RSS feed for published posts' })
  async getPostsFeed(
    @Query('type') type?: 'rss' | 'atom',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feedsService.getPostsFeed(
      type ?? 'rss',
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Public()
  @Get('comments')
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  @ApiOperation({ summary: 'Get RSS feed for recent comments' })
  async getCommentsFeed(@Query('type') type?: 'rss' | 'atom') {
    return this.feedsService.getCommentsFeed(type ?? 'rss');
  }
}
