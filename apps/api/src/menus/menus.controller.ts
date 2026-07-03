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
import { MenusService } from './menus.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Menus')
@Controller('menus')
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all menus' })
  async findAll() {
    return this.menusService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a menu by ID' })
  async findOne(@Param('id') id: string) {
    return this.menusService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new menu' })
  async create(@Body() data: { name: string; slug: string; description?: string }) {
    return this.menusService.create(data);
  }

  @Post(':id/items')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an item to a menu' })
  async addItem(
    @Param('id') id: string,
    @Body() item: { label: string; url: string; parentId?: string; target?: '_self' | '_blank'; objectType?: string; objectId?: string },
  ) {
    return this.menusService.addItem(id, {
      label: item.label,
      url: item.url,
      parentId: item.parentId ?? null,
      target: item.target ?? '_self',
      order: 0,
      objectType: item.objectType ?? null,
      objectId: item.objectId ?? null,
    });
  }

  @Delete(':menuId/items/:itemId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an item from a menu' })
  async removeItem(
    @Param('menuId') menuId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.menusService.removeItem(menuId, itemId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a menu' })
  async delete(@Param('id') id: string) {
    await this.menusService.delete(id);
  }
}
