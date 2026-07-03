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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post(':type')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new content entry' })
  async create(
    @Param('type') type: string,
    @Body() dto: CreateContentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contentService.create(type, dto, user.sub);
  }

  @Public()
  @Get(':type')
  @ApiOperation({ summary: 'List content entries by type' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @Param('type') type: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.findByType(
      type,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Public()
  @Get(':type/:id')
  @ApiOperation({ summary: 'Get a single content entry' })
  async findOne(
    @Param('type') _type: string,
    @Param('id') id: string,
  ) {
    return this.contentService.findById(id);
  }

  @Patch(':type/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a content entry' })
  async update(
    @Param('type') _type: string,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.update(id, dto);
  }

  @Delete(':type/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a content entry' })
  async delete(
    @Param('type') _type: string,
    @Param('id') id: string,
  ) {
    await this.contentService.delete(id);
  }
}
