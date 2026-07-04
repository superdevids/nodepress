import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';

export const manifest = {
  slug: 'seo',
  name: 'SEO',
  version: '0.1.0',
  description: 'Advanced SEO tools for NodePress — meta tags, sitemap, schema.org, and more.',
  permissions: ['content:read', 'content:write', 'settings:read', 'settings:write'],
};

export const lifecycle: PluginLifecycle = {
  async boot(ctx: PluginContext) {
    ctx.logger.log('SEO plugin booting');

    ctx.hooks.addFilter('content:beforeRender', (content: unknown) => {
      try {
        const entry = content as Record<string, unknown>;
        const seo = (entry.seo ?? {}) as Record<string, unknown>;
        const metaTitle = (seo.metaTitle as string) || (entry.title as string) || '';
        const metaDesc =
          (seo.metaDescription as string) || ((entry.excerpt as string) ?? '').slice(0, 160);
        const canonical = (seo.canonicalUrl as string) || '';
        const ogImage = (seo.ogImage as string) || '';
        const noindex = seo.noindex === true;
        const nofollow = seo.nofollow === true;

        const robots = [noindex ? 'noindex' : 'index', nofollow ? 'nofollow' : 'follow']
          .filter(Boolean)
          .join(', ');

        return {
          ...entry,
          meta: {
            title: metaTitle,
            description: metaDesc,
            ogTitle: metaTitle,
            ogDescription: metaDesc,
            ogImage,
            ogType: 'article',
            twitterCard: 'summary_large_image',
            twitterTitle: metaTitle,
            twitterDescription: metaDesc,
            twitterImage: ogImage,
            canonical,
            robots,
          },
        };
      } catch (err) {
        ctx.logger.warn(
          `SEO: content:beforeRender error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        return content;
      }
    });

    ctx.hooks.addAction('seo:sitemap:generate', async (entries: unknown) => {
      try {
        const items = entries as Array<Record<string, unknown>>;
        const baseUrl =
          (typeof process !== 'undefined' && process.env.APP_URL) || 'http://localhost:3000';

        const urls = items.map((e) => {
          const lastmod =
            (e.updatedAt as string) || (e.publishedAt as string) || new Date().toISOString();
          const priority = (e.seo as Record<string, unknown>)?.sitemapPriority ?? 0.5;
          const changefreq = (e.seo as Record<string, unknown>)?.sitemapChangefreq ?? 'weekly';
          return `  <url>\n    <loc>${baseUrl}/${e.slug as string}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
        });

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

        ctx.logger.log(`Sitemap generated with ${items.length} entries`);
        return sitemap;
      } catch (err) {
        ctx.logger.warn(
          `SEO: sitemap:generate error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        return '';
      }
    });

    ctx.hooks.addFilter('seo:schema', (schema: unknown, entry: unknown) => {
      try {
        const e = entry as Record<string, unknown>;
        const existing = (schema as Record<string, unknown>) ?? {};
        const seoSchema = (e.seo as Record<string, unknown>)?.schema as
          Record<string, unknown> | undefined;

        return {
          '@context': 'https://schema.org',
          '@type': seoSchema?.['@type'] || 'Article',
          headline: e.title as string,
          description: ((e.excerpt as string) ?? '').slice(0, 160),
          datePublished: e.publishedAt as string,
          dateModified: e.updatedAt as string,
          author: e.authorName ? { '@type': 'Person', name: e.authorName as string } : undefined,
          image: ((e.seo as Record<string, unknown>)?.ogImage as string) || undefined,
          url: `/${e.slug as string}`,
          ...existing,
        };
      } catch (err) {
        ctx.logger.warn(
          `SEO: seo:schema error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        return schema;
      }
    });

    ctx.hooks.addAction('admin:metaBox:register', (boxes: unknown) => {
      try {
        const list = boxes as Array<Record<string, unknown>>;
        list.push({
          id: 'seo-metabox',
          title: 'SEO Settings',
          screen: 'content',
          context: 'side',
          priority: 'high',
          fields: [
            { name: 'metaTitle', label: 'Meta Title', type: 'text', maxlength: 60 },
            {
              name: 'metaDescription',
              label: 'Meta Description',
              type: 'textarea',
              maxlength: 160,
            },
            { name: 'ogImage', label: 'OG Image', type: 'media' },
            { name: 'canonicalUrl', label: 'Canonical URL', type: 'url' },
            { name: 'noindex', label: 'Hide from search engines', type: 'checkbox' },
            { name: 'nofollow', label: 'Hide link authority', type: 'checkbox' },
            {
              name: 'sitemapPriority',
              label: 'Sitemap Priority',
              type: 'select',
              options: [
                { label: '0.1', value: '0.1' },
                { label: '0.2', value: '0.2' },
                { label: '0.3', value: '0.3' },
                { label: '0.4', value: '0.4' },
                { label: '0.5', value: '0.5' },
                { label: '0.6', value: '0.6' },
                { label: '0.7', value: '0.7' },
                { label: '0.8', value: '0.8' },
                { label: '0.9', value: '0.9' },
                { label: '1.0', value: '1.0' },
              ],
            },
            {
              name: 'sitemapChangefreq',
              label: 'Change Frequency',
              type: 'select',
              options: [
                { label: 'Always', value: 'always' },
                { label: 'Hourly', value: 'hourly' },
                { label: 'Daily', value: 'daily' },
                { label: 'Weekly', value: 'weekly' },
                { label: 'Monthly', value: 'monthly' },
                { label: 'Yearly', value: 'yearly' },
                { label: 'Never', value: 'never' },
              ],
            },
            {
              name: 'schema',
              label: 'Schema.org Type',
              type: 'select',
              options: [
                { label: 'Article', value: 'Article' },
                { label: 'BlogPosting', value: 'BlogPosting' },
                { label: 'NewsArticle', value: 'NewsArticle' },
                { label: 'Product', value: 'Product' },
                { label: 'Recipe', value: 'Recipe' },
                { label: 'Event', value: 'Event' },
                { label: 'Organization', value: 'Organization' },
                { label: 'Person', value: 'Person' },
                { label: 'FAQPage', value: 'FAQPage' },
                { label: 'HowTo', value: 'HowTo' },
              ],
            },
          ],
        });
      } catch (err) {
        ctx.logger.warn(
          `SEO: admin:metaBox:register error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    ctx.hooks.addAction('seo:redirect:register', (redirects: unknown) => {
      try {
        ctx.logger.log('SEO redirects registered');
      } catch (err) {
        ctx.logger.warn(
          `SEO: redirect:register error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    ctx.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      try {
        (data as any).widgets = (data as any).widgets || [];
        (data as any).widgets.push({
          title: 'SEO Overview',
          priority: 5,
          content:
            '<div class="seo-widget"><p>SEO plugin active — meta tags, sitemap, schema.org enabled.</p></div>',
        });
      } catch (err) {
        ctx.logger.warn(
          `SEO: admin:dashboard:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    ctx.hooks.addAction('admin:settings:render', async (data: unknown) => {
      try {
        (data as any).sections = (data as any).sections || [];
        (data as any).sections.push({
          slug: 'seo',
          title: 'SEO',
          fields: [
            { name: 'metaTitle', label: 'Default Meta Title', type: 'text', value: '' },
            {
              name: 'metaDescription',
              label: 'Default Meta Description',
              type: 'textarea',
              value: '',
            },
          ],
        });
      } catch (err) {
        ctx.logger.warn(
          `SEO: admin:settings:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    ctx.logger.log('SEO plugin booted');
  },

  async activate(ctx: PluginContext) {
    ctx.logger.log('SEO plugin activated');
  },

  async deactivate(ctx: PluginContext) {
    ctx.logger.log('SEO plugin deactivated');
  },

  async uninstall(ctx: PluginContext) {
    ctx.logger.log('SEO plugin uninstalled');
  },
};
