import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentEngine, defineContentType, field } from '../content/content-engine.js';

const mockPrisma = {
  contentEntry: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

const postType = defineContentType({
  name: 'post',
  label: { singular: 'Post', plural: 'Posts' },
  fields: {
    title: field.text({ label: 'Title', required: true }),
    body: field.richtext({ label: 'Body' }),
    rating: field.number({ label: 'Rating', min: 1, max: 5 }),
    published: field.boolean({ label: 'Published' }),
    category: field.select({
      label: 'Category',
      options: [
        { label: 'News', value: 'news' },
        { label: 'Tutorial', value: 'tutorial' },
      ],
    }),
    tags: field.multiselect({ label: 'Tags' }),
  },
});

describe('ContentEngine', () => {
  let engine: ContentEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ContentEngine(mockPrisma as any);
  });

  describe('registerContentType', () => {
    it('registers a content type', () => {
      engine.registerContentType(postType);
      expect(engine.getContentType('post')).toEqual(postType);
    });

    it('throws when registering a duplicate content type', () => {
      engine.registerContentType(postType);
      expect(() => engine.registerContentType(postType)).toThrow(
        'Content type "post" is already registered.',
      );
    });

    it('returns all registered content types', () => {
      const pageType = defineContentType({
        name: 'page',
        label: { singular: 'Page', plural: 'Pages' },
        fields: { title: field.text({ label: 'Title' }) },
      });
      engine.registerContentType(postType);
      engine.registerContentType(pageType);
      expect(engine.getAllContentTypes()).toHaveLength(2);
    });
  });

  describe('generateValidationSchema', () => {
    it('generates a Zod schema from field definitions', () => {
      const schema = engine.generateValidationSchema(postType.fields);
      expect(schema).toBeDefined();
    });

    it('validates required fields', () => {
      const schema = engine.generateValidationSchema(postType.fields);
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('validates correct data', () => {
      const schema = engine.generateValidationSchema(postType.fields);
      const result = schema.safeParse({
        title: 'Hello World',
        rating: 4,
        published: true,
        category: 'news',
        tags: ['javascript'],
      });
      expect(result.success).toBe(true);
    });

    it('validates number constraints (min/max)', () => {
      const schema = engine.generateValidationSchema(postType.fields);
      const belowMin = schema.safeParse({ title: 'Test', rating: 0 });
      expect(belowMin.success).toBe(false);
      const aboveMax = schema.safeParse({ title: 'Test', rating: 6 });
      expect(aboveMax.success).toBe(false);
    });

    it('validates select option values', () => {
      const schema = engine.generateValidationSchema(postType.fields);
      const invalid = schema.safeParse({ title: 'Test', category: 'invalid' });
      expect(invalid.success).toBe(false);
    });
  });

  describe('CRUD operations', () => {
    const mockEntry = {
      id: 'entry-1',
      contentType: 'post',
      slug: 'hello-world',
      title: 'Hello World',
      status: 'DRAFT',
      content: { body: 'Hello' },
      authorId: 'user-1',
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    describe('create', () => {
      it('creates a content entry', async () => {
        mockPrisma.contentEntry.create.mockResolvedValue(mockEntry);
        const result = await engine.create({
          contentType: 'post',
          slug: 'hello-world',
          title: 'Hello World',
          content: { body: 'Hello' },
          authorId: 'user-1',
        });
        expect(result.id).toBe('entry-1');
        expect(mockPrisma.contentEntry.create).toHaveBeenCalledWith({
          data: {
            contentType: 'post',
            slug: 'hello-world',
            title: 'Hello World',
            status: 'DRAFT',
            content: { body: 'Hello' },
            authorId: 'user-1',
            publishedAt: null,
          },
        });
      });
    });

    describe('findById', () => {
      it('finds an entry by id', async () => {
        mockPrisma.contentEntry.findUnique.mockResolvedValue(mockEntry);
        const result = await engine.findById('entry-1');
        expect(result?.id).toBe('entry-1');
        expect(mockPrisma.contentEntry.findUnique).toHaveBeenCalledWith({
          where: { id: 'entry-1' },
        });
      });

      it('returns null when entry is not found', async () => {
        mockPrisma.contentEntry.findUnique.mockResolvedValue(null);
        const result = await engine.findById('nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('findByType', () => {
      it('returns entries by content type', async () => {
        mockPrisma.contentEntry.count.mockResolvedValue(1);
        mockPrisma.contentEntry.findMany.mockResolvedValue([mockEntry]);
        const result = await engine.findByType('post');
        expect(result.total).toBe(1);
        expect(result.entries).toHaveLength(1);
      });

      it('filters by status', async () => {
        mockPrisma.contentEntry.count.mockResolvedValue(1);
        mockPrisma.contentEntry.findMany.mockResolvedValue([mockEntry]);
        await engine.findByType('post', { status: 'PUBLISHED' });
        expect(mockPrisma.contentEntry.count).toHaveBeenCalledWith({
          where: { contentType: 'post', status: 'PUBLISHED' },
        });
      });
    });

    describe('update', () => {
      it('updates a content entry', async () => {
        mockPrisma.contentEntry.update.mockResolvedValue({
          ...mockEntry,
          title: 'Updated Title',
          status: 'PUBLISHED',
        });
        const result = await engine.update('entry-1', {
          title: 'Updated Title',
          status: 'PUBLISHED' as any,
        });
        expect(result?.title).toBe('Updated Title');
        expect(result?.status).toBe('PUBLISHED');
      });
    });

    describe('delete', () => {
      it('deletes a content entry', async () => {
        mockPrisma.contentEntry.delete.mockResolvedValue(mockEntry);
        const result = await engine.delete('entry-1');
        expect(result).toBe(true);
        expect(mockPrisma.contentEntry.delete).toHaveBeenCalledWith({
          where: { id: 'entry-1' },
        });
      });

      it('returns false when deletion fails', async () => {
        mockPrisma.contentEntry.delete.mockRejectedValue(new Error('Not found'));
        const result = await engine.delete('nonexistent');
        expect(result).toBe(false);
      });
    });
  });
});
