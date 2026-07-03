import type { PrismaClient } from "@nodepress/db";

export interface BlockNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: BlockNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface BlockContent {
  type: "doc";
  content: BlockNode[];
}

export interface BlockPatternDefinition {
  name: string;
  title: string;
  categories: string[];
  content: BlockContent[];
  previewImage?: string;
  keywords?: string[];
}

export interface BlockPatternRecord {
  id: string;
  themeId: string | null;
  name: string;
  title: string;
  categories: string[];
  content: BlockContent[];
  previewImage: string | null;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type BlockPatternCategory = "header" | "hero" | "pricing" | "footer" | "call-to-action" | "testimonials" | "features" | "custom";

export interface BlockPatternCategoryDef {
  name: string;
  label: string;
  icon?: string;
  priority: number;
}

const DEFAULT_CATEGORIES: BlockPatternCategoryDef[] = [
  { name: "header", label: "Headers", icon: "layout-header", priority: 10 },
  { name: "hero", label: "Heros", icon: "layout-hero", priority: 20 },
  { name: "pricing", label: "Pricing", icon: "dollar-sign", priority: 30 },
  { name: "footer", label: "Footers", icon: "layout-footer", priority: 40 },
  { name: "call-to-action", label: "Call to Action", icon: "megaphone", priority: 50 },
  { name: "testimonials", label: "Testimonials", icon: "message-square-quote", priority: 60 },
  { name: "features", label: "Features", icon: "list-checks", priority: 70 },
];

export class BlockPatternsManager {
  private prisma: PrismaClient;
  private patterns: Map<string, BlockPatternDefinition> = new Map();
  private categories: Map<string, BlockPatternCategoryDef> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    for (const cat of DEFAULT_CATEGORIES) {
      this.categories.set(cat.name, cat);
    }
  }

  registerPattern(def: BlockPatternDefinition): void {
    if (this.patterns.has(def.name)) {
      throw new Error(`Block pattern "${def.name}" is already registered.`);
    }
    this.patterns.set(def.name, def);
  }

  registerCategory(def: BlockPatternCategoryDef): void {
    this.categories.set(def.name, def);
  }

  getPattern(name: string): BlockPatternDefinition | undefined {
    return this.patterns.get(name);
  }

  getAllPatterns(): BlockPatternDefinition[] {
    return Array.from(this.patterns.values());
  }

  getPatternsByCategory(category: string): BlockPatternDefinition[] {
    return Array.from(this.patterns.values()).filter((p) => p.categories.includes(category));
  }

  getCategories(): BlockPatternCategoryDef[] {
    return Array.from(this.categories.values()).sort((a, b) => a.priority - b.priority);
  }

  async persistPattern(def: BlockPatternDefinition, themeId?: string): Promise<BlockPatternRecord> {
    const record = await this.prisma.blockPattern.upsert({
      where: { name: def.name },
      update: {
        title: def.title,
        categories: def.categories,
        content: def.content as unknown as Record<string, unknown>[],
        previewImage: def.previewImage,
        keywords: def.keywords ?? [],
        themeId: themeId ?? null,
      },
      create: {
        name: def.name,
        title: def.title,
        categories: def.categories,
        content: def.content as unknown as Record<string, unknown>[],
        previewImage: def.previewImage,
        keywords: def.keywords ?? [],
        themeId: themeId ?? null,
      },
    });
    return record as unknown as BlockPatternRecord;
  }

  async getPersistedPatterns(themeId?: string): Promise<BlockPatternRecord[]> {
    const where: Record<string, unknown> = {};
    if (themeId) {
      where.themeId = themeId;
    }
    const records = await this.prisma.blockPattern.findMany({ where, orderBy: { updatedAt: "desc" } });
    return records as unknown as BlockPatternRecord[];
  }

  async deletePattern(name: string): Promise<void> {
    await this.prisma.blockPattern.delete({ where: { name } });
    this.patterns.delete(name);
  }

  async seedDefaultPatterns(): Promise<void> {
    const defaults: BlockPatternDefinition[] = [
      {
        name: "default-header",
        title: "Default Header",
        categories: ["header"],
        content: [
          {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Site Logo & Navigation" }] },
            ],
          },
        ],
        keywords: ["header", "navigation", "menu"],
      },
      {
        name: "default-hero",
        title: "Default Hero",
        categories: ["hero", "call-to-action"],
        content: [
          {
            type: "doc",
            content: [
              { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to NodePress" }] },
              { type: "paragraph", content: [{ type: "text", text: "A modern CMS built with Node.js and TypeScript." }] },
            ],
          },
        ],
        keywords: ["hero", "welcome", "cta"],
      },
      {
        name: "simple-footer",
        title: "Simple Footer",
        categories: ["footer"],
        content: [
          {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "© 2026 NodePress. All rights reserved." }] },
            ],
          },
        ],
        keywords: ["footer", "copyright"],
      },
      {
        name: "features-grid",
        title: "Features Grid",
        categories: ["features"],
        content: [
          {
            type: "doc",
            content: [
              { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Features" }] },
              { type: "paragraph", content: [{ type: "text", text: "Feature 1 description here." }] },
              { type: "paragraph", content: [{ type: "text", text: "Feature 2 description here." }] },
              { type: "paragraph", content: [{ type: "text", text: "Feature 3 description here." }] },
            ],
          },
        ],
        keywords: ["features", "grid", "columns"],
      },
      {
        name: "testimonial-card",
        title: "Testimonial Card",
        categories: ["testimonials"],
        content: [
          {
            type: "doc",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "“This product changed our business!”" }] },
              { type: "paragraph", content: [{ type: "text", text: "— Happy Customer" }] },
            ],
          },
        ],
        keywords: ["testimonial", "quote", "review"],
      },
      {
        name: "pricing-table",
        title: "Pricing Table",
        categories: ["pricing"],
        content: [
          {
            type: "doc",
            content: [
              { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Pricing Plans" }] },
              { type: "paragraph", content: [{ type: "text", text: "Free: $0/mo | Pro: $29/mo | Enterprise: Contact us" }] },
            ],
          },
        ],
        keywords: ["pricing", "plans", "subscription"],
      },
    ];

    for (const pattern of defaults) {
      try {
        await this.persistPattern(pattern);
        this.registerPattern(pattern);
      } catch {
        // Pattern already exists
      }
    }
  }
}
