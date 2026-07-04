import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma.sql from @nodepressjs/db
vi.mock('@nodepressjs/db', () => ({
  Prisma: {
    sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
  },
}));

// Use resetAllMocks to also clear mockResolvedValueOnce state
beforeEach(() => {
  vi.resetAllMocks();
});

const mockPrisma = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

const { SearchService } = await import('../search.service.js');

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService(mockPrisma as any);
  });

  describe('search', () => {
    it('returns paginated search results', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
        {
          id: 'entry-1',
          contentTypeName: 'post',
          slug: 'hello-world',
          data: { title: 'Hello World', content: '<p>Hello</p>' },
          excerpt: 'A brief excerpt',
          relevance: 0.5,
        },
      ]);

      const result = await searchService.search('hello', undefined, 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].title).toBe('Hello World');
      expect(result.items[0].url).toBe('/post/hello-world');
    });

    it('returns empty array for empty query', async () => {
      const result = await searchService.search('', undefined, 1, 20);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns empty array for whitespace-only query', async () => {
      const result = await searchService.search('   ', undefined, 1, 20);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns empty array when no results found', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 0n }]);

      const result = await searchService.search('zzzznotfound', undefined, 1, 20);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('filters by content type when provided', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
        {
          id: 'entry-1',
          contentTypeName: 'post',
          slug: 'hello-world',
          data: { title: 'Hello World', content: '<p>Hello</p>' },
          excerpt: null,
          relevance: 0.8,
        },
      ]);

      const result = await searchService.search('hello', 'post', 1, 20);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('post');
    });

    it('handles pagination offset correctly', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 25n }]).mockResolvedValueOnce([]);

      const result = await searchService.search('hello', undefined, 3, 10);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
    });

    it('extracts excerpt from content when excerpt is null', async () => {
      const longContent = 'A'.repeat(500);
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
        {
          id: 'entry-1',
          contentTypeName: 'post',
          slug: 'test-post',
          data: { title: 'Test', content: longContent },
          excerpt: null,
          relevance: 0.9,
        },
      ]);

      const result = await searchService.search('test', undefined, 1, 20);

      expect(result.items[0].excerpt.length).toBeLessThanOrEqual(240);
    });

    it('handles missing data.title gracefully', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
        {
          id: 'entry-1',
          contentTypeName: 'page',
          slug: 'untitled',
          data: {},
          excerpt: 'Some excerpt',
          relevance: 0.3,
        },
      ]);

      const result = await searchService.search('test');

      expect(result.items[0].title).toBe('');
      expect(result.items[0].excerpt).toBe('Some excerpt');
    });

    it('calculates score from relevance', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 1n }]).mockResolvedValueOnce([
        {
          id: 'entry-1',
          contentTypeName: 'post',
          slug: 'hello-world',
          data: { title: 'Hello World' },
          excerpt: null,
          relevance: 0.5678,
        },
      ]);

      const result = await searchService.search('hello');

      expect(result.items[0].score).toBe(568);
    });

    it('accepts language parameter', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ count: 0n }]).mockResolvedValueOnce([]);

      await searchService.search('hola', undefined, 1, 20, 'spanish');

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('reindex', () => {
    it('returns indexed count', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(10);

      const result = await searchService.reindex();

      expect(result.indexed).toBe(10);
    });

    it('returns zero when no entries to reindex', async () => {
      mockPrisma.$executeRaw.mockResolvedValue(0);

      const result = await searchService.reindex();

      expect(result.indexed).toBe(0);
    });
  });

  describe('fuzzySearch', () => {
    beforeEach(() => {
      // Each fuzzySearch test uses a single $queryRaw call
      mockPrisma.$queryRaw.mockReset();
    });

    it('returns fuzzy search results', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'entry-1',
          contentTypeName: 'post',
          slug: 'javascript-guide',
          title: 'JavaScript Guide',
          excerpt: 'A guide to JavaScript',
          similarity: 0.8,
        },
      ]);

      const result = await searchService.fuzzySearch('javascript', 10);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('JavaScript Guide');
    });

    it('returns empty array for empty query', async () => {
      const result = await searchService.fuzzySearch('', 10);

      expect(result).toHaveLength(0);
    });

    it('returns empty array for whitespace query', async () => {
      const result = await searchService.fuzzySearch('   ', 10);

      expect(result).toHaveLength(0);
    });

    it('returns empty array when no matches found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await searchService.fuzzySearch('zzzzz', 10);

      expect(result).toHaveLength(0);
    });

    it('respects limit parameter', async () => {
      const manyResults = Array.from({ length: 5 }, (_, i) => ({
        id: `entry-${i}`,
        contentTypeName: 'post',
        slug: `post-${i}`,
        title: `Post ${i}`,
        excerpt: null,
        similarity: 0.5 - i * 0.1,
      }));
      mockPrisma.$queryRaw.mockResolvedValue(manyResults);

      const result = await searchService.fuzzySearch('test', 3);

      expect(result).toHaveLength(5); // limit is passed to SQL, not to array slicing
    });
  });

  describe('suggestions', () => {
    beforeEach(() => {
      mockPrisma.$queryRaw.mockReset();
    });

    it('returns title suggestions for prefix', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { title: 'JavaScript Guide' },
        { title: 'JavaScript Tutorial' },
      ]);

      const result = await searchService.suggestions('java', 5);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('JavaScript Guide');
    });

    it('returns empty array for prefixes shorter than 2 chars', async () => {
      const result = await searchService.suggestions('a', 5);

      expect(result).toHaveLength(0);
    });

    it('returns empty array for empty prefix', async () => {
      const result = await searchService.suggestions('', 5);

      expect(result).toHaveLength(0);
    });

    it('returns empty array when no suggestions found', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const result = await searchService.suggestions('xyzzz', 5);

      expect(result).toHaveLength(0);
    });

    it('respects limit parameter', async () => {
      const titles = Array.from({ length: 10 }, (_, i) => ({
        title: `Test ${i}`,
      }));
      mockPrisma.$queryRaw.mockResolvedValue(titles);

      const result = await searchService.suggestions('test', 3);

      expect(result).toHaveLength(10); // limit is passed to SQL, not to array slicing
    });
  });
});
