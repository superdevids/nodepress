import { z } from "zod";
import type { PrismaClient } from "@nodepressjs/db";

/**
 * Supported field types for content type definitions.
 */
export type FieldType =
  | "text"
  | "richtext"
  | "number"
  | "boolean"
  | "date"
  | "email"
  | "url"
  | "media"
  | "relation"
  | "select"
  | "multiselect"
  | "json"
  | "repeater";

export interface FieldDefinition {
  type: FieldType;
  label: string;
  required?: boolean;
  defaultValue?: unknown;
  placeholder?: string;
  instructions?: string;
  // Type-specific options
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
  multiple?: boolean;
  relation?: { to: string; many: boolean };
  fields?: Record<string, FieldDefinition>; // For repeater
}

export interface ContentTypeDefinition {
  name: string;
  label: { singular: string; plural: string };
  description?: string;
  fields: Record<string, FieldDefinition>;
  taxonomies?: string[];
  supports?: string[];
  menuIcon?: string;
  menuPosition?: number;
  showInMenu?: boolean;
  hasArchive?: boolean;
  publiclyQueryable?: boolean;
  excludeFromSearch?: boolean;
}

export interface ContentEntryData {
  id?: string;
  contentType: string;
  slug: string;
  title: string;
  status?: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  content: Record<string, unknown>;
  authorId?: string;
  publishedAt?: Date | null;
}

export interface ContentEntryResult {
  id: string;
  contentType: string;
  slug: string;
  title: string;
  status: string;
  content: Record<string, unknown>;
  authorId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function createField(type: FieldType) {
  return (def: Omit<FieldDefinition, "type">): FieldDefinition => ({
    ...def,
    type,
  });
}

/**
 * Field factory helpers for content type definitions.
 */
export const field = {
  text: createField("text"),
  richtext: createField("richtext"),
  number: createField("number"),
  boolean: createField("boolean"),
  date: createField("date"),
  email: createField("email"),
  url: createField("url"),
  media: createField("media"),
  relation: createField("relation"),
  select: createField("select"),
  multiselect: createField("multiselect"),
  json: createField("json"),
  repeater: createField("repeater"),
};

export function defineContentType(def: ContentTypeDefinition): ContentTypeDefinition {
  return def;
}

export class ContentEngine {
  private contentTypes: Map<string, ContentTypeDefinition> = new Map();
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Register a content type definition (code-first approach).
   */
  registerContentType(def: ContentTypeDefinition): void {
    if (this.contentTypes.has(def.name)) {
      throw new Error(`Content type "${def.name}" is already registered.`);
    }
    this.contentTypes.set(def.name, def);
  }

  /**
   * Get a registered content type by name.
   */
  getContentType(name: string): ContentTypeDefinition | undefined {
    return this.contentTypes.get(name);
  }

  /**
   * Get all registered content types.
   */
  getAllContentTypes(): ContentTypeDefinition[] {
    return Array.from(this.contentTypes.values());
  }

  /**
   * Create a new content entry.
   */
  async create(data: ContentEntryData): Promise<ContentEntryResult> {
    const entry = await this.prisma.contentEntry.create({
      data: {
        contentType: data.contentType,
        slug: data.slug,
        title: data.title,
        status: data.status ?? "DRAFT",
        content: data.content ?? {},
        authorId: data.authorId ?? null,
        publishedAt: data.publishedAt ?? null,
      },
    });
    return {
      id: entry.id,
      contentType: entry.contentType,
      slug: entry.slug,
      title: entry.title,
      status: entry.status,
      content: entry.content as Record<string, unknown>,
      authorId: entry.authorId,
      publishedAt: entry.publishedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  /**
   * Find a content entry by its ID.
   */
  async findById(id: string): Promise<ContentEntryResult | null> {
    try {
      const entry = await this.prisma.contentEntry.findUnique({ where: { id } });
      if (!entry) return null;
      return {
        id: entry.id,
        contentType: entry.contentType,
        slug: entry.slug,
        title: entry.title,
        status: entry.status,
        content: entry.content as Record<string, unknown>,
        authorId: entry.authorId,
        publishedAt: entry.publishedAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Find content entries by content type.
   */
  async findByType(
    contentType: string,
    options?: { status?: string; limit?: number; offset?: number }
  ): Promise<{ entries: ContentEntryResult[]; total: number }> {
    try {
      const where: Record<string, unknown> = { contentType };
      if (options?.status) where.status = options.status;

      const total = await this.prisma.contentEntry.count({ where: where as any });
      const entries = await this.prisma.contentEntry.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      });

      return {
        entries: entries.map((e) => ({
          id: e.id,
          contentType: e.contentType,
          slug: e.slug,
          title: e.title,
          status: e.status,
          content: e.content as Record<string, unknown>,
          authorId: e.authorId,
          publishedAt: e.publishedAt,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        })),
        total,
      };
    } catch {
      return { entries: [], total: 0 };
    }
  }

  /**
   * Update an existing content entry.
   */
  async update(id: string, data: Partial<ContentEntryData>): Promise<ContentEntryResult | null> {
    try {
      const entry = await this.prisma.contentEntry.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.content !== undefined && { content: data.content }),
          ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt }),
        },
      });
      return {
        id: entry.id,
        contentType: entry.contentType,
        slug: entry.slug,
        title: entry.title,
        status: entry.status,
        content: entry.content as Record<string, unknown>,
        authorId: entry.authorId,
        publishedAt: entry.publishedAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete a content entry by ID.
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.contentEntry.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a Zod schema for validation from a field definition.
   */
  generateValidationSchema(fields: Record<string, FieldDefinition>): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, def] of Object.entries(fields)) {
      let schema: z.ZodTypeAny;

      switch (def.type) {
        case "text":
        case "email":
        case "url":
        case "richtext":
          schema = z.string();
          if (def.required) schema = (schema as z.ZodString).min(1, `${def.label} is required`);
          break;
        case "number":
          schema = z.number();
          if (def.min !== undefined) schema = (schema as z.ZodNumber).min(def.min);
          if (def.max !== undefined) schema = (schema as z.ZodNumber).max(def.max);
          break;
        case "boolean":
          schema = z.boolean();
          break;
        case "date":
          schema = z.string().datetime().or(z.string().pipe(z.coerce.date()));
          break;
        case "media":
          schema = def.multiple ? z.array(z.string()) : z.string();
          break;
        case "relation":
          schema = def.relation?.many ? z.array(z.string()) : z.string();
          break;
        case "select":
          schema = z.string();
          if (def.options) schema = (schema as z.ZodString).refine(
            (val) => def.options?.some((o) => o.value === val),
            { message: `Invalid option for ${def.label}` },
          );
          break;
        case "multiselect":
          schema = z.array(z.string());
          break;
        case "json":
          schema = z.record(z.unknown());
          break;
        case "repeater":
          schema = z.array(z.record(z.unknown()));
          break;
        default:
          schema = z.unknown();
      }

      if (!def.required) {
        schema = schema.optional().nullable();
      }

      shape[key] = schema;
    }

    return z.object(shape);
  }
}
