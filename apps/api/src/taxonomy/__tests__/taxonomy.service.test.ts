import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';

const mockPrisma = {
  taxonomy: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  term: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

const { TaxonomyService } = await import('../taxonomy.service.js');

describe('TaxonomyService', () => {
  let taxonomyService: TaxonomyService;

  beforeEach(() => {
    vi.resetAllMocks();
    taxonomyService = new TaxonomyService(mockPrisma as any);
  });

  const mockCategoryTaxonomy = {
    id: 'tax-1',
    name: 'category',
    hierarchical: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTagTaxonomy = {
    id: 'tax-2',
    name: 'tag',
    hierarchical: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTerm = {
    id: 'term-1',
    taxonomyId: 'tax-1',
    name: 'JavaScript',
    slug: 'javascript',
    description: 'JavaScript programming language',
    parentId: null,
    termGroup: 0,
    count: 5,
    termOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    taxonomy: { name: 'category' },
  };

  const mockChildTerm = {
    ...mockTerm,
    id: 'term-2',
    name: 'React',
    slug: 'react',
    description: 'React framework',
    parentId: 'term-1',
    taxonomy: { name: 'category' },
  };

  describe('findAll', () => {
    it('returns paginated terms', async () => {
      mockPrisma.term.findMany.mockResolvedValue([mockTerm]);
      mockPrisma.term.count.mockResolvedValue(1);

      const result = await taxonomyService.findAll(undefined, 1, 50);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('filters by taxonomy', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findMany.mockResolvedValue([mockTerm]);
      mockPrisma.term.count.mockResolvedValue(1);

      const result = await taxonomyService.findAll('category');

      expect(result.items).toHaveLength(1);
      expect(mockPrisma.taxonomy.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'category' } }),
      );
    });

    it('returns empty when taxonomy does not exist', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(null);

      const result = await taxonomyService.findAll('nonexistent');

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('handles pagination parameters correctly', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findMany.mockResolvedValue([]);
      mockPrisma.term.count.mockResolvedValue(0);

      await taxonomyService.findAll('category', 2, 10);

      expect(mockPrisma.term.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
    });
  });

  describe('findById', () => {
    it('returns a term by id', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(mockTerm);

      const result = await taxonomyService.findById('term-1');

      expect(result.id).toBe('term-1');
      expect(result.name).toBe('JavaScript');
      expect(result.taxonomy).toBe('category');
    });

    it('throws NotFoundException when term not found', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(null);

      await expect(taxonomyService.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySlug', () => {
    it('returns a term by taxonomy and slug', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(mockTerm);

      const result = await taxonomyService.findBySlug('category', 'javascript');

      expect(result.name).toBe('JavaScript');
      expect(result.slug).toBe('javascript');
    });

    it('throws NotFoundException when taxonomy not found', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(null);

      await expect(taxonomyService.findBySlug('nonexistent', 'anything')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when slug not found in taxonomy', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);

      await expect(taxonomyService.findBySlug('category', 'unknown-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a term in an existing taxonomy', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue(mockTerm);

      const result = await taxonomyService.create({
        taxonomy: 'category',
        name: 'JavaScript',
      });

      expect(result.name).toBe('JavaScript');
      expect(result.taxonomy).toBe('category');
    });

    it('creates a new taxonomy when it does not exist', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(null);
      mockPrisma.taxonomy.create.mockResolvedValue(mockTagTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue({
        ...mockTerm,
        taxonomyId: 'tax-2',
        taxonomy: { name: 'tag' },
      });

      const result = await taxonomyService.create({
        taxonomy: 'tag',
        name: 'New Tag',
      });

      expect(mockPrisma.taxonomy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'tag' }),
        }),
      );
    });

    it('creates hierarchical taxonomy for categories', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(null);
      mockPrisma.taxonomy.create.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue(mockTerm);

      await taxonomyService.create({
        taxonomy: 'category',
        name: 'JavaScript',
      });

      expect(mockPrisma.taxonomy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'category', hierarchical: true }),
        }),
      );
    });

    it('throws ConflictException when term slug already exists', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(mockTerm);

      await expect(
        taxonomyService.create({
          taxonomy: 'category',
          name: 'JavaScript',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('generates slug from name when not provided', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue(mockTerm);

      await taxonomyService.create({
        taxonomy: 'category',
        name: 'My Custom Term!',
      });

      expect(mockPrisma.term.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'my-custom-term',
          }),
        }),
      );
    });

    it('uses custom slug when provided', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue(mockTerm);

      await taxonomyService.create({
        taxonomy: 'category',
        name: 'JavaScript',
        slug: 'js',
      });

      expect(mockPrisma.term.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: 'js',
          }),
        }),
      );
    });

    it('creates a child term with parentId', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue(mockChildTerm);

      const result = await taxonomyService.create({
        taxonomy: 'category',
        name: 'React',
        parentId: 'term-1',
      });

      expect(mockPrisma.term.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            parentId: 'term-1',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates a term name', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(mockTerm);
      const updatedTerm = {
        ...mockTerm,
        name: 'TypeScript',
        slug: 'typescript',
      };
      mockPrisma.term.update.mockResolvedValue(updatedTerm);

      const result = await taxonomyService.update('term-1', {
        name: 'TypeScript',
        slug: 'typescript',
      });

      expect(result.name).toBe('TypeScript');
      expect(result.slug).toBe('typescript');
    });

    it('updates term description', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(mockTerm);
      const updatedTerm = {
        ...mockTerm,
        description: 'Updated description',
      };
      mockPrisma.term.update.mockResolvedValue(updatedTerm);

      const result = await taxonomyService.update('term-1', {
        description: 'Updated description',
      });

      expect(result.description).toBe('Updated description');
    });

    it('updates term parentId', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(mockTerm);
      const reparentedTerm = {
        ...mockTerm,
        parentId: 'new-parent',
      };
      mockPrisma.term.update.mockResolvedValue(reparentedTerm);

      const result = await taxonomyService.update('term-1', {
        parentId: 'new-parent',
      });

      expect(result.parentId).toBe('new-parent');
    });

    it('throws NotFoundException when term not found', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(null);

      await expect(taxonomyService.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('deletes an existing term', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(mockTerm);
      mockPrisma.term.delete.mockResolvedValue(mockTerm);

      await taxonomyService.delete('term-1');

      expect(mockPrisma.term.delete).toHaveBeenCalledWith({ where: { id: 'term-1' } });
    });

    it('throws NotFoundException when term does not exist', async () => {
      mockPrisma.term.findUnique.mockResolvedValue(null);

      await expect(taxonomyService.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('hierarchical vs flat', () => {
    it('creates taxonomy as hierarchical for category', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(null);
      mockPrisma.taxonomy.create.mockResolvedValue(mockCategoryTaxonomy);
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue(mockTerm);

      await taxonomyService.create({
        taxonomy: 'category',
        name: 'Test Category',
      });

      expect(mockPrisma.taxonomy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'category', hierarchical: true }),
        }),
      );
    });

    it('creates taxonomy as flat (non-hierarchical) for tags', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(null);
      mockPrisma.taxonomy.create.mockResolvedValue({ ...mockTagTaxonomy, hierarchical: false });
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue({
        ...mockTerm,
        taxonomyId: 'tax-2',
        taxonomy: { name: 'tag' },
      });

      await taxonomyService.create({
        taxonomy: 'tag',
        name: 'New Tag',
      });

      expect(mockPrisma.taxonomy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'tag', hierarchical: false }),
        }),
      );
    });

    it('creates non-category taxonomies as non-hierarchical', async () => {
      mockPrisma.taxonomy.findFirst.mockResolvedValue(null);
      mockPrisma.taxonomy.create.mockResolvedValue({
        ...mockCategoryTaxonomy,
        id: 'tax-3',
        name: 'custom_tax',
        hierarchical: false,
      });
      mockPrisma.term.findFirst.mockResolvedValue(null);
      mockPrisma.term.create.mockResolvedValue({
        ...mockTerm,
        taxonomyId: 'tax-3',
        taxonomy: { name: 'custom_tax' },
      });

      await taxonomyService.create({
        taxonomy: 'custom_tax',
        name: 'Custom Item',
      });

      expect(mockPrisma.taxonomy.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'custom_tax', hierarchical: false }),
        }),
      );
    });
  });
});
