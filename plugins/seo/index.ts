import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

export const manifest = {
  slug: 'seo',
  name: 'SEO',
  version: '0.0.1',
  description: 'Advanced SEO tools for NodePress',
  permissions: ['content:read', 'content:write', 'settings:read', 'settings:write'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log('SEO plugin booting');

    context.hooks.addFilter('content:render', async (content: unknown, ..._args: unknown[]) => {
      let html = content as string;

      const metaTitle = _args[0] as string | undefined;
      const metaDescription = _args[1] as string | undefined;

      if (metaTitle) {
        html = html.replace(
          '</head>',
          `  <meta name="title" content="${escapeHtml(metaTitle)}" />\n  <meta property="og:title" content="${escapeHtml(metaTitle)}" />\n  <meta name="twitter:title" content="${escapeHtml(metaTitle)}" />\n</head>`,
        );
      }

      if (metaDescription) {
        html = html.replace(
          '</head>',
          `  <meta name="description" content="${escapeHtml(metaDescription)}" />\n  <meta property="og:description" content="${escapeHtml(metaDescription)}" />\n  <meta name="twitter:description" content="${escapeHtml(metaDescription)}" />\n</head>`,
        );
      }

      html = html.replace(
        '</head>',
        `  <meta name="robots" content="index, follow" />\n  <link rel="canonical" href="${getUrl()}" />\n</head>`,
      );

      return html;
    });

    context.hooks.addAction('seo:sitemap:generate', async () => {
      context.logger.log('Sitemap generation triggered');
    });

    context.logger.log('SEO plugin booted');
  },

  async activate() {
    console.log('SEO plugin activated');
  },

  async deactivate() {
    console.log('SEO plugin deactivated');
  },
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '/';
}
