import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentController } from '../content.controller.js';

const mockContentService = {
  create: vi.fn(),
  findByType: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe('ContentController', () => {
  let controller: ContentController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ContentController(mockContentService as any);
  });

  const mockUser = {
    sub: 'user-1',
    email: 'admin@test.com',
    role: 'admin',
    permissions: ['read', 'write'],
  };

  describe('POST /content/:type', () => {
    it('creates content', async () => {
      const dto = { title: 'Test Post', content: '<p>Hello</p>' };
      const created = {
        id: 'entry-1',
        type: 'post',
        title: 'Test Post',
        slug: 'test-post',
        content: '<p>Hello</p>',
        status: 'draft',
      };
      mockContentService.create.mockResolvedValue(created);

      const result = await controller.create('post', dto as any, mockUser);

      expect(result).toEqual(created);
      expect(mockContentService.create).toHaveBeenCalledWith('post', dto, 'user-1');
    });
  });

  describe('GET /content/:type', () => {
    it('returns paginated content list', async () => {
      const paginated = {
        items: [{ id: 'entry-1', type: 'post', title: 'Test' }],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockContentService.findByType.mockResolvedValue(paginated);

      const result = await controller.findAll('post', 'publish', '1', '20');

      expect(result).toEqual(paginated);
      expect(mockContentService.findByType).toHaveBeenCalledWith('post', 'publish', 1, 20);
    });

    it('uses default pagination when not provided', async () => {
      mockContentService.findByType.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });

      await controller.findAll('post');

      expect(mockContentService.findByType).toHaveBeenCalledWith('post', undefined, 1, 20);
    });
  });

  describe('GET /content/:type/:id', () => {
    it('returns a single content entry', async () => {
      const entry = { id: 'entry-1', type: 'post', title: 'Test' };
      mockContentService.findById.mockResolvedValue(entry);

      const result = await controller.findOne('post', 'entry-1');

      expect(result).toEqual(entry);
      expect(mockContentService.findById).toHaveBeenCalledWith('entry-1');
    });

    it('throws when entry is not found', async () => {
      mockContentService.findById.mockRejectedValue(new Error('Not found'));

      await expect(controller.findOne('post', 'nonexistent')).rejects.toThrow('Not found');
    });
  });

  describe('PATCH /content/:type/:id', () => {
    it('updates a content entry', async () => {
      const dto = { title: 'Updated Title' };
      const updated = { id: 'entry-1', type: 'post', title: 'Updated Title' };
      mockContentService.update.mockResolvedValue(updated);

      const result = await controller.update('post', 'entry-1', dto as any, mockUser);

      expect(result).toEqual(updated);
      expect(mockContentService.update).toHaveBeenCalledWith('entry-1', dto, 'user-1', 'admin');
    });
  });

  describe('DELETE /content/:type/:id', () => {
    it('deletes a content entry', async () => {
      mockContentService.delete.mockResolvedValue(undefined);

      await controller.delete('post', 'entry-1', mockUser);

      expect(mockContentService.delete).toHaveBeenCalledWith('entry-1', 'user-1', 'admin');
    });
  });
});
