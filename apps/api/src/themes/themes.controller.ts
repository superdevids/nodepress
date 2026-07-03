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
import { ThemesService } from './themes.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Themes')
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all themes' })
  async findAll() {
    return this.themesService.findAll();
  }

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Get the active theme' })
  async getActive() {
    return this.themesService.getActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get theme details' })
  async findOne(@Param('id') id: string) {
    return this.themesService.findById(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Install a new theme' })
  async install(
    @Body() data: { name: string; slug: string; version?: string; description?: string; author?: string },
  ) {
    return this.themesService.install(data);
  }

  @Post(':id/activate')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate a theme' })
  async activate(@Param('id') id: string) {
    return this.themesService.activate(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Uninstall a theme' })
  async uninstall(@Param('id') id: string) {
    await this.themesService.uninstall(id);
  }
}
