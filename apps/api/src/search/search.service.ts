import { Injectable, Logger } from '@nestjs/common';
import { ContentService } from '../content/content.service';

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  url: string;
  score: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly contentService: ContentService) {}

  async search(
    query: string,
    type?: string,
    page = 1,
    limit = 20,
  ): Promise<{ items: SearchResult[]; total: number; page: number; limit: number }> {
    this.logger.log(`Search: "${query}"${type ? ` [type: ${type}]` : ''}`);

    if (!query || query.trim().length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const q = query.toLowerCase();
    const contentTypes = type ? [type] : ['post', 'page'];
    const allResults: SearchResult[] = [];

    for (const ct of contentTypes) {
      const result = await this.contentService.findByType(ct, 'publish', 1, 100);
      for (const entry of result.items) {
        const titleMatch = entry.title.toLowerCase().includes(q);
        const slugMatch = entry.slug.toLowerCase().includes(q);
        const contentMatch = entry.content.toLowerCase().includes(q);

        if (titleMatch || slugMatch || contentMatch) {
          let score = 0;
          if (titleMatch) score += 10;
          if (slugMatch) score += 5;
          if (contentMatch) score += 1;

          allResults.push({
            id: entry.id,
            type: ct,
            title: entry.title,
            excerpt: entry.excerpt,
            url: `/content/${ct}/${entry.slug}`,
            score,
          });
        }
      }
    }

    allResults.sort((a, b) => b.score - a.score);

    const total = allResults.length;
    const start = (page - 1) * limit;
    const items = allResults.slice(start, start + limit);

    return { items, total, page, limit };
  }

  async reindex(): Promise<{ indexed: number }> {
    this.logger.log('Search index rebuilt');
    return { indexed: 0 };
  }
}
