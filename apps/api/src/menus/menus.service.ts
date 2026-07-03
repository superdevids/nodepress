import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { randomUUID } from 'crypto';

export interface MenuItem {
  id: string;
  parentId: string | null;
  label: string;
  url: string;
  target: '_self' | '_blank';
  order: number;
  objectType: string | null;
  objectId: string | null;
}

export interface Menu {
  id: string;
  name: string;
  slug: string;
  description: string;
  items: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Menu[]> {
    const menus = await this.prisma.menu.findMany({
      include: {
        items: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return menus.map((m) => this.toMenu(m));
  }

  async findById(id: string): Promise<Menu> {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    if (!menu) throw new NotFoundException(`Menu ${id} not found`);
    return this.toMenu(menu);
  }

  async create(data: { name: string; slug: string; description?: string }): Promise<Menu> {
    const menu = await this.prisma.menu.create({
      data: {
        id: randomUUID(),
        location: data.slug,
        items: {
          create: [],
        },
      },
      include: { items: true },
    });

    this.logger.log(`Menu created: ${menu.location}`);
    return this.toMenu(menu);
  }

  async addItem(
    menuId: string,
    item: Omit<MenuItem, 'id'>,
  ): Promise<Menu> {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException(`Menu ${menuId} not found`);

    await this.prisma.menuItem.create({
      data: {
        id: randomUUID(),
        menuId,
        label: item.label,
        url: item.url,
        order: item.order,
        parentId: item.parentId,
      },
    });

    return this.findById(menuId);
  }

  async removeItem(menuId: string, itemId: string): Promise<Menu> {
    const menu = await this.prisma.menu.findUnique({ where: { id: menuId } });
    if (!menu) throw new NotFoundException(`Menu ${menuId} not found`);

    await this.prisma.menuItem.delete({ where: { id: itemId } }).catch(() => {
      throw new NotFoundException(`MenuItem ${itemId} not found`);
    });

    return this.findById(menuId);
  }

  async delete(id: string): Promise<void> {
    const menu = await this.prisma.menu.findUnique({ where: { id } });
    if (!menu) throw new NotFoundException(`Menu ${id} not found`);
    await this.prisma.menu.delete({ where: { id } });
    this.logger.log(`Menu deleted: ${id}`);
  }

  private toMenu(m: {
    id: string; location: string; createdAt: Date; updatedAt: Date;
    items: {
      id: string; parentId: string | null; label: string; url: string;
      order: number;
    }[];
  }): Menu {
    return {
      id: m.id,
      name: m.location,
      slug: m.location,
      description: '',
      items: m.items.map((i) => ({
        id: i.id,
        parentId: i.parentId,
        label: i.label,
        url: i.url,
        target: '_self' as const,
        order: i.order,
        objectType: null,
        objectId: null,
      })),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };
  }
}
