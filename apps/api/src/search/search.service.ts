import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@nodepressjs/db';

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  url: string;
  score: number;
}

export interface SearchOptions {
  type?: string;
  page?: number;
  limit?: number;
  language?: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * PostgreSQL full-text search using tsvector/tsquery.
   * Uses plainto_tsquery for natural-language query parsing and
   * ts_rank for relevance-based result ordering.
   */
  async search(
    query: string,
    type?: string,
    page = 1,
    limit = 20,
    language = 'english',
  ): Promise<{ items: SearchResult[]; total: number; page: number; limit: number }> {
    this.logger.log(
      `Full-text search: "${query}"${type ? ` [type: ${type}]` : ''} [lang: ${language}]`,
    );

    if (!query || query.trim().length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const tsQuery = Prisma.sql`plainto_tsquery(${language}, ${query})`;
    const offset = (page - 1) * limit;

    // Build optional type filter
    const typeFilter = type ? Prisma.sql`AND ct.name = ${type}` : Prisma.sql``;

    // ── Total count (for pagination) ──────────────────────────────
    const countResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM content_entries ce
      JOIN content_types ct ON ct.id = ce."contentTypeId"
      WHERE ce.search_vector @@ ${tsQuery}
        AND ce.status = 'PUBLISHED'
        ${typeFilter}
    `;

    const total = Number(countResult[0]?.count ?? 0);

    if (total === 0) {
      return { items: [], total: 0, page, limit };
    }

    // ── Ranked search results ────────────────────────────────────
    type SearchRow = {
      id: string;
      contentTypeName: string;
      slug: string;
      data: Prisma.JsonValue;
      excerpt: string | null;
      relevance: number;
    };

    const results = await this.prisma.$queryRaw<SearchRow[]>`
      SELECT
        ce.id,
        ct.name                                     AS "contentTypeName",
        ce.slug,
        ce.data,
        ce.excerpt,
        ts_rank(ce.search_vector, ${tsQuery})       AS relevance
      FROM content_entries ce
      JOIN content_types ct ON ct.id = ce."contentTypeId"
      WHERE ce.search_vector @@ ${tsQuery}
        AND ce.status = 'PUBLISHED'
        ${typeFilter}
      ORDER BY relevance DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const items: SearchResult[] = results.map((row) => {
      const data = row.data as Record<string, unknown> | null;
      return {
        id: row.id,
        type: row.contentTypeName,
        title: (data?.title as string) ?? '',
        excerpt: row.excerpt ?? (data?.content as string)?.substring(0, 240) ?? '',
        url: `/${row.contentTypeName}/${row.slug}`,
        score: Math.round(row.relevance * 1000),
      };
    });

    return { items, total, page, limit };
  }

  /**
   * Rebuild the search_vector for all PUBLISHED entries.
   *
   * The trigger `update_content_search_vector()` (created by migration
   * 0002) normally handles this automatically on INSERT/UPDATE of the
   * `data` or `excerpt` columns.  This method is a backfill for
   * entries that were created before the trigger existed, or if the
   * trigger needs to be re-run manually.
   */
  async reindex(): Promise<{ indexed: number }> {
    this.logger.log('Reindexing all PUBLISHED content entries…');

    const result = await this.prisma.$executeRaw`
      UPDATE content_entries
      SET search_vector = to_tsvector('english',
        COALESCE(data->>'title',   '') || ' ' ||
        COALESCE(data->>'content', '') || ' ' ||
        COALESCE(excerpt,          '')
      )
      WHERE status = 'PUBLISHED'
    `;

    this.logger.log(`Reindexed ${result} entries`);
    return { indexed: result };
  }

  // ──────────────────────────────────────────────────────────────
  //  Bonus features
  // ──────────────────────────────────────────────────────────────

  /**
   * Fuzzy (approximate) search using the pg_trgm similarity operator.
   * Useful for typo-tolerant matching on titles.
   * Requires the `pg_trgm` extension (already installed via migration 0002).
   */
  async fuzzySearch(query: string, limit = 10): Promise<SearchResult[]> {
    if (!query || query.trim().length === 0) return [];

    type FuzzyRow = {
      id: string;
      contentTypeName: string;
      slug: string;
      title: string;
      excerpt: string | null;
      similarity: number;
    };

    const results = await this.prisma.$queryRaw<FuzzyRow[]>`
      SELECT
        ce.id,
        ct.name                                        AS "contentTypeName",
        ce.slug,
        COALESCE(ce.data->>'title', '')                AS title,
        ce.excerpt,
        similarity(COALESCE(ce.data->>'title', ''), ${query}) AS similarity
      FROM content_entries ce
      JOIN content_types ct ON ct.id = ce."contentTypeId"
      WHERE ce.status = 'PUBLISHED'
        AND COALESCE(ce.data->>'title', '') % ${query}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results.map((row) => ({
      id: row.id,
      type: row.contentTypeName,
      title: row.title,
      excerpt: row.excerpt ?? '',
      url: `/${row.contentTypeName}/${row.slug}`,
      score: Math.round(row.similarity * 100),
    }));
  }

  /**
   * Auto-complete suggestions via ILIKE prefix matching on titles.
   * Returns distinct title strings matching the prefix.
   */
  async suggestions(prefix: string, limit = 5): Promise<string[]> {
    if (!prefix || prefix.trim().length < 2) return [];

    type TitleRow = { title: string };

    const results = await this.prisma.$queryRaw<TitleRow[]>`
      SELECT DISTINCT COALESCE(ce.data->>'title', '') AS title
      FROM content_entries ce
      WHERE ce.status = 'PUBLISHED'
        AND ce.data->>'title' ILIKE ${prefix + '%'}
      ORDER BY title ASC
      LIMIT ${limit}
    `;

    return results.map((r) => r.title);
  }
}
