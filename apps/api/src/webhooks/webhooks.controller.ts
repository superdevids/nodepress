import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  @ApiOperation({ summary: 'List all webhooks' })
  async findAll() {
    return this.webhooksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a webhook by ID' })
  async findOne(@Param('id') id: string) {
    return this.webhooksService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new webhook' })
  async create(
    @Body() data: { name: string; url: string; events: string[]; secret?: string },
  ) {
    return this.webhooksService.create(data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a webhook' })
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; url?: string; events?: string[]; enabled?: boolean },
  ) {
    return this.webhooksService.update(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook' })
  async delete(@Param('id') id: string) {
    await this.webhooksService.delete(id);
  }
}
