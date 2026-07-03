import type { PrismaClient } from "@nodepressjs/db";

export interface ThemeBrandingSettings {
  customLogo?: {
    id: string;
    url: string;
    width: number;
    height: number;
    alt: string;
  };
  customHeader?: {
    id: string;
    url: string;
    width: number;
    height: number;
    alt: string;
    textColor?: string;
  };
  customBackground?: {
    color: string;
    imageId?: string;
    imageUrl?: string;
    repeat: string;
    position: string;
    size: string;
  };
}

export interface ThemeModValue {
  key: string;
  value: unknown;
}

export type ThemeModKey =
  | "custom_logo"
  | "custom_header"
  | "custom_header_text_color"
  | "background_color"
  | "background_image"
  | "background_repeat"
  | "background_position"
  | "background_size"
  | "site_icon"
  | "custom_css";

export class ThemeBrandingManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getMod(themeId: string, key: string): Promise<unknown> {
    const mod = await this.prisma.themeMod.findUnique({
      where: { themeId_key: { themeId, key } },
    });
    return mod?.value ?? null;
  }

  async setMod(themeId: string, key: string, value: unknown): Promise<void> {
    await this.prisma.themeMod.upsert({
      where: { themeId_key: { themeId, key } },
      update: { value: value as Record<string, unknown> },
      create: {
        themeId,
        key,
        value: value as Record<string, unknown>,
      },
    });
  }

  async deleteMod(themeId: string, key: string): Promise<void> {
    await this.prisma.themeMod.deleteMany({
      where: { themeId, key },
    });
  }

  async getAllMods(themeId: string): Promise<ThemeModValue[]> {
    const mods = await this.prisma.themeMod.findMany({
      where: { themeId },
      orderBy: { updatedAt: "desc" },
    });
    return mods.map((m: { key: string; value: unknown }) => ({ key: m.key, value: m.value }));
  }

  async setCustomLogo(themeId: string, mediaId: string, mediaUrl: string, width: number, height: number, alt: string): Promise<void> {
    await this.setMod(themeId, "custom_logo", {
      id: mediaId,
      url: mediaUrl,
      width,
      height,
      alt,
    });
  }

  async getCustomLogo(themeId: string): Promise<ThemeBrandingSettings["customLogo"] | null> {
    return (await this.getMod(themeId, "custom_logo")) as ThemeBrandingSettings["customLogo"] | null;
  }

  async setCustomHeader(
    themeId: string,
    mediaId: string,
    mediaUrl: string,
    width: number,
    height: number,
    alt: string,
    textColor?: string,
  ): Promise<void> {
    await this.setMod(themeId, "custom_header", {
      id: mediaId,
      url: mediaUrl,
      width,
      height,
      alt,
      textColor,
    });
    if (textColor) {
      await this.setMod(themeId, "custom_header_text_color", textColor);
    }
  }

  async getCustomHeader(themeId: string): Promise<ThemeBrandingSettings["customHeader"] | null> {
    return (await this.getMod(themeId, "custom_header")) as ThemeBrandingSettings["customHeader"] | null;
  }

  async setBackground(themeId: string, settings: {
    color?: string;
    imageId?: string;
    imageUrl?: string;
    repeat?: string;
    position?: string;
    size?: string;
  }): Promise<void> {
    if (settings.color) await this.setMod(themeId, "background_color", settings.color);
    if (settings.imageId || settings.imageUrl) {
      await this.setMod(themeId, "background_image", { id: settings.imageId, url: settings.imageUrl });
    }
    if (settings.repeat) await this.setMod(themeId, "background_repeat", settings.repeat);
    if (settings.position) await this.setMod(themeId, "background_position", settings.position);
    if (settings.size) await this.setMod(themeId, "background_size", settings.size);
  }

  async getBackground(themeId: string): Promise<ThemeBrandingSettings["customBackground"] | null> {
    const color = await this.getMod(themeId, "background_color");
    const image = await this.getMod(themeId, "background_image") as { id?: string; url?: string } | null;
    const repeat = await this.getMod(themeId, "background_repeat");
    const position = await this.getMod(themeId, "background_position");
    const size = await this.getMod(themeId, "background_size");

    if (!color && !image) return null;

    return {
      color: (color as string) ?? "#ffffff",
      imageId: image?.id,
      imageUrl: image?.url,
      repeat: (repeat as string) ?? "no-repeat",
      position: (position as string) ?? "center center",
      size: (size as string) ?? "cover",
    };
  }

  setSiteIcon(themeId: string, mediaId: string, mediaUrl: string): Promise<void> {
    return this.setMod(themeId, "site_icon", { id: mediaId, url: mediaUrl });
  }

  getSiteIcon(themeId: string): Promise<unknown> {
    return this.getMod(themeId, "site_icon");
  }

  setCustomCss(themeId: string, css: string): Promise<void> {
    return this.setMod(themeId, "custom_css", css);
  }

  getCustomCss(themeId: string): Promise<string> {
    return this.getMod(themeId, "custom_css") as Promise<string>;
  }

  generateBrandingCss(_themeId: string, mods: ThemeModValue[]): string {
    const lines: string[] = [];

    for (const mod of mods) {
      switch (mod.key) {
        case "custom_logo":
          const logo = mod.value as ThemeBrandingSettings["customLogo"];
          if (logo) {
            lines.push(`  --wp--custom--logo--url: url(${logo.url});`);
            lines.push(`  --wp--custom--logo--width: ${logo.width}px;`);
            lines.push(`  --wp--custom--logo--height: ${logo.height}px;`);
          }
          break;
        case "background_color":
          lines.push(`  --wp--custom--background--color: ${mod.value};`);
          break;
        case "background_image":
          const bg = mod.value as { url?: string };
          if (bg?.url) lines.push(`  --wp--custom--background--image: url(${bg.url});`);
          break;
        case "background_repeat":
          lines.push(`  --wp--custom--background--repeat: ${mod.value};`);
          break;
        case "background_position":
          lines.push(`  --wp--custom--background--position: ${mod.value};`);
          break;
        case "background_size":
          lines.push(`  --wp--custom--background--size: ${mod.value};`);
          break;
        case "custom_header_text_color":
          lines.push(`  --wp--custom--header--text-color: ${mod.value};`);
          break;
        case "site_icon":
          const icon = mod.value as { url?: string };
          if (icon?.url) lines.push(`  --wp--custom--site--icon: url(${icon.url});`);
          break;
        case "custom_css":
          // Inline CSS — appended separately
          break;
      }
    }

    if (lines.length === 0) return "";

    return `:root {\n${lines.join("\n")}\n}`;
  }

  async getBrandingStylesheet(themeId: string): Promise<string> {
    const mods = await this.getAllMods(themeId);
    const cssVars = mods.length > 0 ? this.generateBrandingCss(themeId, mods) : "";

    const customCss = mods.find((m) => m.key === "custom_css")?.value as string ?? "";

    return `${cssVars}\n${customCss}`.trim();
  }
}
