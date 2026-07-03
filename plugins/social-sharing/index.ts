import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

interface SocialNetwork {
  id: string;
  name: string;
  icon: string;
  color: string;
  shareUrl: string;
  enabled: boolean;
}

interface ShareButtonStyle {
  size: 'small' | 'medium' | 'large';
  shape: 'rounded' | 'square' | 'circle';
  showCount: boolean;
  showLabel: boolean;
  layout: 'horizontal' | 'vertical';
}

interface ShareCount {
  network: string;
  count: number;
  url: string;
}

const networks: SocialNetwork[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'fb',
    color: '#1877F2',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php?u={url}',
    enabled: true,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'tw',
    color: '#000000',
    shareUrl: 'https://twitter.com/intent/tweet?url={url}&text={title}',
    enabled: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'li',
    color: '#0A66C2',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite/?url={url}',
    enabled: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'wa',
    color: '#25D366',
    shareUrl: 'https://wa.me/?text={url}',
    enabled: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: 'tg',
    color: '#0088CC',
    shareUrl: 'https://t.me/share/url?url={url}&text={title}',
    enabled: true,
  },
  {
    id: 'email',
    name: 'Email',
    icon: 'em',
    color: '#666666',
    shareUrl: 'mailto:?subject={title}&body={url}',
    enabled: true,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: 'rd',
    color: '#FF4500',
    shareUrl: 'https://reddit.com/submit?url={url}&title={title}',
    enabled: true,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'pt',
    color: '#E60023',
    shareUrl: 'https://pinterest.com/pin/create/button/?url={url}&description={title}',
    enabled: false,
  },
];

const defaultStyle: ShareButtonStyle = {
  size: 'medium',
  shape: 'rounded',
  showCount: true,
  showLabel: false,
  layout: 'horizontal',
};

function escapeCss(str: string): string {
  return str.replace(/[^\w\-.]/g, '');
}

function generateShareButtonsHtml(
  networks: SocialNetwork[],
  style: ShareButtonStyle,
  url: string,
  title: string,
): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const sizeClass = `ss-${escapeCss(style.size)}`;
  const shapeClass = `ss-${escapeCss(style.shape)}`;
  const layoutClass = `ss-${escapeCss(style.layout)}`;

  const buttons = networks
    .filter((n) => n.enabled)
    .map((n) => {
      const shareUrl = n.shareUrl.replace('{url}', encodedUrl).replace('{title}', encodedTitle);
      return `
    <a class="ss-btn ${sizeClass} ${shapeClass}" style="background:${n.color}" href="${shareUrl}" target="_blank" rel="noopener noreferrer" data-network="${n.id}">
      <span class="ss-icon">${n.icon}</span>
      ${style.showLabel ? `<span class="ss-label">${n.name}</span>` : ''}
      ${style.showCount ? `<span class="ss-count" data-url="${escapeCss(url)}" data-network="${n.id}">0</span>` : ''}
    </a>`;
    })
    .join('\n');

  return `<div class="ss-buttons ${layoutClass}">\n${buttons}\n</div>`;
}

function generateFloatingBarHtml(
  networks: SocialNetwork[],
  style: ShareButtonStyle,
  url: string,
  title: string,
): string {
  return `<div class="ss-floating-bar ss-left">${generateShareButtonsHtml(networks, style, url, title)}</div>`;
}

function generateOgTagsHtml(
  title: string,
  description: string,
  image: string,
  url: string,
): string {
  return `
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="article" />
  ${image ? `<meta property="og:image" content="${image}" />` : ''}
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}" />
  ${image ? `<meta name="twitter:image" content="${image}" />` : ''}`;
}

const shareCounts = new Map<string, number>();

export const manifest = {
  slug: 'social-sharing',
  name: 'Social Sharing',
  version: '0.1.0',
  description:
    'Social share buttons with floating bar, inline placement, Open Graph tags, and share count tracking',
  permissions: ['settings:read', 'settings:write', 'hooks:content.render'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    const activeNetworks: SocialNetwork[] = [...networks];
    const buttonStyle: ShareButtonStyle = { ...defaultStyle };
    let showFloatingBar = false;
    let showInlineBefore = false;
    let showInlineAfter = true;
    let enhanceOgTags = true;

    function getCurrentUrl(): string {
      return typeof window !== 'undefined' ? window.location.href : '/';
    }

    function getCurrentTitle(): string {
      return typeof document !== 'undefined' ? document.title : 'NodePress';
    }

    context.hooks.addFilter('content:render', async (html: string, ...args: unknown[]) => {
      const meta = args[0] as { title?: string; description?: string; image?: string } | undefined;
      const url = getCurrentUrl();
      const title = meta?.title || getCurrentTitle();
      const description = meta?.description || '';
      const image = meta?.image || '';

      let result = html;

      if (enhanceOgTags && (meta?.title || meta?.description)) {
        result = result.replace(
          '</head>',
          `${generateOgTagsHtml(title, description, image, url)}\n</head>`,
        );
      }

      if (showFloatingBar) {
        const floatingHtml = generateFloatingBarHtml(activeNetworks, buttonStyle, url, title);
        result = result.replace('</body>', `${floatingHtml}\n</body>`);
      }

      if (showInlineBefore) {
        const inlineHtml = generateShareButtonsHtml(activeNetworks, buttonStyle, url, title);
        result = result.replace('<article', `${inlineHtml}\n<article`);
      }

      if (showInlineAfter) {
        const inlineHtml = generateShareButtonsHtml(activeNetworks, buttonStyle, url, title);
        result = result.replace('</article>', `</article>\n${inlineHtml}`);
      }

      return result;
    });

    context.hooks.addAction('social:share:track', async (data: unknown) => {
      const { network, url: sharedUrl } = data as { network: string; url: string };
      if (!network || !sharedUrl) {
        context.logger.warn('Social Sharing: track called without network or url');
        return;
      }
      const key = `${network}:${sharedUrl}`;
      shareCounts.set(key, (shareCounts.get(key) || 0) + 1);
      context.logger.log(`Social Sharing: ${network} share tracked for ${sharedUrl}`);
    });

    context.hooks.addAction('social:count:fetch', async (data: unknown) => {
      const { url, callback } = data as { url: string; callback: (counts: ShareCount[]) => void };
      const counts: ShareCount[] = [];
      for (const network of activeNetworks) {
        const key = `${network.id}:${url}`;
        const count = shareCounts.get(key) || 0;
        counts.push({ network: network.id, count, url });
      }
      if (callback) callback(counts);
    });

    context.hooks.addAction('social:networks:update', async (data: unknown) => {
      const updatedNetworks = data as SocialNetwork[];
      if (!Array.isArray(updatedNetworks)) return;
      for (const updated of updatedNetworks) {
        const existing = activeNetworks.find((n) => n.id === updated.id);
        if (existing) {
          existing.enabled = updated.enabled;
        }
      }
      context.logger.log(
        `Social Sharing: ${updatedNetworks.filter((n) => n.enabled).length} networks enabled`,
      );
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      const totalShares = Array.from(shareCounts.values()).reduce((a, b) => a + b, 0);
      (data as any).widgets = (data as any).widgets || [];
      (data as any).widgets.push({
        title: 'Social Sharing',
        priority: 10,
        content: `<div class="social-widget"><p>Total Shares Tracked: ${totalShares}</p><p>Active Networks: ${activeNetworks.filter((n) => n.enabled).length}</p><p>Layout: ${buttonStyle.layout} | Size: ${buttonStyle.size}</p></div>`,
      });
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
      (data as any).sections = (data as any).sections || [];
      (data as any).sections.push({
        slug: 'social-sharing',
        title: 'Social Sharing',
        fields: [
          {
            name: 'showFloatingBar',
            label: 'Floating Share Bar',
            type: 'boolean',
            value: showFloatingBar,
          },
          {
            name: 'showInlineBefore',
            label: 'Inline Buttons Before Content',
            type: 'boolean',
            value: showInlineBefore,
          },
          {
            name: 'showInlineAfter',
            label: 'Inline Buttons After Content',
            type: 'boolean',
            value: showInlineAfter,
          },
          {
            name: 'enhanceOgTags',
            label: 'Enhance Open Graph Tags',
            type: 'boolean',
            value: enhanceOgTags,
          },
          {
            name: 'buttonSize',
            label: 'Button Size',
            type: 'select',
            options: ['small', 'medium', 'large'],
            value: buttonStyle.size,
          },
          {
            name: 'buttonShape',
            label: 'Button Shape',
            type: 'select',
            options: ['rounded', 'square', 'circle'],
            value: buttonStyle.shape,
          },
          {
            name: 'layout',
            label: 'Layout',
            type: 'select',
            options: ['horizontal', 'vertical'],
            value: buttonStyle.layout,
          },
        ],
      });
    });

    context.logger.log('Social Sharing plugin booted');
  },

  async activate() {
    console.log('Social Sharing plugin activated');
  },

  async deactivate() {
    console.log('Social Sharing plugin deactivated');
  },
};
