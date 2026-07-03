import { existsSync, readdirSync } from "node:fs";
import type { PrismaClient } from "@nodepress/db";

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
  | "home"
  | "taxonomy"
  | "embed"
  | "attachment";

export interface TemplateResolutionContext {
  type: TemplateType;
  slug?: string;
  contentType?: string;
  taxonomy?: string;
  term?: string;
  authorSlug?: string;
  year?: number;
  month?: number;
  day?: number;
  format?: string;
  isFrontPage?: boolean;
  isHome?: boolean;
  isSticky?: boolean;
  isPrivate?: boolean;
  postPassword?: string;
}

export interface ResolvedTemplate {
  hierarchy: string[];
  finalTemplate: string;
}

export class TemplateHierarchyResolver {
  private prisma: PrismaClient;

  constructor(_prisma: PrismaClient) {
    this.prisma = _prisma;
  }

  /** Get the internal PrismaClient (used by ThemeEngine) */
  getPrisma(): PrismaClient {
    return this.prisma;
  }

  /**
   * Resolve the full WordPress-style template hierarchy.
   *
   * single-{type}-{slug}.tsx → single-{type}.tsx → single.tsx → page.tsx
   * archive-{type}.tsx → archive.tsx
   * taxonomy-{taxonomy}-{term}.tsx → taxonomy-{taxonomy}.tsx → taxonomy.tsx
   * author-{slug}.tsx → author.tsx
   * date-{year}-{month}.tsx → date-{year}.tsx → date.tsx
   * search.tsx → index.tsx
   * 404.tsx → index.tsx
   * embed.tsx → index.tsx
   */
  resolve(context: TemplateResolutionContext): ResolvedTemplate {
    const hierarchy = this.buildHierarchy(context);
    return {
      hierarchy,
      finalTemplate: hierarchy[0] ?? "index",
    };
  }

  private buildHierarchy(context: TemplateResolutionContext): string[] {
    const candidates: string[] = [];

    if (context.isFrontPage) {
      candidates.push("front-page");
    }

    if (context.isHome) {
      candidates.push("home");
    }

    switch (context.type) {
      case "single": {
        // single-{contentType}-{slug} → single-{contentType} → single → page
        if (context.contentType && context.slug) {
          candidates.push(`single-${context.contentType}-${context.slug}`);
        }
        if (context.contentType) {
          candidates.push(`single-${context.contentType}`);
        }
        if (context.slug) {
          candidates.push(`single-${context.slug}`);
        }
        if (context.format) {
          candidates.push(`single-${context.format}`);
        }
        candidates.push("single");
        candidates.push("page");
        break;
      }

      case "page": {
        // page-{slug} → page → single
        if (context.slug) {
          candidates.push(`page-${context.slug}`);
        }
        if (context.format) {
          candidates.push(`page-${context.format}`);
        }
        candidates.push("page");
        candidates.push("single");
        break;
      }

      case "archive": {
        // archive-{contentType} → archive
        if (context.contentType) {
          candidates.push(`archive-${context.contentType}`);
        }
        if (context.slug) {
          candidates.push(`archive-${context.slug}`);
        }
        candidates.push("archive");
        break;
      }

      case "category": {
        // category-{slug} → category → archive
        if (context.slug) {
          candidates.push(`category-${context.slug}`);
        }
        if (context.term) {
          candidates.push(`category-${context.term}`);
        }
        candidates.push("category");
        candidates.push("archive");
        break;
      }

      case "tag": {
        // tag-{slug} → tag → archive
        if (context.slug) {
          candidates.push(`tag-${context.slug}`);
        }
        if (context.term) {
          candidates.push(`tag-${context.term}`);
        }
        candidates.push("tag");
        candidates.push("archive");
        break;
      }

      case "taxonomy": {
        // taxonomy-{taxonomy}-{term} → taxonomy-{taxonomy} → taxonomy → archive
        if (context.taxonomy && context.term) {
          candidates.push(`taxonomy-${context.taxonomy}-${context.term}`);
        }
        if (context.taxonomy) {
          candidates.push(`taxonomy-${context.taxonomy}`);
        }
        if (context.slug) {
          candidates.push(`taxonomy-${context.slug}`);
        }
        candidates.push("taxonomy");
        candidates.push("archive");
        break;
      }

      case "author": {
        // author-{slug} → author
        if (context.authorSlug) {
          candidates.push(`author-${context.authorSlug}`);
        }
        if (context.slug) {
          candidates.push(`author-${context.slug}`);
        }
        candidates.push("author");
        candidates.push("archive");
        break;
      }

      case "date": {
        // date-{year}-{month} → date-{year} → date
        if (context.year !== undefined && context.month !== undefined) {
          candidates.push(`date-${context.year}-${String(context.month).padStart(2, "0")}`);
        }
        if (context.year !== undefined) {
          candidates.push(`date-${context.year}`);
        }
        if (context.day !== undefined) {
          candidates.push(`date-${context.year}-${String(context.month ?? 1).padStart(2, "0")}-${String(context.day).padStart(2, "0")}`);
        }
        candidates.push("date");
        candidates.push("archive");
        break;
      }

      case "search": {
        candidates.push("search");
        break;
      }

      case "404": {
        candidates.push("404");
        break;
      }

      case "embed": {
        candidates.push("embed");
        candidates.push("single");
        candidates.push("page");
        break;
      }

      case "attachment": {
        // attachment-{slug} → attachment → single
        if (context.slug) {
          candidates.push(`attachment-${context.slug}`);
        }
        if (context.contentType) {
          candidates.push(`attachment-${context.contentType}`);
        }
        candidates.push("attachment");
        candidates.push("single");
        break;
      }

      default: {
        candidates.push("index");
      }
    }

    // Always append index as final fallback
    if (!candidates.includes("index")) {
      candidates.push("index");
    }

    // Deduplicate while preserving order
    return [...new Set(candidates)];
  }

  /**
   * Get template file path candidates for a given context.
   * Returns file paths in priority order with proper extensions.
   */
  getTemplateFilePaths(context: TemplateResolutionContext, themeDir: string, extensions: string[] = ["tsx", "ts"]): string[] {
    const hierarchy = this.buildHierarchy(context);
    const paths: string[] = [];

    for (const template of hierarchy) {
      for (const ext of extensions) {
        paths.push(`${themeDir}/${template}.${ext}`);
      }
    }

    return paths;
  }

  /**
   * Get the best matching template for a content entry based on its data.
   */
  resolveForEntry(entry: {
    contentType?: { name: string };
    slug: string;
    template?: string | null;
    format?: string | null;
    isSticky?: boolean;
    postPassword?: string | null;
  }): ResolvedTemplate {
    const context: TemplateResolutionContext = {
      type: "single",
      contentType: entry.contentType?.name,
      slug: entry.slug,
      format: entry.format ?? undefined,
      isSticky: entry.isSticky,
      postPassword: entry.postPassword ?? undefined,
    };

    // If the entry has a custom template, use it as the primary candidate
    if (entry.template) {
      context.slug = entry.template;
    }

    return this.resolve(context);
  }

  /**
   * Check if a specific template file exists in the theme hierarchy.
   */
  templateExists(template: string, themeDir: string, extensions: string[] = ["tsx", "ts"]): string | null {
    for (const ext of extensions) {
      const filePath = `${themeDir}/${template}.${ext}`;
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  /**
   * Get the available templates in a theme directory.
   */
  getAvailableTemplates(themeDir: string, extensions: string[] = ["tsx", "ts"]): string[] {
    try {
      const files = readdirSync(themeDir);
      const templates: string[] = [];

      for (const file of files) {
        for (const ext of extensions) {
          if (file.endsWith(`.${ext}`)) {
            templates.push(file.slice(0, -(ext.length + 1)));
          }
        }
      }

      return templates;
    } catch {
      return [];
    }
  }
}
