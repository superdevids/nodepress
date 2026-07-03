import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all settings groups' })
  async getAll() {
    return this.settingsService.getAll();
  }

  @Public()
  @Get(':group')
  @ApiOperation({ summary: 'Get a settings group' })
  async getGroup(@Param('group') group: string) {
    return this.settingsService.getGroup(group);
  }

  @Put(':group')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a settings group' })
  async updateGroup(
    @Param('group') group: string,
    @Body() values: Record<string, unknown>,
  ) {
    return this.settingsService.updateGroup(group, values);
  }
}
