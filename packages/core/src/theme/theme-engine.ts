import type { PrismaClient } from "@nodepress/db";
import { ChildThemeResolver } from "./child-theme-resolver.js";
import { ThemeJsonParser } from "./theme-json-parser.js";
import { TemplatePartsManager } from "./template-parts.js";
import { BlockPatternsManager } from "./block-patterns.js";
import { ThemeCustomizer } from "./theme-customizer.js";
import { BlockAreasManager } from "./block-areas.js";
import { ThemeSetupManager } from "./theme-setup.js";
import { ThemeSupportsManager } from "./theme-supports.js";
import { NavMenuLocationsManager } from "./nav-menu-locations.js";
import { ThemeBrandingManager } from "./theme-branding.js";
import { ThemeAutoUpdater } from "./theme-auto-updater.js";
import { ThemePreviewManager } from "./theme-preview.js";
import { StyleVariationsManager } from "./style-variations.js";
import { TemplateHierarchyResolver } from "./template-hierarchy.js";

export interface ThemeManifest {
  slug: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  template?: string;
  tags?: string[];
  supports?: string[];
}

export type TemplateType =
  | "index"
  | "single"
  | "page"
  | "archive"
  | "category"
  | "tag"
  | "author"
  | "date"
  | "search"
  | "404"
  | "front-page"
  | "home";

export interface TemplateHierarchy {
  type: TemplateType;
  slug?: string;
  format?: string;
  priority: number;
}

export class ThemeEngine {
  private themes: Map<string, ThemeManifest> = new Map();
  private activeTheme: string | null = null;
  private prisma: PrismaClient;

  public readonly childThemes: ChildThemeResolver;
  public readonly themeJson: ThemeJsonParser;
  public readonly templateParts: TemplatePartsManager;
  public readonly blockPatterns: BlockPatternsManager;
  public readonly customizer: ThemeCustomizer;
  public readonly blockAreas: BlockAreasManager;
  public readonly setup: ThemeSetupManager;
  public readonly supports: ThemeSupportsManager;
  public readonly navMenus: NavMenuLocationsManager;
  public readonly branding: ThemeBrandingManager;
  public readonly autoUpdater: ThemeAutoUpdater;
  public readonly preview: ThemePreviewManager;
  public readonly styleVariations: StyleVariationsManager;
  public readonly templateHierarchy: TemplateHierarchyResolver;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.childThemes = new ChildThemeResolver();
    this.themeJson = new ThemeJsonParser(prisma);
    this.templateParts = new TemplatePartsManager(prisma);
    this.blockPatterns = new BlockPatternsManager(prisma);
    this.customizer = new ThemeCustomizer();
    this.blockAreas = new BlockAreasManager(prisma);
    this.setup = new ThemeSetupManager(prisma);
    this.supports = new ThemeSupportsManager();
    this.navMenus = new NavMenuLocationsManager(prisma);
    this.branding = new ThemeBrandingManager(prisma);
    this.autoUpdater = new ThemeAutoUpdater(prisma);
    this.preview = new ThemePreviewManager(prisma);
    this.styleVariations = new StyleVariationsManager(prisma, this.themeJson);
    this.templateHierarchy = new TemplateHierarchyResolver(prisma);
  }

  registerTheme(manifest: ThemeManifest): void {
    if (this.themes.has(manifest.slug)) {
      throw new Error(`Theme "${manifest.slug}" is already registered.`);
    }
    this.themes.set(manifest.slug, manifest);
  }

  activateTheme(slug: string): void {
    if (!this.themes.has(slug)) {
      throw new Error(`Theme "${slug}" is not registered.`);
    }
    this.activeTheme = slug;
  }

  getActiveTheme(): ThemeManifest | undefined {
    if (!this.activeTheme) return undefined;
    return this.themes.get(this.activeTheme);
  }

  getActiveThemeSlug(): string | null {
    return this.activeTheme;
  }

  getAllThemes(): ThemeManifest[] {
    return Array.from(this.themes.values());
  }

  getTheme(slug: string): ThemeManifest | undefined {
    return this.themes.get(slug);
  }

  isChildTheme(slug: string): boolean {
    const manifest = this.themes.get(slug);
    return !!manifest?.template;
  }

  getParentTheme(slug: string): ThemeManifest | undefined {
    const manifest = this.themes.get(slug);
    if (!manifest?.template) return undefined;
    return this.themes.get(manifest.template);
  }

  getThemeChain(slug: string): ThemeManifest[] {
    const chain: ThemeManifest[] = [];
    let current = this.themes.get(slug);
    while (current) {
      chain.push(current);
      current = current.template ? this.themes.get(current.template) : undefined;
    }
    return chain;
  }

  resolveTemplateHierarchy(type: TemplateType, slug?: string, format?: string): string[] {
    const candidates: string[] = [];

    switch (type) {
      case "single":
        if (slug) candidates.push(`single-${slug}`);
        if (format) candidates.push(`single-${format}`);
        candidates.push("single");
        candidates.push("page");
        break;
      case "page":
        if (slug) candidates.push(`page-${slug}`);
        candidates.push("page");
        candidates.push("single");
        break;
      case "archive":
        if (slug) candidates.push(`archive-${slug}`);
        candidates.push("archive");
        break;
      case "category":
        if (slug) candidates.push(`category-${slug}`);
        candidates.push("category");
        candidates.push("archive");
        break;
      case "tag":
        if (slug) candidates.push(`tag-${slug}`);
        candidates.push("tag");
        candidates.push("archive");
        break;
      default:
        candidates.push(type);
        candidates.push("index");
    }

    candidates.push("index");
    return [...new Set(candidates)];
  }

  resolveTemplatePath(type: TemplateType, slug?: string, format?: string): string {
    const activeSlug = this.activeTheme ?? "default";

    const childTemplates = this.childThemes.getTemplatePath(activeSlug, type === "index" ? "index" : type);

    if (childTemplates.source !== "default") {
      return childTemplates.path;
    }

    const hierarchy = this.resolveTemplateHierarchy(type, slug, format);
    return `themes/${activeSlug}/${hierarchy[0]}.tsx`;
  }

  async persistToDb(): Promise<void> {
    for (const [slug, manifest] of this.themes) {
      await this.prisma.theme.upsert({
        where: { slug },
        update: {
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          author: manifest.author,
          template: manifest.template,
          tags: manifest.tags ?? [],
          supports: manifest.supports ?? [],
          active: slug === this.activeTheme,
        },
        create: {
          slug,
          name: manifest.name,
          version: manifest.version,
          description: manifest.description,
          author: manifest.author,
          template: manifest.template,
          tags: manifest.tags ?? [],
          supports: manifest.supports ?? [],
          active: slug === this.activeTheme,
        },
      });
    }

    // Deactivate themes no longer registered
    const dbThemes = await this.prisma.theme.findMany({ where: { active: true } });
    for (const dbTheme of dbThemes) {
      if (!this.themes.has(dbTheme.slug)) {
        await this.prisma.theme.update({
          where: { id: dbTheme.id },
          data: { active: false },
        });
      }
    }
  }

  async loadFromDb(): Promise<void> {
    const dbThemes = await this.prisma.theme.findMany();
    for (const dbTheme of dbThemes) {
      if (!this.themes.has(dbTheme.slug)) {
        const manifest: ThemeManifest = {
          slug: dbTheme.slug,
          name: dbTheme.name,
          version: dbTheme.version,
          description: dbTheme.description ?? undefined,
          author: dbTheme.author ?? undefined,
          template: dbTheme.template ?? undefined,
          tags: dbTheme.tags,
          supports: dbTheme.supports,
        };
        this.themes.set(dbTheme.slug, manifest);
      }
      if (dbTheme.active) {
        this.activeTheme = dbTheme.slug;
      }
    }
  }

  async runAllSetup(themeSlug: string): Promise<void> {
    const theme = this.themes.get(themeSlug);
    if (!theme) throw new Error(`Theme "${themeSlug}" not found.`);

    const dbTheme = await this.prisma.theme.findUnique({ where: { slug: themeSlug } });
    if (!dbTheme) throw new Error(`Theme "${themeSlug}" not found in database.`);

    await this.setup.runThemeSetup(themeSlug, dbTheme.id);
    await this.supports.syncToDatabase(themeSlug, dbTheme.id, this.prisma);
    await this.styleVariations.syncThemeVariations(dbTheme.id, themeSlug);
  }

  async initialize(): Promise<void> {
    await this.loadFromDb();
    await this.blockPatterns.seedDefaultPatterns();

    if (this.activeTheme) {
      const dbTheme = await this.prisma.theme.findUnique({
        where: { slug: this.activeTheme },
      });
      if (dbTheme) {
        await this.setup.runThemeSetup(this.activeTheme, dbTheme.id);
      }
    }
  }
}
