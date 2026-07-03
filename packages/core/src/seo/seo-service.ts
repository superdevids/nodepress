export interface SeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterSite?: string;
  noindex?: boolean;
  nofollow?: boolean;
  schemaType?: 'Article' | 'Product' | 'BlogPosting' | 'WebPage' | 'Organization';
}

export interface SeoContentEntry {
  slug: string;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  data?: {
    title?: string;
    excerpt?: string;
    authorName?: string;
    [key: string]: unknown;
  };
}

export class SeoService {
  generateMetaTags(entry: SeoContentEntry, seo: SeoMetadata, siteUrl: string): string {
    const tags: string[] = [];
    const title = seo.metaTitle || entry.data?.title || '';
    const description = seo.metaDescription || entry.data?.excerpt || '';

    tags.push(`<title>${this.escapeHtml(title)}</title>`);
    tags.push(`<meta name="description" content="${this.escapeHtml(description)}" />`);

    tags.push(`<meta property="og:title" content="${this.escapeHtml(seo.ogTitle || title)}" />`);
    tags.push(`<meta property="og:description" content="${this.escapeHtml(seo.ogDescription || description)}" />`);
    tags.push(`<meta property="og:type" content="article" />`);
    tags.push(`<meta property="og:url" content="${this.escapeHtml(seo.canonicalUrl || `${siteUrl}/${entry.slug}`)}" />`);
    if (seo.ogImage) tags.push(`<meta property="og:image" content="${this.escapeHtml(seo.ogImage)}" />`);

    tags.push(`<meta name="twitter:card" content="${seo.twitterCard || 'summary_large_image'}" />`);
    tags.push(`<meta name="twitter:title" content="${this.escapeHtml(seo.ogTitle || title)}" />`);
    tags.push(`<meta name="twitter:description" content="${this.escapeHtml(seo.ogDescription || description)}" />`);
    if (seo.ogImage) tags.push(`<meta name="twitter:image" content="${this.escapeHtml(seo.ogImage)}" />`);
    if (seo.twitterSite) tags.push(`<meta name="twitter:site" content="${this.escapeHtml(seo.twitterSite)}" />`);

    if (seo.noindex || seo.nofollow) {
      const content = [
        seo.noindex ? 'noindex' : '',
        seo.nofollow ? 'nofollow' : '',
      ].filter(Boolean).join(', ');
      tags.push(`<meta name="robots" content="${content}" />`);
    }

    if (seo.canonicalUrl) {
      tags.push(`<link rel="canonical" href="${this.escapeHtml(seo.canonicalUrl)}" />`);
    }

    return tags.join('\n');
  }

  generateSitemap(entries: Array<{ slug: string; updatedAt: Date; contentType: string }>, siteUrl: string): string {
    const urls = entries.map(e => `  <url>
    <loc>${siteUrl}/${e.slug}</loc>
    <lastmod>${e.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }

  generateRobotsTxt(siteUrl: string, sitemapUrl: string): string {
    return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /_next/

Sitemap: ${sitemapUrl}

# Host
Host: ${siteUrl}
`;
  }

  generateSchemaOrg(entry: SeoContentEntry, seo: SeoMetadata, siteUrl: string): string {
    const schemaType = seo.schemaType || 'Article';
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      headline: entry.data?.title || '',
      description: entry.data?.excerpt || '',
      url: `${siteUrl}/${entry.slug}`,
      datePublished: entry.publishedAt?.toISOString(),
      dateModified: entry.updatedAt?.toISOString(),
      author: { '@type': 'Person', name: entry.data?.authorName || 'Unknown' },
    };

    if (seo.ogImage) {
      schema.image = seo.ogImage;
    }

    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
