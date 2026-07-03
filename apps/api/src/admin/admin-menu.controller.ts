import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminMenuService, AdminMenuItem, AdminSubMenuItem } from './admin-menu.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Admin')
@Controller('admin/menu')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class AdminMenuController {
  constructor(private readonly adminMenuService: AdminMenuService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get the admin menu structure' })
  getMenu() {
    return this.adminMenuService.getMenu();
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add or update an admin menu item' })
  addMenuItem(@Body() item: AdminMenuItem) {
    this.adminMenuService.addMenuItem(item);
    return { success: true };
  }

  @Delete(':slug')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove an admin menu item' })
  removeMenuItem(@Param('slug') slug: string) {
    this.adminMenuService.removeMenuItem(slug);
    return { success: true };
  }

  @Post(':parentSlug/submenu')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add a submenu item to a parent menu' })
  addSubMenuItem(@Param('parentSlug') parentSlug: string, @Body() item: AdminSubMenuItem) {
    this.adminMenuService.addSubMenuItem(parentSlug, item);
    return { success: true };
  }

  @Delete(':parentSlug/submenu/:subSlug')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove a submenu item' })
  removeSubMenuItem(@Param('parentSlug') parentSlug: string, @Param('subSlug') subSlug: string) {
    this.adminMenuService.removeSubMenuItem(parentSlug, subSlug);
    return { success: true };
  }
}
