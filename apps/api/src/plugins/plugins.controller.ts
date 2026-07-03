import {
  Controller,
  Get,
  Post,
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
import { PluginsService } from './plugins.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Plugins')
@Controller('plugins')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PluginsController {
  constructor(private readonly pluginsService: PluginsService) {}

  @Get()
  @ApiOperation({ summary: 'List all plugins' })
  async findAll(@Query('enabled') enabled?: string) {
    const isEnabled =
      enabled === 'true' ? true : enabled === 'false' ? false : undefined;
    return this.pluginsService.findAll(isEnabled);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plugin details' })
  async findOne(@Param('id') id: string) {
    return this.pluginsService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Install a new plugin' })
  async install(
    @Body() data: { name: string; slug: string; version?: string; description?: string; author?: string },
  ) {
    return this.pluginsService.install(data);
  }

  @Post(':id/activate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a plugin' })
  async activate(@Param('id') id: string) {
    return this.pluginsService.activate(id);
  }

  @Post(':id/deactivate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a plugin' })
  async deactivate(@Param('id') id: string) {
    return this.pluginsService.deactivate(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Uninstall a plugin' })
  async uninstall(@Param('id') id: string) {
    await this.pluginsService.uninstall(id);
  }
}
