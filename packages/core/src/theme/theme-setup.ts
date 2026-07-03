import type { PrismaClient } from "@nodepress/db";

export interface ThemeSetupImageSize {
  name: string;
  width: number;
  height: number;
  crop: boolean;
}

export interface ThemeSetupContext {
  registerNavMenu: (slug: string, name: string, options?: { maxDepth?: number }) => void;
  registerBlockArea: (slug: string, def: { name: string; description?: string }) => void;
  addSupport: (feature: string) => void;
  addImageSize: (name: string, width: number, height: number, crop?: boolean) => void;
  getRegisteredNavMenus: () => { slug: string; name: string; maxDepth: number }[];
  getRegisteredBlockAreas: () => { slug: string; name: string; description?: string }[];
  getSupports: () => string[];
  getImageSizes: () => ThemeSetupImageSize[];
}

export type ThemeSetupFn = (context: ThemeSetupContext) => void;

export interface ThemeSetupConfig {
  name: string;
  setup: ThemeSetupFn;
}

export class ThemeSetupManager {
  private prisma: PrismaClient;
  private setups: Map<string, ThemeSetupConfig> = new Map();
  private executed: Set<string> = new Set();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  registerThemeSetup(themeSlug: string, config: ThemeSetupConfig): void {
    this.setups.set(themeSlug, config);
  }

  getSetup(themeSlug: string): ThemeSetupConfig | undefined {
    return this.setups.get(themeSlug);
  }

  private createContext(): ThemeSetupContext {
    const navMenus: { slug: string; name: string; maxDepth: number }[] = [];
    const blockAreas: { slug: string; name: string; description?: string }[] = [];
    const supports: string[] = [];
    const imageSizes: ThemeSetupImageSize[] = [];

    return {
      registerNavMenu(slug, name, options?) {
        navMenus.push({ slug, name, maxDepth: options?.maxDepth ?? 3 });
      },
      registerBlockArea(slug, def) {
        blockAreas.push({ slug, name: def.name, description: def.description });
      },
      addSupport(feature) {
        supports.push(feature);
      },
      addImageSize(name, width, height, crop = true) {
        imageSizes.push({ name, width, height, crop });
      },
      getRegisteredNavMenus: () => [...navMenus],
      getRegisteredBlockAreas: () => [...blockAreas],
      getSupports: () => [...supports],
      getImageSizes: () => [...imageSizes],
    };
  }

  async runThemeSetup(themeSlug: string, themeId: string): Promise<void> {
    const config = this.setups.get(themeSlug);
    if (!config) return;

    const context = this.createContext();
    config.setup(context);

    const navMenus = context.getRegisteredNavMenus();
    const areas = context.getRegisteredBlockAreas();
    const features = context.getSupports();
    const sizes = context.getImageSizes();

    for (const menu of navMenus) {
      await this.prisma.navMenuLocation.upsert({
        where: { themeId_slug: { themeId, slug: menu.slug } },
        update: { name: menu.name, maxDepth: menu.maxDepth },
        create: {
          themeId,
          slug: menu.slug,
          name: menu.name,
          maxDepth: menu.maxDepth,
        },
      });

      await this.prisma.themeSetupRegistration.upsert({
        where: {
          id: `${themeId}:nav-menu:${menu.slug}`,
        },
        update: { value: { name: menu.name, maxDepth: menu.maxDepth } },
        create: {
          id: `${themeId}:nav-menu:${menu.slug}`,
          themeId,
          type: "nav-menu",
          key: menu.slug,
          value: { name: menu.name, maxDepth: menu.maxDepth },
        },
      });
    }

    for (const area of areas) {
      await this.prisma.themeSetupRegistration.upsert({
        where: {
          id: `${themeId}:block-area:${area.slug}`,
        },
        update: { value: { name: area.name, description: area.description } },
        create: {
          id: `${themeId}:block-area:${area.slug}`,
          themeId,
          type: "block-area",
          key: area.slug,
          value: { name: area.name, description: area.description },
        },
      });
    }

    for (const feature of features) {
      await this.prisma.themeSetupRegistration.upsert({
        where: {
          id: `${themeId}:support:${feature}`,
        },
        update: {},
        create: {
          id: `${themeId}:support:${feature}`,
          themeId,
          type: "support",
          key: feature,
        },
      });
    }

    for (const size of sizes) {
      await this.prisma.themeSetupRegistration.upsert({
        where: {
          id: `${themeId}:image-size:${size.name}`,
        },
        update: { value: size },
        create: {
          id: `${themeId}:image-size:${size.name}`,
          themeId,
          type: "image-size",
          key: size.name,
          value: size as unknown as Record<string, unknown>,
        },
      });
    }

    this.executed.add(themeSlug);
  }

  async isExecuted(themeSlug: string): Promise<boolean> {
    if (this.executed.has(themeSlug)) return true;
    const count = await this.prisma.themeSetupRegistration.count({
      where: { theme: { slug: themeSlug } },
    });
    return count > 0;
  }

  async getRegistrations(themeId: string, type?: string): Promise<{ type: string; key: string; value: unknown }[]> {
    const where: Record<string, unknown> = { themeId };
    if (type) where.type = type;

    const records = await this.prisma.themeSetupRegistration.findMany({ where });
    return records.map((r: { type: string; key: string; value: unknown }) => ({ type: r.type, key: r.key, value: r.value }));
  }

  async clearRegistrations(themeId: string): Promise<void> {
    await this.prisma.themeSetupRegistration.deleteMany({ where: { themeId } });
    for (const [slug] of this.setups) {
      this.executed.delete(slug);
    }
  }
}
