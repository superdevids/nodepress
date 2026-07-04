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

describe('ContentService', () => {
  let contentService: ContentService;

  beforeEach(() => {
    vi.clearAllMocks();
    contentService = new ContentService(mockPrisma as any, mockNotificationsService as any);
  });

  const mockContentType = { id: 'ct-1', name: 'post' };

  const mockPrismaEntry = {
    id: 'entry-1',
    contentTypeId: 'ct-1',
    slug: 'hello-world',
    status: 'DRAFT',
    data: {
      title: 'Hello World',
      content: '<p>Hello</p>',
      tags: ['javascript'],
      parentId: null,
      featured: false,
      viewCount: 0,
    },
    excerpt: 'A brief excerpt',
    authorId: 'user-1',
    publishedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    contentType: { name: 'post' },
  };

  describe('create', () => {
    it('creates a content entry with valid data', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      const result = await contentService.create(
        'post',
        {
          title: 'Hello World',
          content: '<p>Hello</p>',
          tags: ['javascript'],
        } as any,
        'user-1',
      );

      expect(result.id).toBe('entry-1');
      expect(result.title).toBe('Hello World');
      expect(result.type).toBe('post');
      expect(result.status).toBe('draft');
      expect(mockPrisma.contentEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'hello-world',
            authorId: 'user-1',
          }),
        }),
      );
    });

    it('throws BadRequestException when content type is not found', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(null);

      await expect(
        contentService.create('unknown', { title: 'Test', content: '' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses custom slug when provided', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      await contentService.create(
        'post',
        {
          title: 'Hello World',
          content: '<p>Hello</p>',
          slug: 'my-custom-slug',
        } as any,
        'user-1',
      );

      expect(mockPrisma.contentEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringContaining('my-custom-slug'),
          }),
        }),
      );
    });

    it('sets publishedAt when status is publish', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const publishedEntry = {
        ...mockPrismaEntry,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };
      mockPrisma.contentEntry.create.mockResolvedValue(publishedEntry);

      const result = await contentService.create(
        'post',
        {
          title: 'Published Post',
          content: '<p>Content</p>',
          status: 'publish',
        } as any,
        'user-1',
      );

      expect(result.status).toBe('publish');
      expect(result.publishedAt).toBeDefined();
    });

    it('generates slug from title when not provided', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      await contentService.create(
        'post',
        {
          title: 'My Amazing Post Title!!!',
          content: '<p>Content</p>',
        } as any,
        'user-1',
      );

      const createCall = mockPrisma.contentEntry.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe('my-amazing-post-title');
    });

    it('truncates excerpt from content when not provided', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      await contentService.create(
        'post',
        {
          title: 'Test',
          content: 'A'.repeat(500),
        } as any,
        'user-1',
      );

      const createCall = mockPrisma.contentEntry.create.mock.calls[0][0];
      expect(createCall.data.excerpt.length).toBeLessThanOrEqual(240);
    });
  });

  describe('findByType', () => {
    it('returns paginated results', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.count.mockResolvedValue(1);
      mockPrisma.contentEntry.findMany.mockResolvedValue([mockPrismaEntry]);

      const result = await contentService.findByType('post');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by status when provided', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.count.mockResolvedValue(1);
      mockPrisma.contentEntry.findMany.mockResolvedValue([mockPrismaEntry]);

      await contentService.findByType('post', 'publish', 1, 10);

      expect(mockPrisma.contentEntry.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('returns empty result when content type is not found', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(null);

      const result = await contentService.findByType('unknown');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('handles pagination parameters correctly', async () => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mockPrisma.contentEntry.count.mockResolvedValue(50);
      mockPrisma.contentEntry.findMany.mockResolvedValue([]);

      await contentService.findByType('post', undefined, 3, 10);

      expect(mockPrisma.contentEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns a single content entry', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);

      const result = await contentService.findById('entry-1');

      expect(result.id).toBe('entry-1');
      expect(result.title).toBe('Hello World');
    });

    it('throws NotFoundException when entry is not found', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a content entry with valid data', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      const updatedEntry = {
        ...mockPrismaEntry,
        data: { ...mockPrismaEntry.data, title: 'Updated Title' },
      };
      mockPrisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update('entry-1', { title: 'Updated Title' } as any);

      expect(result.title).toBe('Updated Title');
      expect(mockPrisma.contentEntry.update).toHaveBeenCalled();
    });

    it('throws NotFoundException when entry is not found', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.update('nonexistent', { title: 'Test' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('blocks editor from updating other users content', async () => {
      const editorEntry = { ...mockPrismaEntry, authorId: 'other-user' };
      mockPrisma.contentEntry.findUnique.mockResolvedValue(editorEntry);

      await expect(
        contentService.update('entry-1', { title: 'Hacked' } as any, 'editor-1', 'EDITOR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows editor to update their own content', async () => {
      const ownEntry = { ...mockPrismaEntry, authorId: 'editor-1' };
      mockPrisma.contentEntry.findUnique.mockResolvedValue(ownEntry);
      const updatedEntry = {
        ...ownEntry,
        data: { ...ownEntry.data, title: 'My Updated Post' },
      };
      mockPrisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update(
        'entry-1',
        { title: 'My Updated Post' } as any,
        'editor-1',
        'EDITOR',
      );

      expect(result.title).toBe('My Updated Post');
    });

    it('sets publishedAt when transitioning to publish', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      const publishedEntry = {
        ...mockPrismaEntry,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        data: { ...mockPrismaEntry.data, title: 'Now Published' },
      };
      mockPrisma.contentEntry.update.mockResolvedValue(publishedEntry);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Admin',
        displayName: 'admin',
      });

      const result = await contentService.update(
        'entry-1',
        { status: 'publish', title: 'Now Published' } as any,
        'user-1',
        'ADMIN',
      );

      expect(result.status).toBe('publish');
      expect(result.publishedAt).toBeDefined();
    });
  });

  describe('delete', () => {
    it('deletes an existing entry', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      mockPrisma.contentEntry.delete.mockResolvedValue(mockPrismaEntry);

      await contentService.delete('entry-1');

      expect(mockPrisma.contentEntry.delete).toHaveBeenCalledWith({ where: { id: 'entry-1' } });
    });

    it('throws NotFoundException when entry does not exist', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('blocks editor from deleting other users content', async () => {
      const editorEntry = { ...mockPrismaEntry, authorId: 'other-user' };
      mockPrisma.contentEntry.findUnique.mockResolvedValue(editorEntry);

      await expect(contentService.delete('entry-1', 'editor-1', 'EDITOR')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recordView', () => {
    it('increments view count', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      mockPrisma.contentEntry.update.mockResolvedValue(mockPrismaEntry);

      await contentService.recordView('entry-1');

      expect(mockPrisma.contentEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'entry-1' },
          data: expect.objectContaining({
            data: expect.objectContaining({ viewCount: 1 }),
          }),
        }),
      );
    });

    it('throws NotFoundException when entry not found', async () => {
      mockPrisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.recordView('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('status transitions', () => {
    const statusCases = [
      { from: 'DRAFT', to: 'draft', expected: 'DRAFT' },
      { from: 'DRAFT', to: 'publish', expected: 'PUBLISHED' },
      { from: 'DRAFT', to: 'pending', expected: 'PENDING_REVIEW' },
      { from: 'DRAFT', to: 'private', expected: 'PRIVATE' },
    ];

    it.each(statusCases)('transitions from $from to $to', async ({ to, expected }) => {
      mockPrisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const entry = {
        ...mockPrismaEntry,
        status: expected,
      };
      mockPrisma.contentEntry.create.mockResolvedValue(entry);

      const result = await contentService.create(
        'post',
        {
          title: 'Test',
          content: '',
          status: to as any,
        } as any,
        'user-1',
      );

      expect(result.status).toBe(to === 'publish' ? 'publish' : to);
    });
  });
});
