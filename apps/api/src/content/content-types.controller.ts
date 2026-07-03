import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentTypesService } from './content-types.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Content Types')
@Controller('content-types')
export class ContentTypesController {
  constructor(private readonly contentTypesService: ContentTypesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all registered content types' })
  async findAll() {
    return this.contentTypesService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get a content type by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.contentTypesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new content type' })
  async create(
    @Body() data: { name: string; slug: string; description: string; supports?: string[] },
  ) {
    return this.contentTypesService.create(data);
  }

  @Delete(':slug')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a content type' })
  async delete(@Param('slug') slug: string) {
    await this.contentTypesService.delete(slug);
  }
}
