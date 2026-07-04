import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  contentType: {
    findFirst: vi.fn(),
  },
  contentEntry: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

const mockNotificationsService = {
  createForUsers: vi.fn(),
};

const { ContentService } = await import('../content.service.js');

describe('ContentService Integration Scenarios', () => {
  let contentService: ContentService;

  beforeEach(() => {
    vi.clearAllMocks();
    contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);
  });

  const mockContentType = { id: 'ct-1', name: 'post' };
  const mockPageType = { id: 'ct-2', name: 'page' };

  // Full create -> publish flow
  describe('Full create -> publish flow', () => {
    it('creates content as draft and then publishes it', async () => {
      // Step 1: Create a draft
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);

      const draftEntry = {
        id: 'entry-draft',
        contentTypeId: 'ct-1',
        slug: 'my-article',
        status: 'DRAFT',
        data: {
          title: 'My Article',
          content: '<p>Draft content</p>',
          tags: [],
          parentId: null,
          featured: false,
          viewCount: 0,
        },
        excerpt: '<p>Draft content</p>'.substring(0, 240),
        authorId: 'user-1',
        publishedAt: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        contentType: { name: 'post' },
      };
      mockPrisma.contentEntry.create.mockResolvedValue(draftEntry);

      const draft = await contentService.create(
        'post',
        {
          title: 'My Article',
          content: '<p>Draft content</p>',
        } as any,
        'user-1',
      );

      expect(draft.status).toBe('draft');
      expect(draft.publishedAt).toBeNull();

      // Step 2: Publish the draft
      const publishedEntry = {
        ...draftEntry,
        status: 'PUBLISHED',
        publishedAt: new Date('2024-01-02'),
        data: { ...draftEntry.data, title: 'My Article' },
      };
      mockPrisma.contentEntry.findUnique.mockResolvedValue(draftEntry);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Author',
        displayName: 'author',
      });
      mockPrisma.contentEntry.update.mockResolvedValue(publishedEntry);

      const published = await contentService.update(
        'entry-draft',
        { status: 'publish', title: 'My Article' } as any,
        'user-1',
        'ADMIN',
      );

      expect(published.status).toBe('publish');
      expect(published.publishedAt).toBeDefined();
    });

    it('creates content directly as published', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const publishedEntry = {
        id: 'entry-pub',
        contentTypeId: 'ct-1',
        slug: 'direct-publish',
        status: 'PUBLISHED',
        data: {
          title: 'Direct Publish',
          content: '<p>Live</p>',
          tags: [],
          parentId: null,
          featured: false,
          viewCount: 0,
        },
        excerpt: '<p>Live</p>',
        authorId: 'user-1',
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      };
      mockPrisma.contentEntry.create.mockResolvedValue(publishedEntry);
      // Setup for notifyContentPublished - needs author lookup and admin users lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Author',
        displayName: 'author',
      });
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);
      mockNotificationsService.createForUsers.mockResolvedValue(undefined);

      const result = await contentService.create(
        'post',
        {
          title: 'Direct Publish',
          content: '<p>Live</p>',
          status: 'publish',
        } as any,
        'user-1',
      );

      expect(result.status).toBe('publish');
      expect(result.publishedAt).toBeDefined();
      // Should notify admins (async, fire-and-forget)
      await vi.waitFor(() => {
        expect(mockNotificationsService.createForUsers).toHaveBeenCalled();
      });
    });
  });

  // Create with taxonomy assignments
  describe('Create with taxonomy assignments', () => {
    it('stores content with taxonomy terms in data field', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const entryWithTerms = {
        id: 'entry-tax',
        contentTypeId: 'ct-1',
        slug: 'tagged-post',
        status: 'DRAFT',
        data: {
          title: 'Tagged Post',
          content: '<p>Has categories and tags</p>',
          tags: ['javascript', 'typescript', 'nodejs'],
          categories: ['programming'],
          parentId: null,
          featured: false,
          viewCount: 0,
        },
        excerpt: '<p>Has categories and tags</p>',
        authorId: 'user-1',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      };
      mockPrisma.contentEntry.create.mockResolvedValue(entryWithTerms);

      const result = await contentService.create(
        'post',
        {
          title: 'Tagged Post',
          content: '<p>Has categories and tags</p>',
          tags: ['javascript', 'typescript', 'nodejs'],
          categories: ['programming'],
        } as any,
        'user-1',
      );

      expect(result.tags).toContain('javascript');
      expect(result.tags).toContain('typescript');
    });

    it('creates content with empty tags array', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const entryNoTags = {
        id: 'entry-notags',
        contentTypeId: 'ct-1',
        slug: 'no-tags',
        status: 'DRAFT',
        data: {
          title: 'No Tags',
          content: '<p>Content without tags</p>',
          tags: [],
          parentId: null,
          featured: false,
          viewCount: 0,
        },
        excerpt: '<p>Content without tags</p>',
        authorId: 'user-1',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      };
      mockPrisma.contentEntry.create.mockResolvedValue(entryNoTags);

      const result = await contentService.create(
        'post',
        {
          title: 'No Tags',
          content: '<p>Content without tags</p>',
        } as any,
        'user-1',
      );

      expect(result.tags).toEqual([]);
    });
  });

  // Create with featured image
  describe('Create with featured image', () => {
    it('creates content with featured image reference', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const entryWithImage = {
        id: 'entry-img',
        contentTypeId: 'ct-1',
        slug: 'featured-image-post',
        status: 'DRAFT',
        data: {
          title: 'Featured Image Post',
          content: '<p>Post with image</p>',
          tags: [],
          parentId: null,
          featured: true,
          viewCount: 0,
          featuredImageId: 'media-1',
        },
        excerpt: '<p>Post with image</p>',
        authorId: 'user-1',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      };
      mockPrisma.contentEntry.create.mockResolvedValue(entryWithImage);

      const result = await contentService.create(
        'post',
        {
          title: 'Featured Image Post',
          content: '<p>Post with image</p>',
          featured: true,
          featuredImageId: 'media-1',
        } as any,
        'user-1',
      );

      expect(result.featured).toBe(true);
    });
  });

  // Error scenarios
  describe('Error handling scenarios', () => {
    it('throws BadRequestException for unknown content type', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(null);

      await expect(
        contentService.create('unknown-type', { title: 'Test' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when updating non-existent content', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.update('nonexistent', { title: 'Test' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when deleting non-existent content', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('blocks editor from publishing another author content', async () => {
      const otherAuthorEntry = {
        id: 'entry-other',
        contentTypeId: 'ct-1',
        slug: 'other-post',
        status: 'DRAFT',
        data: {
          title: 'Other Post',
          content: '',
          tags: [],
          parentId: null,
          featured: false,
          viewCount: 0,
        },
        excerpt: '',
        authorId: 'author-2',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      };
      mockPrisma.contentEntry.findUnique.mockResolvedValue(otherAuthorEntry);

      await expect(
        contentService.update('entry-other', { status: 'publish' } as any, 'editor-1', 'EDITOR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows admin to update any content', async () => {
      const otherAuthorEntry = {
        id: 'entry-other',
        contentTypeId: 'ct-1',
        slug: 'other-post',
        status: 'DRAFT',
        data: {
          title: 'Other Post',
          content: '',
          tags: [],
          parentId: null,
          featured: false,
          viewCount: 0,
        },
        excerpt: '',
        authorId: 'author-2',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contentType: { name: 'post' },
      };
      mockPrisma.contentEntry.findUnique.mockResolvedValue(otherAuthorEntry);
      const updatedEntry = {
        ...otherAuthorEntry,
        data: { ...otherAuthorEntry.data, title: 'Admin Updated' },
      };
      mockPrisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update(
        'entry-other',
        { title: 'Admin Updated' } as any,
        'admin-1',
        'ADMIN',
      );

      expect(result.title).toBe('Admin Updated');
    });
  });

  // Pagination scenarios
  describe('Pagination and filtering', () => {
    it('returns empty result for unknown content type', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(null);

      const result = await contentService.findByType('nonexistent');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('filters by multiple status values', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.count.mockResolvedValue(3);
      mockPrisma.contentEntry.findMany.mockResolvedValue([]);

      await contentService.findByType('post', 'draft', 1, 20);

      expect(mockPrisma.contentEntry.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'DRAFT' }),
        }),
      );
    });

    it('returns paginated results with correct metadata', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.count.mockResolvedValue(50);
      mockPrisma.contentEntry.findMany.mockResolvedValue([]);

      const result = await contentService.findByType('post', undefined, 3, 10);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
    });
  });
});
