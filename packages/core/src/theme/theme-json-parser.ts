import type { PrismaClient } from "@nodepress/db";
import type { InputJsonValue } from "@prisma/client/runtime/library.js";

export interface ThemeJsonColorPalette {
  slug: string;
  name: string;
  color: string;
}

export interface ThemeJsonGradient {
  slug: string;
  name: string;
  gradient: string;
}

export interface ThemeJsonFontSize {
  slug: string;
  name: string;
  size: string;
  fluid?: { min: string; max: string };
}

export interface ThemeJsonFontFamily {
  slug: string;
  name: string;
  fontFamily: string;
}

export interface ThemeJsonTypographySettings {
  fontSizes?: ThemeJsonFontSize[];
  fontFamilies?: ThemeJsonFontFamily[];
  fluid?: boolean;
  customFontSize?: boolean;
  lineHeight?: boolean;
}

export interface ThemeJsonColorSettings {
  palette?: ThemeJsonColorPalette[];
  gradients?: ThemeJsonGradient[];
  custom?: boolean;
  link?: boolean;
  heading?: boolean;
  button?: boolean;
  caption?: boolean;
}

export interface ThemeJsonSpacingSettings {
  padding?: boolean;
  margin?: boolean;
  units?: string[];
  customSpacing?: boolean;
}

export interface ThemeJsonLayoutSettings {
  contentSize?: string;
  wideSize?: string;
}

export interface ThemeJsonSettings {
  color?: ThemeJsonColorSettings;
  typography?: ThemeJsonTypographySettings;
  spacing?: ThemeJsonSpacingSettings;
  layout?: ThemeJsonLayoutSettings;
}

export interface ThemeJsonBlockStyles {
  [blockName: string]: {
    typography?: Record<string, string>;
    color?: Record<string, string>;
    spacing?: Record<string, string>;
    border?: Record<string, string>;
    [key: string]: unknown;
  };
}

export interface ThemeJsonStyles {
  blocks?: ThemeJsonBlockStyles;
  typography?: Record<string, string>;
  color?: Record<string, string>;
  spacing?: Record<string, string>;
  elements?: Record<string, Record<string, unknown>>;
}

export interface ThemeJsonCustomTemplate {
  name: string;
  title: string;
  postTypes?: string[];
}

export interface ThemeJsonStyleVariation {
  title: string;
  slug?: string;
  settings?: ThemeJsonSettings;
  styles?: ThemeJsonStyles;
}

export interface ThemeJson {
  version: 2;
  settings?: ThemeJsonSettings;
  styles?: ThemeJsonStyles;
  customTemplates?: ThemeJsonCustomTemplate[];
  templateParts?: { name: string; area: string }[];
  variations?: ThemeJsonStyleVariation[];
}

export interface CssCustomProperty {
  name: string;
  value: string;
}

export class ThemeJsonParser {
  private prisma: PrismaClient;
  private themeJsons: Map<string, ThemeJson> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  registerThemeJson(themeSlug: string, themeJson: ThemeJson): void {
    this.themeJsons.set(themeSlug, themeJson);
  }

  getThemeJson(themeSlug: string): ThemeJson | undefined {
    return this.themeJsons.get(themeSlug);
  }

  generateCssCustomProperties(themeJson: ThemeJson): CssCustomProperty[] {
    const props: CssCustomProperty[] = [];

    if (themeJson.settings?.color?.palette) {
      for (const c of themeJson.settings.color.palette) {
        props.push({ name: `--wp--preset--color--${c.slug}`, value: c.color });
      }
    }

    if (themeJson.settings?.color?.gradients) {
      for (const g of themeJson.settings.color.gradients) {
        props.push({ name: `--wp--preset--gradient--${g.slug}`, value: g.gradient });
      }
    }

    if (themeJson.settings?.typography?.fontSizes) {
      for (const f of themeJson.settings.typography.fontSizes) {
        if (f.fluid) {
          const fluidValue = this.generateClampValue(f.fluid.min, f.fluid.max);
          props.push({ name: `--wp--preset--font-size--${f.slug}`, value: fluidValue });
        } else {
          props.push({ name: `--wp--preset--font-size--${f.slug}`, value: f.size });
        }
      }
    }

    if (themeJson.settings?.typography?.fontFamilies) {
      for (const f of themeJson.settings.typography.fontFamilies) {
        props.push({ name: `--wp--preset--font-family--${f.slug}`, value: f.fontFamily });
      }
    }

    if (themeJson.settings?.layout?.contentSize) {
      props.push({ name: "--wp--style--global--content-size", value: themeJson.settings.layout.contentSize });
    }

    if (themeJson.settings?.layout?.wideSize) {
      props.push({ name: "--wp--style--global--wide-size", value: themeJson.settings.layout.wideSize });
    }

    return props;
  }

  generateClampValue(min: string, max: string): string {
    const minNum = parseFloat(min);
    const maxNum = parseFloat(max);
    const maxUnit = max.replace(/[\d.]/g, "");

    if (isNaN(minNum) || isNaN(maxNum)) {
      return `clamp(${min}, 1rem + 1vw, ${max})`;
    }

    const preferred = `${((maxNum - minNum) / 768) * 100}${maxUnit}`;
    return `clamp(${min}, ${preferred}, ${max})`;
  }

  generateCssString(themeJson: ThemeJson): string {
    const props = this.generateCssCustomProperties(themeJson);
    const lines = props.map((p) => `  ${p.name}: ${p.value};`);
    return `:root {\n${lines.join("\n")}\n}`;
  }

  getBlockStyles(themeJson: ThemeJson, blockName: string): Record<string, unknown> | undefined {
    return themeJson.styles?.blocks?.[blockName];
  }

  getTypographyStyles(themeJson: ThemeJson, blockName: string): Record<string, unknown> | undefined {
    const blockStyles = this.getBlockStyles(themeJson, blockName);
    return blockStyles?.typography as Record<string, unknown> | undefined;
  }

  getColorStyles(themeJson: ThemeJson, blockName: string): Record<string, unknown> | undefined {
    const blockStyles = this.getBlockStyles(themeJson, blockName);
    return blockStyles?.color as Record<string, unknown> | undefined;
  }

  getSpacingStyles(themeJson: ThemeJson, blockName: string): Record<string, unknown> | undefined {
    const blockStyles = this.getBlockStyles(themeJson, blockName);
    return blockStyles?.spacing as Record<string, unknown> | undefined;
  }

  async getUserOverrides(themeSlug: string): Promise<Record<string, unknown>> {
    const settings = await this.prisma.setting.findFirst({
      where: { group: "theme_styles", key: themeSlug },
    });
    return (settings?.value as Record<string, unknown>) ?? {};
  }

  async saveUserOverride(themeSlug: string, overrides: Record<string, unknown>): Promise<void> {
    await this.prisma.setting.upsert({
      where: { group_key: { group: "theme_styles", key: themeSlug } },
      update: { value: overrides as InputJsonValue },
      create: { group: "theme_styles", key: themeSlug, value: overrides as InputJsonValue },
    });
  }

  mergeThemeJson(base: ThemeJson, variation: ThemeJsonStyleVariation): ThemeJson {
    return {
      version: 2,
      settings: this.deepMerge(
        (base.settings ?? {}) as Record<string, unknown>,
        (variation.settings ?? {}) as Record<string, unknown>,
      ) as unknown as ThemeJsonSettings,
      styles: this.deepMerge(
        (base.styles ?? {}) as Record<string, unknown>,
        (variation.styles ?? {}) as Record<string, unknown>,
      ) as unknown as ThemeJsonStyles,
      customTemplates: base.customTemplates,
      templateParts: base.templateParts,
    };
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(
          (result[key] as Record<string, unknown>) ?? {},
          source[key] as Record<string, unknown>,
        );
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}
