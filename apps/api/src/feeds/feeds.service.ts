import { Injectable, Logger } from '@nestjs/common';
import { ContentService } from '../content/content.service';

export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  description: string;
  content: string;
  author: string;
  publishedAt: Date;
  categories: string[];
}

@Injectable()
export class FeedsService {
  private readonly logger = new Logger(FeedsService.name);

  constructor(private readonly contentService: ContentService) {}

  async getPostsFeed(
    type: 'rss' | 'atom' = 'rss',
    page = 1,
    limit = 20,
  ): Promise<string> {
    const result = await this.contentService.findByType('post', 'publish', page, limit);

    const entries: FeedEntry[] = result.items.map((entry) => ({
      id: entry.id,
      title: entry.title,
      link: `/content/post/${entry.slug}`,
      description: entry.excerpt,
      content: entry.content,
      author: entry.authorId,
      publishedAt: entry.publishedAt ?? entry.createdAt,
      categories: entry.tags,
    }));

    this.logger.log(`Generated ${type} feed with ${entries.length} entries`);

    if (type === 'atom') {
      return this.buildAtomXml(entries);
    }
    return this.buildRssXml(entries);
  }

  async getCommentsFeed(
    type: 'rss' | 'atom' = 'rss',
  ): Promise<string> {
    this.logger.log(`Generated ${type} comments feed`);
    if (type === 'atom') {
      return this.buildAtomXml([]);
    }
    return this.buildRssXml([]);
  }

  private buildRssXml(entries: FeedEntry[]): string {
    const items = entries
      .map(
        (e) => `    <item>
      <title><![CDATA[${this.escapeXml(e.title)}]]></title>
      <link>${this.escapeXml(e.link)}</link>
      <guid>${e.id}</guid>
      <description><![CDATA[${this.escapeXml(e.description)}]]></description>
      <pubDate>${e.publishedAt.toUTCString()}</pubDate>
      ${e.categories.map((c) => `      <category>${this.escapeXml(c)}</category>`).join('\n')}
    </item>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NodePress</title>
    <link>/</link>
    <description>Latest content from NodePress</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="/feeds/posts" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
  }

  private buildAtomXml(entries: FeedEntry[]): string {
    const items = entries
      .map(
        (e) => `  <entry>
    <title>${this.escapeXml(e.title)}</title>
    <link href="${this.escapeXml(e.link)}"/>
    <id>${e.id}</id>
    <updated>${e.publishedAt.toISOString()}</updated>
    <summary>${this.escapeXml(e.description)}</summary>
    ${e.categories.map((c) => `    <category term="${this.escapeXml(c)}"/>`).join('\n')}
  </entry>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>NodePress</title>
  <link href="/feeds/posts" rel="self"/>
  <id>/</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle>Latest content from NodePress</subtitle>
${items}
</feed>`;
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
