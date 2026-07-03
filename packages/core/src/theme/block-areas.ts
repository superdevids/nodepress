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

export interface BlockAreaDefinition {
  slug: string;
  name: string;
  description?: string;
  defaultBlocks?: BlockContent[];
}

export interface BlockAreaRecord {
  id: string;
  themeId: string;
  slug: string;
  name: string;
  description: string | null;
  content: BlockContent | null;
  defaultBlocks: BlockContent[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export class BlockAreasManager {
  private prisma: PrismaClient;
  private areas: Map<string, BlockAreaDefinition> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  registerBlockArea(themeSlug: string, def: BlockAreaDefinition): void {
    const key = `${themeSlug}:${def.slug}`;
    if (this.areas.has(key)) {
      throw new Error(`Block area "${def.slug}" already registered for theme "${themeSlug}".`);
    }
    this.areas.set(key, def);
  }

  getDefinition(themeSlug: string, slug: string): BlockAreaDefinition | undefined {
    return this.areas.get(`${themeSlug}:${slug}`);
  }

  getAllDefinitions(themeSlug: string): BlockAreaDefinition[] {
    return Array.from(this.areas.entries())
      .filter(([key]) => key.startsWith(`${themeSlug}:`))
      .map(([, def]) => def);
  }

  async getContent(themeId: string, slug: string): Promise<BlockContent | null> {
    const record = await this.prisma.blockArea.findUnique({
      where: { themeId_slug: { themeId, slug } },
    });
    if (!record) return null;

    if (record.content) {
      return record.content as unknown as BlockContent;
    }
    return (record.defaultBlocks as unknown as BlockContent[])?.[0] ?? null;
  }

  async saveContent(themeId: string, slug: string, content: BlockContent): Promise<BlockAreaRecord> {
    const record = await this.prisma.blockArea.upsert({
      where: { themeId_slug: { themeId, slug } },
      update: { content: content as unknown as Record<string, unknown> },
      create: {
        themeId,
        slug,
        name: slug,
        content: content as unknown as Record<string, unknown>,
      },
    });
    return record as unknown as BlockAreaRecord;
  }

  async syncAreaDefinitions(themeId: string, definitions: BlockAreaDefinition[]): Promise<void> {
    for (const def of definitions) {
      await this.prisma.blockArea.upsert({
        where: { themeId_slug: { themeId, slug: def.slug } },
        update: {
          name: def.name,
          description: def.description,
          defaultBlocks: (def.defaultBlocks ?? []) as unknown as Record<string, unknown>[],
        },
        create: {
          themeId,
          slug: def.slug,
          name: def.name,
          description: def.description,
          defaultBlocks: (def.defaultBlocks ?? []) as unknown as Record<string, unknown>[],
        },
      });
    }
  }

  async findAllByTheme(themeId: string): Promise<BlockAreaRecord[]> {
    const records = await this.prisma.blockArea.findMany({
      where: { themeId },
      orderBy: { updatedAt: "desc" },
    });
    return records as unknown as BlockAreaRecord[];
  }

  async deleteArea(themeId: string, slug: string): Promise<void> {
    await this.prisma.blockArea.delete({
      where: { themeId_slug: { themeId, slug } },
    });
  }
}

export class BlockAreaRenderer {
  async render(_slug: string, content: BlockContent | null): Promise<string> {
    if (!content) return "";

    return this.renderBlockContent(content);
  }

  private renderBlockContent(content: BlockContent): string {
    const parts = content.content.map((node) => this.renderNode(node));
    return `<div class="block-area">${parts.join("")}</div>`;
  }

  private renderNode(node: { type: string; attrs?: Record<string, unknown>; content?: unknown[]; text?: string }): string {
    switch (node.type) {
      case "paragraph":
        return `<p>${node.content?.map((n) => this.renderNode(n as Parameters<typeof this.renderNode>[0])).join("") ?? node.text ?? ""}</p>`;
      case "heading":
        const level = (node.attrs?.level as number) ?? 2;
        return `<h${level}>${node.content?.map((n) => this.renderNode(n as Parameters<typeof this.renderNode>[0])).join("") ?? ""}</h${level}>`;
      case "text":
        return node.text ?? "";
      case "bulletList":
        return `<ul>${node.content?.map((n) => this.renderNode(n as Parameters<typeof this.renderNode>[0])).join("") ?? ""}</ul>`;
      case "orderedList":
        return `<ol>${node.content?.map((n) => this.renderNode(n as Parameters<typeof this.renderNode>[0])).join("") ?? ""}</ol>`;
      case "listItem":
        return `<li>${node.content?.map((n) => this.renderNode(n as Parameters<typeof this.renderNode>[0])).join("") ?? ""}</li>`;
      default:
        return "";
    }
  }
}
