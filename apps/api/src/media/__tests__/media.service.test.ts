import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  media: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const { MediaService } = await import('../media.service.js');

describe('MediaService', () => {
  let mediaService: MediaService;

  beforeEach(() => {
    vi.clearAllMocks();
    mediaService = new MediaService(mockPrisma as any);
  });

  const mockPrismaMedia = {
    id: 'media-1',
    url: '/uploads/test-image.jpg',
    mimeType: 'image/jpeg',
    altText: 'A test image',
    caption: 'Test caption',
    title: 'test-image.jpg',
    description: 'test-image.jpg',
    width: 1920,
    height: 1080,
    fileSize: 102400,
    uploadedBy: 'user-1',
    createdAt: new Date('2024-01-01'),
  };

  describe('findAll', () => {
    it('returns paginated media entries', async () => {
      mockPrisma.media.findMany.mockResolvedValue([mockPrismaMedia]);
      mockPrisma.media.count.mockResolvedValue(1);

      const result = await mediaService.findAll(1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('handles pagination parameters', async () => {
      mockPrisma.media.findMany.mockResolvedValue([]);
      mockPrisma.media.count.mockResolvedValue(0);

      await mediaService.findAll(3, 10);

      expect(mockPrisma.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('returns empty array when no media exists', async () => {
      mockPrisma.media.findMany.mockResolvedValue([]);
      mockPrisma.media.count.mockResolvedValue(0);

      const result = await mediaService.findAll();

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findById', () => {
    it('returns a media entry by id', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(mockPrismaMedia);

      const result = await mediaService.findById('media-1');

      expect(result.id).toBe('media-1');
      expect(result.filename).toBe('test-image.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.url).toBe('/uploads/test-image.jpg');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('throws NotFoundException when media not found', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(mediaService.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a media record from metadata', async () => {
      const metadata = {
        url: '/uploads/new-image.jpg',
        filename: 'new-image.jpg',
        originalName: 'new-image.jpg',
        mimeType: 'image/png',
        size: 204800,
        width: 800,
        height: 600,
        alt: 'New image',
        caption: 'A new image',
        thumbnailUrl: null,
        uploadedBy: 'user-2',
      };

      const createdPrismaMedia = {
        ...mockPrismaMedia,
        id: 'media-2',
        url: '/uploads/new-image.jpg',
        mimeType: 'image/png',
        title: 'new-image.jpg',
        fileSize: 204800,
        width: 800,
        height: 600,
        uploadedBy: 'user-2',
      };
      mockPrisma.media.create.mockResolvedValue(createdPrismaMedia);

      const result = await mediaService.create(metadata);

      expect(result.id).toBe('media-2');
      expect(result.mimeType).toBe('image/png');
      expect(result.size).toBe(204800);
      expect(mockPrisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            url: '/uploads/new-image.jpg',
            mimeType: 'image/png',
            width: 800,
            height: 600,
          }),
        }),
      );
    });

    it('stores filename in the description field', async () => {
      const metadata = {
        url: '/uploads/doc.pdf',
        filename: 'document.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 50000,
        width: null,
        height: null,
        alt: 'Doc',
        caption: '',
        thumbnailUrl: null,
        uploadedBy: 'user-1',
      };

      mockPrisma.media.create.mockResolvedValue({
        ...mockPrismaMedia,
        url: '/uploads/doc.pdf',
        mimeType: 'application/pdf',
        description: 'document.pdf',
      });

      await mediaService.create(metadata);

      expect(mockPrisma.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'document.pdf',
          }),
        }),
      );
    });

    it('creates media with null dimensions for non-image files', async () => {
      const metadata = {
        url: '/uploads/test.zip',
        filename: 'test.zip',
        originalName: 'test.zip',
        mimeType: 'application/zip',
        size: 1000000,
        width: null,
        height: null,
        alt: '',
        caption: '',
        thumbnailUrl: null,
        uploadedBy: 'user-1',
      };

      mockPrisma.media.create.mockResolvedValue({
        ...mockPrismaMedia,
        url: '/uploads/test.zip',
        mimeType: 'application/zip',
        width: null,
        height: null,
      });

      const result = await mediaService.create(metadata);

      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes an existing media entry', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(mockPrismaMedia);
      mockPrisma.media.delete.mockResolvedValue(mockPrismaMedia);

      await mediaService.delete('media-1');

      expect(mockPrisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-1' } });
    });

    it('throws NotFoundException when media does not exist', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(mediaService.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when trying to delete already deleted media', async () => {
      mockPrisma.media.findUnique.mockResolvedValue(null);

      await expect(mediaService.delete('already-deleted')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.media.delete).not.toHaveBeenCalled();
    });
  });
});
