import type { PrismaClient } from "@nodepress/db";

export interface NavMenuLocationDef {
  slug: string;
  name: string;
  maxDepth: number;
}

export interface NavMenuLocationRecord {
  id: string;
  themeId: string;
  slug: string;
  name: string;
  maxDepth: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NavMenuTreeItem {
  id: string;
  label: string;
  url: string;
  order: number;
  children: NavMenuTreeItem[];
  parentId: string | null;
}

export interface NavMenuTree {
  location: string;
  items: NavMenuTreeItem[];
}

export class NavMenuLocationsManager {
  private prisma: PrismaClient;
  private locations: Map<string, NavMenuLocationDef> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  registerNavMenu(themeSlug: string, slug: string, name: string, options?: { maxDepth?: number }): void {
    const key = `${themeSlug}:${slug}`;
    if (this.locations.has(key)) {
      throw new Error(`Nav menu location "${slug}" already registered for theme "${themeSlug}".`);
    }
    this.locations.set(key, {
      slug,
      name,
      maxDepth: options?.maxDepth ?? 3,
    });
  }

  getLocation(themeSlug: string, slug: string): NavMenuLocationDef | undefined {
    return this.locations.get(`${themeSlug}:${slug}`);
  }

  getAllLocations(themeSlug: string): NavMenuLocationDef[] {
    return Array.from(this.locations.entries())
      .filter(([key]) => key.startsWith(`${themeSlug}:`))
      .map(([, def]) => def);
  }

  async getMenuTree(location: string, _locale?: string): Promise<NavMenuTree | null> {
    const menu = await this.prisma.menu.findUnique({
      where: { location },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!menu) return null;

    const tree = this.buildTree(menu.items as unknown as NavMenuTreeItem[]);

    return {
      location: menu.location,
      items: tree,
    };
  }

  async ensureDefaultMenu(location: string): Promise<void> {
    const exists = await this.prisma.menu.findUnique({ where: { location } });
    if (!exists) {
      await this.prisma.menu.create({
        data: { location },
      });
    }
  }

  async createOrUpdateMenu(location: string, _label: string): Promise<{ id: string; location: string }> {
    const menu = await this.prisma.menu.upsert({
      where: { location },
      update: {},
      create: { location },
    });
    return { id: menu.id, location: menu.location };
  }

  async addMenuItem(
    menuId: string,
    data: { label: string; url: string; parentId?: string; order?: number },
  ): Promise<NavMenuTreeItem> {
    const maxOrder = await this.prisma.menuItem.findFirst({
      where: { menuId },
      orderBy: { order: "desc" },
    });

    const item = await this.prisma.menuItem.create({
      data: {
        menuId,
        label: data.label,
        url: data.url,
        order: data.order ?? (maxOrder?.order ?? 0) + 1,
        parentId: data.parentId,
      },
    });

    return item as unknown as NavMenuTreeItem;
  }

  async updateMenuItem(
    id: string,
    data: { label?: string; url?: string; order?: number; parentId?: string | null },
  ): Promise<void> {
    await this.prisma.menuItem.update({
      where: { id },
      data,
    });
  }

  async deleteMenuItem(id: string): Promise<void> {
    await this.prisma.menuItem.delete({ where: { id } });
  }

  async syncLocationToDb(themeId: string, location: NavMenuLocationDef): Promise<NavMenuLocationRecord> {
    const record = await this.prisma.navMenuLocation.upsert({
      where: { themeId_slug: { themeId, slug: location.slug } },
      update: { name: location.name, maxDepth: location.maxDepth },
      create: {
        themeId,
        slug: location.slug,
        name: location.name,
        maxDepth: location.maxDepth,
      },
    });
    return record as unknown as NavMenuLocationRecord;
  }

  private buildTree(items: NavMenuTreeItem[]): NavMenuTreeItem[] {
    const map = new Map<string, NavMenuTreeItem>();
    const roots: NavMenuTreeItem[] = [];

    for (const item of items) {
      map.set(item.id, { ...item, children: [] });
    }

    for (const item of items) {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
