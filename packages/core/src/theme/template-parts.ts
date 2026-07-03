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

export interface TemplatePartDefinition {
  slug: string;
  name: string;
  area: "header" | "footer" | "sidebar" | "general";
  content?: BlockContent;
}

export interface TemplatePartRecord {
  id: string;
  themeId: string;
  slug: string;
  name: string;
  area: string;
  content: BlockContent | null;
  source: "theme" | "user";
  createdAt: Date;
  updatedAt: Date;
}

export class TemplatePartsManager {
  private prisma: PrismaClient;
  private parts: Map<string, TemplatePartDefinition> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  registerTemplatePart(themeSlug: string, def: TemplatePartDefinition): void {
    const key = `${themeSlug}:${def.slug}`;
    if (this.parts.has(key)) {
      throw new Error(`Template part "${def.slug}" already registered for theme "${themeSlug}".`);
    }
    this.parts.set(key, def);
  }

  getDefinition(themeSlug: string, slug: string): TemplatePartDefinition | undefined {
    return this.parts.get(`${themeSlug}:${slug}`);
  }

  getAllDefinitions(themeSlug: string): TemplatePartDefinition[] {
    return Array.from(this.parts.entries())
      .filter(([key]) => key.startsWith(`${themeSlug}:`))
      .map(([, def]) => def);
  }

  async getContent(themeId: string, slug: string): Promise<BlockContent | null> {
    const userPart = await this.prisma.templatePart.findFirst({
      where: { themeId, slug, source: "user" },
    });
    if (userPart?.content) {
      return userPart.content as unknown as BlockContent;
    }

    const themePart = await this.prisma.templatePart.findFirst({
      where: { themeId, slug, source: "theme" },
    });
    return (themePart?.content as unknown as BlockContent) ?? null;
  }

  async saveContent(themeId: string, slug: string, content: BlockContent): Promise<TemplatePartRecord> {
    const result = await this.prisma.templatePart.upsert({
      where: { themeId_slug: { themeId, slug } },
      update: { content: content as unknown as Record<string, unknown>, source: "user" },
      create: {
        themeId,
        slug,
        name: slug,
        content: content as unknown as Record<string, unknown>,
        source: "user",
      },
    });
    return result as unknown as TemplatePartRecord;
  }

  async syncThemeParts(themeId: string, definitions: TemplatePartDefinition[]): Promise<void> {
    for (const def of definitions) {
      await this.prisma.templatePart.upsert({
        where: { themeId_slug: { themeId, slug: def.slug } },
        update: { name: def.name, area: def.area },
        create: {
          themeId,
          slug: def.slug,
          name: def.name,
          area: def.area,
          source: "theme",
        },
      });
    }
  }

  async findByArea(themeId: string, area: string): Promise<TemplatePartRecord[]> {
    const parts = await this.prisma.templatePart.findMany({
      where: { themeId, area },
      orderBy: { updatedAt: "desc" },
    });
    return parts as unknown as TemplatePartRecord[];
  }

  async delete(themeId: string, slug: string): Promise<void> {
    await this.prisma.templatePart.deleteMany({
      where: { themeId, slug, source: "user" },
    });
  }
}
