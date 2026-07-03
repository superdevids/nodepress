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
import { TaxonomyService } from './taxonomy.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Taxonomy')
@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List taxonomy terms' })
  async findAll(
    @Query('taxonomy') taxonomy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.taxonomyService.findAll(
      taxonomy,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a term by ID' })
  async findOne(@Param('id') id: string) {
    return this.taxonomyService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new taxonomy term' })
  async create(
    @Body() data: { taxonomy: string; name: string; slug?: string; description?: string; parentId?: string },
  ) {
    return this.taxonomyService.create(data);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a taxonomy term' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; slug?: string; description?: string },
  ) {
    return this.taxonomyService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a taxonomy term' })
  async delete(@Param('id') id: string) {
    await this.taxonomyService.delete(id);
  }
}
