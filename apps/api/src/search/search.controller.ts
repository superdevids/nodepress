import { Controller, Get, Post, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Full-text search across content using PostgreSQL tsvector' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query (natural language)' })
  @ApiQuery({ name: 'type', required: false, description: 'Content type filter (e.g. post, page)' })
  @ApiQuery({
    name: 'language',
    required: false,
    description: 'Text search config language (default: english)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page (default: 20)' })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('language') language?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search(
      q,
      type,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      language ?? 'english',
    );
  }

  /**
   * Fuzzy search using pg_trgm similarity matching.
   * Useful for typo-tolerant title lookups.
   */
  @Public()
  @Get('fuzzy')
  @ApiOperation({ summary: 'Fuzzy (typo-tolerant) search via pg_trgm similarity' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 10)' })
  async fuzzySearch(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.searchService.fuzzySearch(q, limit ? parseInt(limit, 10) : 10);
  }

  /**
   * Auto-complete suggestions based on title prefix matching.
   */
  @Public()
  @Get('suggestions')
  @ApiOperation({ summary: 'Auto-complete suggestions via ILIKE prefix matching' })
  @ApiQuery({ name: 'q', required: true, description: 'Query prefix (min 2 chars)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max suggestions (default: 5)' })
  async suggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.searchService.suggestions(q, limit ? parseInt(limit, 10) : 5);
  }

  @Post('reindex')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rebuild the search_vector tsvector for all published entries' })
  async reindex() {
    return this.searchService.reindex();
  }
}
