import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

function createMocks() {
  return {
    prisma: {
      contentType: { findFirst: vi.fn() },
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
    },
    notificationsService: {
      createForUsers: vi.fn(),
    },
  };
}

type Mocks = ReturnType<typeof createMocks>;

const { ContentService } = await import('../content.service.js');

describe('ContentService', () => {
  let mocks: Mocks;
  let contentService: ContentService;

  beforeEach(() => {
    mocks = createMocks();
    contentService = new ContentService(mocks.prisma as any, mocks.notificationsService as any);
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
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

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
      expect(mocks.prisma.contentEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'hello-world',
            authorId: 'user-1',
          }),
        }),
      );
    });

    it('throws BadRequestException when content type is not found', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(null);

      await expect(
        contentService.create('unknown', { title: 'Test', content: '' } as any, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('uses custom slug when provided', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      await contentService.create(
        'post',
        {
          title: 'Hello World',
          content: '<p>Hello</p>',
          slug: 'my-custom-slug',
        } as any,
        'user-1',
      );

      expect(mocks.prisma.contentEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringContaining('my-custom-slug'),
          }),
        }),
      );
    });

    it('sets publishedAt when status is publish', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const publishedEntry = {
        ...mockPrismaEntry,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };
      mocks.prisma.contentEntry.create.mockResolvedValue(publishedEntry);

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
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      await contentService.create(
        'post',
        {
          title: 'My Amazing Post Title!!!',
          content: '<p>Content</p>',
        } as any,
        'user-1',
      );

      const createCall = mocks.prisma.contentEntry.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe('my-amazing-post-title');
    });

    it('handles slug generation with special characters', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.create.mockResolvedValue({
        ...mockPrismaEntry,
        slug: 'hello-2024-world',
      });

      await contentService.create(
        'post',
        {
          title: 'Hello 2024! World???',
          content: '<p>Content</p>',
        } as any,
        'user-1',
      );

      const createCall = mocks.prisma.contentEntry.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe('hello-2024-world');
    });

    it('generates slug with only lowercase letters', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      await contentService.create(
        'post',
        {
          title: 'UPPERCASE Title Here',
          content: '<p>Content</p>',
        } as any,
        'user-1',
      );

      const createCall = mocks.prisma.contentEntry.create.mock.calls[0][0];
      expect(createCall.data.slug).toBe('uppercase-title-here');
    });

    it('truncates slug to 255 characters', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      const longTitle = 'A'.repeat(300);
      await contentService.create(
        'post',
        {
          title: longTitle,
          content: '<p>Content</p>',
        } as any,
        'user-1',
      );

      const createCall = mocks.prisma.contentEntry.create.mock.calls[0][0];
      expect(createCall.data.slug.length).toBeLessThanOrEqual(255);
    });

    it('truncates excerpt from content when not provided', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.create.mockResolvedValue(mockPrismaEntry);

      await contentService.create(
        'post',
        {
          title: 'Test',
          content: 'A'.repeat(500),
        } as any,
        'user-1',
      );

      const createCall = mocks.prisma.contentEntry.create.mock.calls[0][0];
      expect(createCall.data.excerpt.length).toBeLessThanOrEqual(240);
    });

    it('notifies admins when content is published', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const publishedEntry = {
        ...mockPrismaEntry,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      };
      mocks.prisma.contentEntry.create.mockResolvedValue(publishedEntry);
      mocks.prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Author Name',
        displayName: 'author',
      });
      mocks.prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await contentService.create(
        'post',
        { title: 'Test', content: '', status: 'publish' } as any,
        'user-1',
      );

      // Notification is fire-and-forget, so we wait for it
      await vi.waitFor(() => {
        expect(mocks.notificationsService.createForUsers).toHaveBeenCalledWith(
          ['admin-1'],
          expect.objectContaining({
            type: 'content.published',
          }),
        );
      });
    });
  });

  describe('findByType', () => {
    it('returns paginated results', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.count.mockResolvedValue(1);
      mocks.prisma.contentEntry.findMany.mockResolvedValue([mockPrismaEntry]);

      const result = await contentService.findByType('post');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by status when provided', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.count.mockResolvedValue(1);
      mocks.prisma.contentEntry.findMany.mockResolvedValue([mockPrismaEntry]);

      await contentService.findByType('post', 'publish', 1, 10);

      expect(mocks.prisma.contentEntry.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PUBLISHED' }),
        }),
      );
    });

    it('filters by pending status', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.count.mockResolvedValue(1);
      mocks.prisma.contentEntry.findMany.mockResolvedValue([mockPrismaEntry]);

      await contentService.findByType('post', 'pending', 1, 10);

      expect(mocks.prisma.contentEntry.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING_REVIEW' }),
        }),
      );
    });

    it('returns empty result when content type is not found', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(null);

      const result = await contentService.findByType('unknown');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('handles pagination parameters correctly', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.count.mockResolvedValue(50);
      mocks.prisma.contentEntry.findMany.mockResolvedValue([]);

      await contentService.findByType('post', undefined, 3, 10);

      expect(mocks.prisma.contentEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('orders results by createdAt descending', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      mocks.prisma.contentEntry.count.mockResolvedValue(5);
      mocks.prisma.contentEntry.findMany.mockResolvedValue([]);

      await contentService.findByType('post');

      expect(mocks.prisma.contentEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns a single content entry', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);

      const result = await contentService.findById('entry-1');

      expect(result.id).toBe('entry-1');
      expect(result.title).toBe('Hello World');
    });

    it('throws NotFoundException when entry is not found', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates a content entry with valid data', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      const updatedEntry = {
        ...mockPrismaEntry,
        data: { ...mockPrismaEntry.data, title: 'Updated Title' },
      };
      mocks.prisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update('entry-1', { title: 'Updated Title' } as any);

      expect(result.title).toBe('Updated Title');
      expect(mocks.prisma.contentEntry.update).toHaveBeenCalled();
    });

    it('updates the data field partially', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      const updatedEntry = {
        ...mockPrismaEntry,
        data: {
          ...mockPrismaEntry.data,
          title: 'New Title',
          content: 'New content',
        },
      };
      mocks.prisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update('entry-1', {
        title: 'New Title',
        content: 'New content',
      } as any);

      expect(result.title).toBe('New Title');
      expect(result.content).toBe('New content');
    });

    it('throws NotFoundException when entry is not found', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.update('nonexistent', { title: 'Test' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('blocks editor from updating other users content', async () => {
      const editorEntry = { ...mockPrismaEntry, authorId: 'other-user' };
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(editorEntry);

      await expect(
        contentService.update('entry-1', { title: 'Hacked' } as any, 'editor-1', 'EDITOR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows editor to update their own content', async () => {
      const ownEntry = { ...mockPrismaEntry, authorId: 'editor-1' };
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(ownEntry);
      const updatedEntry = {
        ...ownEntry,
        data: { ...ownEntry.data, title: 'My Updated Post' },
      };
      mocks.prisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update(
        'entry-1',
        { title: 'My Updated Post' } as any,
        'editor-1',
        'EDITOR',
      );

      expect(result.title).toBe('My Updated Post');
    });

    it('allows admin to update any content', async () => {
      const otherEntry = { ...mockPrismaEntry, authorId: 'other-user' };
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(otherEntry);
      const updatedEntry = {
        ...otherEntry,
        data: { ...otherEntry.data, title: 'Admin Updated' },
      };
      mocks.prisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update(
        'entry-1',
        { title: 'Admin Updated' } as any,
        'admin-1',
        'ADMIN',
      );

      expect(result.title).toBe('Admin Updated');
    });

    it('sets publishedAt when transitioning to publish', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      const publishedEntry = {
        ...mockPrismaEntry,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        data: { ...mockPrismaEntry.data, title: 'Now Published' },
      };
      mocks.prisma.contentEntry.update.mockResolvedValue(publishedEntry);
      mocks.prisma.user.findUnique.mockResolvedValue({
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

    it('notifies admins when content is published via update', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      const publishedEntry = {
        ...mockPrismaEntry,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        data: { ...mockPrismaEntry.data, title: 'Now Published' },
      };
      mocks.prisma.contentEntry.update.mockResolvedValue(publishedEntry);
      mocks.prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Admin',
        displayName: 'admin',
      });
      mocks.prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await contentService.update(
        'entry-1',
        { status: 'publish', title: 'Now Published' } as any,
        'user-1',
        'ADMIN',
      );

      // Notification is fire-and-forget, so we wait for it
      await vi.waitFor(() => {
        expect(mocks.notificationsService.createForUsers).toHaveBeenCalled();
      });
    });

    it('updates slug when provided', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      const updatedEntry = {
        ...mockPrismaEntry,
        slug: 'new-custom-slug',
        data: { ...mockPrismaEntry.data, title: 'Test' },
      };
      mocks.prisma.contentEntry.update.mockResolvedValue(updatedEntry);

      const result = await contentService.update('entry-1', { slug: 'new-custom-slug' } as any);

      expect(mocks.prisma.contentEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'new-custom-slug',
          }),
        }),
      );
    });
  });

  describe('delete', () => {
    it('deletes an existing entry', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      mocks.prisma.contentEntry.delete.mockResolvedValue(mockPrismaEntry);

      await contentService.delete('entry-1');

      expect(mocks.prisma.contentEntry.delete).toHaveBeenCalledWith({ where: { id: 'entry-1' } });
    });

    it('throws NotFoundException when entry does not exist', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(null);

      await expect(contentService.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('blocks editor from deleting other users content', async () => {
      const editorEntry = { ...mockPrismaEntry, authorId: 'other-user' };
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(editorEntry);

      await expect(contentService.delete('entry-1', 'editor-1', 'EDITOR')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('allows admin to delete any content', async () => {
      const otherEntry = { ...mockPrismaEntry, authorId: 'other-user' };
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(otherEntry);
      mocks.prisma.contentEntry.delete.mockResolvedValue(otherEntry);

      await expect(contentService.delete('entry-1', 'admin-1', 'ADMIN')).resolves.not.toThrow();
    });
  });

  describe('recordView', () => {
    it('increments view count', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(mockPrismaEntry);
      mocks.prisma.contentEntry.update.mockResolvedValue(mockPrismaEntry);

      await contentService.recordView('entry-1');

      expect(mocks.prisma.contentEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'entry-1' },
          data: expect.objectContaining({
            data: expect.objectContaining({ viewCount: 1 }),
          }),
        }),
      );
    });

    it('increments view count from existing non-zero value', async () => {
      const entryWithViews = {
        ...mockPrismaEntry,
        data: { ...mockPrismaEntry.data, viewCount: 42 },
      };
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(entryWithViews);
      mocks.prisma.contentEntry.update.mockResolvedValue(entryWithViews);

      await contentService.recordView('entry-1');

      expect(mocks.prisma.contentEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            data: expect.objectContaining({ viewCount: 43 }),
          }),
        }),
      );
    });

    it('throws NotFoundException when entry not found', async () => {
      mocks.prisma.contentEntry.findUnique.mockResolvedValue(null);

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
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const entry = {
        ...mockPrismaEntry,
        status: expected,
      };
      mocks.prisma.contentEntry.create.mockResolvedValue(entry);

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

    it('defaults to DRAFT when status is invalid', async () => {
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockContentType);
      const entry = {
        ...mockPrismaEntry,
        status: 'DRAFT',
      };
      mocks.prisma.contentEntry.create.mockResolvedValue(entry);

      const result = await contentService.create(
        'post',
        {
          title: 'Test',
          content: '',
          status: 'invalid_status_here' as any,
        } as any,
        'user-1',
      );

      expect(result.status).toBe('draft');
    });
  });

  describe('content type mapping', () => {
    it('creates page content type', async () => {
      const mockPageType = { id: 'ct-2', name: 'page' };
      mocks.prisma.contentType.findFirst.mockResolvedValue(mockPageType);
      const pageEntry = {
        ...mockPrismaEntry,
        contentTypeId: 'ct-2',
        contentType: { name: 'page' },
      };
      mocks.prisma.contentEntry.create.mockResolvedValue(pageEntry);

      const result = await contentService.create(
        'page',
        { title: 'About Us', content: '<p>About page</p>' } as any,
        'user-1',
      );

      expect(result.type).toBe('page');
      expect(mocks.prisma.contentType.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'page' } }),
      );
    });
  });

  describe('findByType with multiple queries', () => {
    it('handles concurrent findByType calls independently', async () => {
      mocks.prisma.contentType.findFirst
        .mockResolvedValueOnce(mockContentType)
        .mockResolvedValueOnce(mockContentType);
      mocks.prisma.contentEntry.count.mockResolvedValue(2);
      mocks.prisma.contentEntry.findMany
        .mockResolvedValueOnce([mockPrismaEntry])
        .mockResolvedValueOnce([]);

      const [result1, result2] = await Promise.all([
        contentService.findByType('post', undefined, 1, 20),
        contentService.findByType('post', 'publish', 1, 10),
      ]);

      expect(result1.items).toHaveLength(1);
      expect(result2.items).toHaveLength(0);
    });
  });
});
