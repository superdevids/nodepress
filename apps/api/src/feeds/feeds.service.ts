import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SettingsService } from '../settings/settings.service';

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

export interface CommentFeedEntry {
  id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  entryTitle: string;
  entryLink: string;
  createdAt: Date;
}

@Injectable()
export class FeedsService {
  private readonly logger = new Logger(FeedsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async getPostsFeed(type: 'rss' | 'atom' = 'rss', page = 1, limit = 20): Promise<string> {
    const [entries, total] = await Promise.all([
      this.prisma.contentEntry.findMany({
        where: { status: 'PUBLISHED' },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: { contentType: true, author: true },
      }),
      this.prisma.contentEntry.count({ where: { status: 'PUBLISHED' } }),
    ]);

    const feedEntries: FeedEntry[] = entries.map((entry) => {
      const data = entry.data as Record<string, unknown>;
      return {
        id: entry.id,
        title: (data.title as string) ?? '',
        link: `/content/post/${entry.slug}`,
        description: entry.excerpt ?? '',
        content: (data.content as string) ?? '',
        author: entry.author.name,
        publishedAt: entry.publishedAt ?? entry.createdAt,
        categories: (data.tags as string[]) ?? [],
      };
    });

    this.logger.log(`Generated ${type} feed with ${feedEntries.length} entries (total: ${total})`);

    if (type === 'atom') {
      return this.buildAtomXml(feedEntries);
    }
    return this.buildRssXml(feedEntries);
  }

  async getCommentsFeed(type: 'rss' | 'atom' = 'rss'): Promise<string> {
    const comments = await this.prisma.comment.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { entry: { select: { slug: true, data: true } } },
    });

    const entries: CommentFeedEntry[] = comments.map((c) => {
      const entryData = c.entry.data as Record<string, unknown>;
      return {
        id: c.id,
        authorName: c.authorName,
        authorEmail: c.authorEmail,
        content: c.content,
        entryTitle: (entryData.title as string) ?? 'Untitled',
        entryLink: `/content/post/${c.entry.slug}`,
        createdAt: c.createdAt,
      };
    });

    this.logger.log(`Generated ${type} comments feed with ${entries.length} entries`);

    if (type === 'atom') {
      return this.buildCommentsAtomXml(entries);
    }
    return this.buildCommentsRssXml(entries);
  }

  private async getSiteTitle(): Promise<string> {
    try {
      const group = await this.settingsService.getGroup('general');
      const title = group.values['siteTitle'];
      if (title && typeof title === 'string' && title.length > 0) {
        return title;
      }
    } catch {
      // Fall through to default
    }
    return 'NodePress';
  }

  private async getSiteUrl(): Promise<string> {
    try {
      const group = await this.settingsService.getGroup('general');
      const url = group.values['siteUrl'];
      if (url && typeof url === 'string' && url.length > 0) {
        return url;
      }
    } catch {
      // Fall through to default
    }
    return '/';
  }

  private async buildRssXml(entries: FeedEntry[]): Promise<string> {
    const [siteTitle, siteUrl] = await Promise.all([this.getSiteTitle(), this.getSiteUrl()]);

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
    <title>${this.escapeXml(siteTitle)}</title>
    <link>${this.escapeXml(siteUrl)}</link>
    <description>Latest content from ${this.escapeXml(siteTitle)}</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="/feeds/posts" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
  }

  private async buildAtomXml(entries: FeedEntry[]): Promise<string> {
    const [siteTitle, siteUrl] = await Promise.all([this.getSiteTitle(), this.getSiteUrl()]);

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
  <title>${this.escapeXml(siteTitle)}</title>
  <link href="/feeds/posts" rel="self"/>
  <id>${this.escapeXml(siteUrl)}</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle>Latest content from ${this.escapeXml(siteTitle)}</subtitle>
${items}
</feed>`;
  }

  private async buildCommentsRssXml(entries: CommentFeedEntry[]): Promise<string> {
    const [siteTitle, siteUrl] = await Promise.all([this.getSiteTitle(), this.getSiteUrl()]);

    const items = entries
      .map(
        (e) => `    <item>
      <title><![CDATA[Comment on ${this.escapeXml(e.entryTitle)}]]></title>
      <link>${this.escapeXml(e.entryLink)}</link>
      <guid>${e.id}</guid>
      <description><![CDATA[${this.escapeXml(e.content)}]]></description>
      <pubDate>${e.createdAt.toUTCString()}</pubDate>
      <author>${this.escapeXml(e.authorEmail)} (${this.escapeXml(e.authorName)})</author>
    </item>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${this.escapeXml(siteTitle)} - Recent Comments</title>
    <link>${this.escapeXml(siteUrl)}</link>
    <description>Recent comments on ${this.escapeXml(siteTitle)}</description>
    <language>en-US</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="/feeds/comments" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
  }

  private async buildCommentsAtomXml(entries: CommentFeedEntry[]): Promise<string> {
    const [siteTitle, siteUrl] = await Promise.all([this.getSiteTitle(), this.getSiteUrl()]);

    const items = entries
      .map(
        (e) => `  <entry>
    <title>Comment on ${this.escapeXml(e.entryTitle)}</title>
    <link href="${this.escapeXml(e.entryLink)}"/>
    <id>${e.id}</id>
    <updated>${e.createdAt.toISOString()}</updated>
    <summary>${this.escapeXml(e.content)}</summary>
    <author>
      <name>${this.escapeXml(e.authorName)}</name>
      <email>${this.escapeXml(e.authorEmail)}</email>
    </author>
  </entry>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${this.escapeXml(siteTitle)} - Recent Comments</title>
  <link href="/feeds/comments" rel="self"/>
  <id>${this.escapeXml(siteUrl)}</id>
  <updated>${new Date().toISOString()}</updated>
  <subtitle>Recent comments on ${this.escapeXml(siteTitle)}</subtitle>
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
