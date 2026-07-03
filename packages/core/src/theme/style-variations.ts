import type { PrismaClient } from "@nodepress/db";
import { type ThemeJson, type ThemeJsonSettings, type ThemeJsonStyles, ThemeJsonParser } from "./theme-json-parser.js";

export interface StyleVariationDef {
  title: string;
  slug: string;
  settings?: ThemeJsonSettings;
  styles?: ThemeJsonStyles;
  isDefault?: boolean;
}

export interface StyleVariationRecord {
  id: string;
  themeId: string;
  title: string;
  slug: string;
  settings: Record<string, unknown> | null;
  styles: Record<string, unknown> | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_VARIATIONS: StyleVariationDef[] = [
  {
    title: "Light",
    slug: "light",
    isDefault: true,
    settings: {
      color: {
        palette: [
          { slug: "background", name: "Background", color: "#ffffff" },
          { slug: "foreground", name: "Foreground", color: "#1a1a1a" },
        ],
      },
    },
  },
  {
    title: "Dark",
    slug: "dark",
    settings: {
      color: {
        palette: [
          { slug: "background", name: "Background", color: "#1a1a1a" },
          { slug: "foreground", name: "Foreground", color: "#ffffff" },
          { slug: "primary", name: "Primary", color: "#66bbff" },
        ],
      },
    },
    styles: {
      color: {
        background: "#1a1a1a",
        text: "#ffffff",
      },
    },
  },
  {
    title: "Colorful",
    slug: "colorful",
    settings: {
      color: {
        palette: [
          { slug: "background", name: "Background", color: "#f0f4ff" },
          { slug: "foreground", name: "Foreground", color: "#1a1a2e" },
          { slug: "primary", name: "Primary", color: "#e94560" },
          { slug: "secondary", name: "Secondary", color: "#0f3460" },
          { slug: "accent", name: "Accent", color: "#16213e" },
        ],
      },
    },
    styles: {
      color: {
        background: "#f0f4ff",
        text: "#1a1a2e",
      },
      blocks: {
        "core/button": {
          color: { background: "#e94560", text: "#ffffff" },
        },
        "core/heading": {
          color: { text: "#0f3460" },
        },
      },
    },
  },
];

export class StyleVariationsManager {
  private prisma: PrismaClient;
  private parser: ThemeJsonParser;
  private variations: Map<string, StyleVariationDef[]> = new Map();

  constructor(prisma: PrismaClient, parser: ThemeJsonParser) {
    this.prisma = prisma;
    this.parser = parser;
  }

  registerVariations(themeSlug: string, variations: StyleVariationDef[]): void {
    this.variations.set(themeSlug, variations);
  }

  getVariations(themeSlug: string): StyleVariationDef[] {
    const custom = this.variations.get(themeSlug);
    if (custom && custom.length > 0) return custom;
    return DEFAULT_VARIATIONS;
  }

  getVariation(themeSlug: string, slug: string): StyleVariationDef | undefined {
    return this.getVariations(themeSlug).find((v) => v.slug === slug);
  }

  getDefaultVariation(themeSlug: string): StyleVariationDef {
    const all = this.getVariations(themeSlug);
    const found = all.find((v) => v.isDefault);
    if (found) return found;
    const fromDefault = all[0] ?? this.getDefaultVariations()[0];
    return fromDefault ?? { title: "Light", slug: "light", isDefault: true };
  }

  async getPersistedVariations(themeId: string): Promise<StyleVariationRecord[]> {
    const records = await this.prisma.styleVariation.findMany({
      where: { themeId },
      orderBy: { createdAt: "asc" },
    });
    return records as unknown as StyleVariationRecord[];
  }

  async persistVariation(themeId: string, def: StyleVariationDef): Promise<StyleVariationRecord> {
    const record = await this.prisma.styleVariation.upsert({
      where: { themeId_slug: { themeId, slug: def.slug } },
      update: {
        title: def.title,
        settings: (def.settings ?? {}) as Record<string, unknown>,
        styles: (def.styles ?? {}) as Record<string, unknown>,
        isDefault: def.isDefault ?? false,
      },
      create: {
        themeId,
        title: def.title,
        slug: def.slug,
        settings: (def.settings ?? {}) as Record<string, unknown>,
        styles: (def.styles ?? {}) as Record<string, unknown>,
        isDefault: def.isDefault ?? false,
      },
    });
    return record as unknown as StyleVariationRecord;
  }

  async syncThemeVariations(themeId: string, themeSlug: string): Promise<void> {
    const variations = this.getVariations(themeSlug);
    for (const def of variations) {
      await this.persistVariation(themeId, def);
    }
  }

  mergeWithBaseTheme(baseThemeJson: ThemeJson, variationSlug: string, themeSlug: string): ThemeJson {
    const variation = this.getVariation(themeSlug, variationSlug);
    if (!variation) return baseThemeJson;

    return this.parser.mergeThemeJson(baseThemeJson, variation);
  }

  generateVariationCss(baseThemeJson: ThemeJson, variationSlug: string, themeSlug: string): string {
    const merged = this.mergeWithBaseTheme(baseThemeJson, variationSlug, themeSlug);
    return this.parser.generateCssString(merged);
  }

  async setActiveVariation(themeId: string, slug: string): Promise<void> {
    const records = await this.prisma.styleVariation.findMany({ where: { themeId } });
    for (const record of records) {
      if (record.slug === slug) {
        await this.prisma.styleVariation.update({
          where: { id: record.id },
          data: { isDefault: true },
        });
      } else {
        await this.prisma.styleVariation.update({
          where: { id: record.id },
          data: { isDefault: false },
        });
      }
    }
  }

  async getActiveVariationId(themeId: string): Promise<string | null> {
    const active = await this.prisma.styleVariation.findFirst({
      where: { themeId, isDefault: true },
    });
    return active?.id ?? null;
  }

  getDefaultVariations(): StyleVariationDef[] {
    return DEFAULT_VARIATIONS;
  }
}
