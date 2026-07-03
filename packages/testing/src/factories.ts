/**
 * Factory system for creating test data with sensible defaults.
 * Supports builder pattern for complex object relationships.
 */

import { faker } from "@faker-js/faker";
import { getPrismaClient } from "@nodepress/db";
import type { PrismaClient, Role, EntryStatus, CommentStatus, ContentTypeSource } from "@nodepress/db";

function getClient(prisma?: PrismaClient): PrismaClient {
  return prisma ?? getPrismaClient();
}

export type UserInput = Partial<{
  email: string;
  passwordHash: string;
  name: string;
  displayName: string;
  biography: string;
  websiteUrl: string;
  locale: string;
  role: Role;
  capabilities: string[];
  avatar: string;
  userStatus: number;
  forcePasswordChange: boolean;
}>;

export type EntryInput = Partial<{
  contentTypeId: string;
  slug: string;
  status: EntryStatus;
  data: Record<string, unknown>;
  seo: Record<string, unknown>;
  authorId: string;
  publishedAt: Date;
  excerpt: string;
  featuredImageId: string;
  commentStatus: string;
  pingStatus: string;
  postPassword: string;
  menuOrder: number;
  isSticky: boolean;
  postFormat: string;
  template: string;
  customCss: string;
  customJs: string;
}>;

export type TermInput = Partial<{
  taxonomyId: string;
  name: string;
  slug: string;
  parentId: string;
  description: string;
  termGroup: number;
  termOrder: number;
}>;

export type MediaInput = Partial<{
  url: string;
  sizes: Record<string, unknown>;
  mimeType: string;
  altText: string;
  caption: string;
  title: string;
  description: string;
  width: number;
  height: number;
  fileSize: number;
  focalPoint: Record<string, unknown>;
  customSizes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  uploadedBy: string;
}>;

export type CommentInput = Partial<{
  entryId: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  status: CommentStatus;
  parentId: string;
  userAgent: string;
  ipAddress: string;
  rating: number;
  commentType: string;
}>;

export type ContentTypeInput = Partial<{
  name: string;
  label: Record<string, string>;
  fields: Record<string, unknown>;
  supports: string[];
  source: ContentTypeSource;
  menuIcon: string;
  menuPosition: number;
  showInMenu: boolean;
  hasArchive: boolean;
  publiclyQueryable: boolean;
  excludeFromSearch: boolean;
}>;

interface EntryBuilder {
  withAuthor(userId: string): EntryBuilder;
  withTerms(termIds: string[]): Promise<EntryBuilder>;
  withFeaturedImage(mediaId: string): EntryBuilder;
  withMeta(key: string, value: unknown): Promise<EntryBuilder>;
  save(): Promise<import("@nodepress/db").ContentEntry>;
}

export async function createUser(overrides: UserInput = {}, prisma?: PrismaClient): Promise<import("@nodepress/db").User> {
  const client = getClient(prisma);
  return client.user.create({
    data: {
      email: overrides.email ?? faker.internet.email(),
      passwordHash: overrides.passwordHash ?? `$2a$12$${faker.string.alphanumeric(53)}`,
      name: overrides.name ?? faker.person.fullName(),
      displayName: overrides.displayName ?? faker.person.firstName(),
      biography: overrides.biography ?? faker.lorem.sentence(),
      websiteUrl: overrides.websiteUrl ?? faker.internet.url(),
      locale: overrides.locale ?? "en_US",
      role: overrides.role ?? "SUBSCRIBER",
      capabilities: overrides.capabilities ?? [],
      avatar: overrides.avatar ?? faker.image.avatar(),
      userStatus: overrides.userStatus ?? 0,
      forcePasswordChange: overrides.forcePasswordChange ?? false,
    },
  });
}

export async function createContentType(overrides: ContentTypeInput = {}, prisma?: PrismaClient): Promise<import("@nodepress/db").ContentType> {
  const client = getClient(prisma);
  return client.contentType.create({
    data: {
      name: overrides.name ?? faker.helpers.slugify(faker.lorem.word()),
      label: overrides.label ?? { singular: faker.lorem.word(), plural: faker.lorem.words(2) },
      fields: overrides.fields ?? {
        title: { type: "text", label: "Title", required: true },
        body: { type: "richtext", label: "Content" },
      },
      supports: overrides.supports ?? ["revisions", "comments", "author"],
      source: overrides.source ?? "CODE",
      menuIcon: overrides.menuIcon,
      menuPosition: overrides.menuPosition ?? 10,
      showInMenu: overrides.showInMenu ?? true,
      hasArchive: overrides.hasArchive ?? true,
      publiclyQueryable: overrides.publiclyQueryable ?? true,
      excludeFromSearch: overrides.excludeFromSearch ?? false,
    },
  });
}

export async function createEntry(overrides: EntryInput = {}, prisma?: PrismaClient): Promise<import("@nodepress/db").ContentEntry> {
  const client = getClient(prisma);
  return client.contentEntry.create({
    data: {
      contentTypeId: overrides.contentTypeId ?? (await createContentType(undefined, client)).id,
      slug: overrides.slug ?? faker.helpers.slugify(faker.lorem.slug(3)),
      status: overrides.status ?? "DRAFT",
      data: overrides.data ?? { title: faker.lorem.sentence(), body: faker.lorem.paragraphs(3) },
      seo: overrides.seo,
      authorId: overrides.authorId ?? (await createUser(undefined, client)).id,
      publishedAt: overrides.publishedAt,
      excerpt: overrides.excerpt ?? faker.lorem.sentence(),
      featuredImageId: overrides.featuredImageId,
      commentStatus: overrides.commentStatus ?? "open",
      pingStatus: overrides.pingStatus ?? "open",
      postPassword: overrides.postPassword,
      menuOrder: overrides.menuOrder ?? 0,
      isSticky: overrides.isSticky ?? false,
      postFormat: overrides.postFormat,
      template: overrides.template,
      customCss: overrides.customCss,
      customJs: overrides.customJs,
    },
  });
}

createEntry.withAuthor = function (userId: string) {
  return {
    withAuthor: () => this,
    withTerms: async () => this,
    withFeaturedImage: () => this,
    withMeta: async () => this,
    save: async () => {
      throw new Error("Use createEntryBuilder() instead");
    },
  } as unknown as EntryBuilder;
};

export function createEntryBuilder(overrides: EntryInput = {}, prisma?: PrismaClient): EntryBuilder {
  const client = getClient(prisma);
  const state: {
    authorId?: string;
    termIds?: string[];
    featuredImageId?: string;
    meta?: Record<string, unknown>;
  } = {};

  const builder: EntryBuilder = {
    withAuthor(authorId: string) {
      state.authorId = authorId;
      return builder;
    },
    async withTerms(termIds: string[]) {
      state.termIds = termIds;
      return builder;
    },
    withFeaturedImage(mediaId: string) {
      state.featuredImageId = mediaId;
      return builder;
    },
    async withMeta(key: string, value: unknown) {
      state.meta = { ...state.meta, [key]: value };
      return builder;
    },
    async save() {
      const entry = await client.contentEntry.create({
        data: {
          contentTypeId: overrides.contentTypeId ?? (await createContentType(undefined, client)).id,
          slug: overrides.slug ?? faker.helpers.slugify(faker.lorem.slug(3)),
          status: overrides.status ?? "DRAFT",
          data: overrides.data ?? { title: faker.lorem.sentence(), body: faker.lorem.paragraphs(3) },
          authorId: state.authorId ?? overrides.authorId ?? (await createUser(undefined, client)).id,
          excerpt: overrides.excerpt ?? faker.lorem.sentence(),
          featuredImageId: state.featuredImageId ?? overrides.featuredImageId,
          isSticky: overrides.isSticky ?? false,
        },
      });

      if (state.termIds && state.termIds.length > 0) {
        for (const termId of state.termIds) {
          await client.termRelation.create({
            data: { entryId: entry.id, termId },
          });
        }
      }

      if (state.meta) {
        for (const [key, value] of Object.entries(state.meta)) {
          await client.contentMeta.create({
            data: { entryId: entry.id, key, value },
          });
        }
      }

      return entry;
    },
  };

  return builder;
}

export async function createTerm(overrides: TermInput = {}, prisma?: PrismaClient): Promise<import("@nodepress/db").Term> {
  const client = getClient(prisma);
  return client.term.create({
    data: {
      taxonomyId: overrides.taxonomyId,
      name: overrides.name ?? faker.lorem.word(),
      slug: overrides.slug ?? faker.helpers.slugify(faker.lorem.word()),
      parentId: overrides.parentId,
      description: overrides.description ?? faker.lorem.sentence(),
      termGroup: overrides.termGroup ?? 0,
      termOrder: overrides.termOrder ?? 0,
    },
  });
}

export async function createMedia(overrides: MediaInput = {}, prisma?: PrismaClient): Promise<import("@nodepress/db").Media> {
  const client = getClient(prisma);
  return client.media.create({
    data: {
      url: overrides.url ?? faker.image.url(),
      sizes: overrides.sizes ?? { thumbnail: "150x150", medium: "300x300", large: "1024x1024" },
      mimeType: overrides.mimeType ?? "image/jpeg",
      altText: overrides.altText ?? faker.lorem.words(3),
      caption: overrides.caption ?? faker.lorem.sentence(),
      title: overrides.title ?? faker.lorem.sentence(),
      description: overrides.description ?? faker.lorem.paragraph(),
      width: overrides.width ?? faker.number.int({ min: 400, max: 4000 }),
      height: overrides.height ?? faker.number.int({ min: 300, max: 3000 }),
      fileSize: overrides.fileSize ?? faker.number.int({ min: 1000, max: 5000000 }),
      focalPoint: overrides.focalPoint,
      customSizes: overrides.customSizes,
      metadata: overrides.metadata ?? { ip: faker.internet.ip(), originalName: faker.system.fileName() },
      uploadedBy: overrides.uploadedBy ?? (await createUser(undefined, client)).id,
    },
  });
}

export async function createComment(overrides: CommentInput = {}, prisma?: PrismaClient): Promise<import("@nodepress/db").Comment> {
  const client = getClient(prisma);
  return client.comment.create({
    data: {
      entryId: overrides.entryId,
      userId: overrides.userId,
      authorName: overrides.authorName ?? faker.person.fullName(),
      authorEmail: overrides.authorEmail ?? faker.internet.email(),
      content: overrides.content ?? faker.lorem.paragraph(),
      status: overrides.status ?? "APPROVED",
      parentId: overrides.parentId,
      userAgent: overrides.userAgent ?? faker.internet.userAgent(),
      ipAddress: overrides.ipAddress ?? faker.internet.ip(),
      rating: overrides.rating,
      commentType: overrides.commentType ?? "comment",
    },
  });
}

export async function createTaxonomy(overrides: Partial<{ name: string; hierarchical: boolean }> = {}, prisma?: PrismaClient): Promise<import("@nodepress/db").Taxonomy> {
  const client = getClient(prisma);
  return client.taxonomy.create({
    data: {
      name: overrides.name ?? faker.helpers.slugify(faker.lorem.word()),
      hierarchical: overrides.hierarchical ?? false,
    },
  });
}
