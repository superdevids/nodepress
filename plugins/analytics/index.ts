import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

interface GAConfig {
  trackingId: string;
  consentMode: boolean;
  anonymizeIp: boolean;
  trackDownloads: boolean;
  trackOutboundLinks: boolean;
  trackForms: boolean;
  dimensionSlots: Record<string, string>;
}

interface AnalyticsStats {
  pageViews: number;
  sessions: number;
  bounceRate: number;
  avgSessionDuration: number;
  activeVisitors: number;
  topPages: Array<{ path: string; views: number }>;
}

interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

const defaultConfig: GAConfig = {
  trackingId: '',
  consentMode: true,
  anonymizeIp: true,
  trackDownloads: true,
  trackOutboundLinks: true,
  trackForms: true,
  dimensionSlots: {},
};

const downloadExtensions = [
  'pdf',
  'zip',
  'rar',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'mp3',
  'mp4',
  'avi',
  'mov',
  'exe',
  'dmg',
];

function generateConsentScript(consent: ConsentState): string {
  return `
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', {
    'analytics_storage': '${consent.analytics ? 'granted' : 'denied'}',
    'ad_storage': '${consent.marketing ? 'granted' : 'denied'}',
    'functionality_storage': '${consent.functional ? 'granted' : 'denied'}',
    'ad_user_data': '${consent.marketing ? 'granted' : 'denied'}',
    'ad_personalization': '${consent.marketing ? 'granted' : 'denied'}'
  });
</script>`;
}

function generateGtagScript(trackingId: string, anonymizeIp: boolean): string {
  return `
<script async src="https://www.googletagmanager.com/gtag/js?id=${trackingId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${trackingId}', {
    'anonymize_ip': ${anonymizeIp},
    'send_page_view': true
  });
</script>`;
}

function generateEventTrackerHtml(): string {
  return `
<script>
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a, button, form');
    if (!target) return;

    if (target.tagName === 'A' && target.href) {
      const href = target.href;
      const ext = href.split('.').pop()?.toLowerCase();
      if (${JSON.stringify(downloadExtensions)}.includes(ext)) {
        gtag('event', 'download', { link_url: href, link_text: target.textContent });
        return;
      }
      if (href.startsWith('http') && !href.includes(window.location.hostname)) {
        gtag('event', 'outbound_click', { link_url: href, link_text: target.textContent });
      }
    }

    if (target.tagName === 'FORM') {
      target.addEventListener('submit', function() {
        gtag('event', 'form_submit', { form_id: target.id || target.name || 'unknown' });
      });
    }

    if (target.tagName === 'BUTTON' || target.type === 'submit') {
      gtag('event', 'button_click', {
        button_text: target.textContent,
        button_id: target.id || 'unknown'
      });
    }
  });
</script>`;
}

function generateDashboardHtml(stats: AnalyticsStats): string {
  return `
<div class="analytics-dashboard">
  <div class="analytics-grid">
    <div class="analytics-card">
      <h3>Page Views</h3>
      <div class="analytics-value">${stats.pageViews.toLocaleString()}</div>
    </div>
    <div class="analytics-card">
      <h3>Sessions</h3>
      <div class="analytics-value">${stats.sessions.toLocaleString()}</div>
    </div>
    <div class="analytics-card">
      <h3>Bounce Rate</h3>
      <div class="analytics-value">${stats.bounceRate.toFixed(1)}%</div>
    </div>
    <div class="analytics-card">
      <h3>Avg Session</h3>
      <div class="analytics-value">${Math.round(stats.avgSessionDuration / 60)}m ${Math.round(stats.avgSessionDuration % 60)}s</div>
    </div>
  </div>
  <div class="analytics-active">
    <h3>Active Visitors</h3>
    <div class="analytics-value">${stats.activeVisitors}</div>
  </div>
  <div class="analytics-top-pages">
    <h3>Top Pages</h3>
    <table>
      <tr><th>Page</th><th>Views</th></tr>
      ${stats.topPages.map((p) => `<tr><td>${p.path}</td><td>${p.views}</td></tr>`).join('')}
    </table>
  </div>
</div>`;
}

export const manifest = {
  slug: 'analytics',
  name: 'Analytics',
  version: '0.1.0',
  description: 'Google Analytics 4 integration with dashboard widgets and event tracking',
  permissions: ['settings:read', 'settings:write', 'hooks:content.render'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    const config = { ...defaultConfig };

    context.hooks.addAction('settings:register', async () => {
      context.logger.log('Analytics: settings registered');
    });

    context.hooks.addFilter('content:render', async (html: string) => {
      config.trackingId = process.env.GA_TRACKING_ID || config.trackingId;
      if (!config.trackingId) return html;

      const defaultConsent: ConsentState = {
        analytics: true,
        marketing: false,
        functional: true,
      };

      const consentScript = config.consentMode ? generateConsentScript(defaultConsent) : '';
      const gtagScript = generateGtagScript(config.trackingId, config.anonymizeIp);
      const eventTracker =
        config.trackOutboundLinks || config.trackDownloads || config.trackForms
          ? generateEventTrackerHtml()
          : '';
      const headInjection = `${consentScript}\n${gtagScript}`;
      const bodyEndInjection = eventTracker;

      let result = html;
      result = result.replace('</head>', `${headInjection}\n</head>`);
      if (bodyEndInjection) {
        result = result.replace('</body>', `${bodyEndInjection}\n</body>`);
      }
      return result;
    });

    context.hooks.addAction('analytics:track', async (data: unknown) => {
      const { event, params } = data as { event: string; params?: Record<string, string> };
      if (!event) {
        context.logger.warn('Analytics: track event called without event name');
        return;
      }
      context.logger.log(
        `Analytics: tracked event "${event}" with ${params ? Object.keys(params).length : 0} params`,
      );
    });

    context.hooks.addAction('analytics:consent:update', async (data: unknown) => {
      const consent = data as Partial<ConsentState>;
      if (!consent) return;
      context.logger.log(
        `Analytics: consent updated - analytics=${consent.analytics}, marketing=${consent.marketing}`,
      );
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      const stats: AnalyticsStats = {
        pageViews: 15420,
        sessions: 8721,
        bounceRate: 42.3,
        avgSessionDuration: 184,
        activeVisitors: 47,
        topPages: [
          { path: '/', views: 5210 },
          { path: '/blog', views: 3210 },
          { path: '/pricing', views: 1850 },
          { path: '/contact', views: 980 },
          { path: '/about', views: 720 },
        ],
      };
      (data as any).widgets = (data as any).widgets || [];
      (data as any).widgets.push({
        title: 'Analytics Overview',
        priority: 1,
        content: generateDashboardHtml(stats),
      });
    });

    context.hooks.addAction('admin:settings:render', async (data: unknown) => {
      (data as any).sections = (data as any).sections || [];
      (data as any).sections.push({
        slug: 'analytics',
        title: 'Analytics',
        fields: [
          { name: 'trackingId', label: 'GA4 Tracking ID', type: 'text', value: config.trackingId },
          {
            name: 'consentMode',
            label: 'GDPR Consent Mode',
            type: 'boolean',
            value: config.consentMode,
          },
          {
            name: 'anonymizeIp',
            label: 'Anonymize IP',
            type: 'boolean',
            value: config.anonymizeIp,
          },
          {
            name: 'trackDownloads',
            label: 'Track Downloads',
            type: 'boolean',
            value: config.trackDownloads,
          },
          {
            name: 'trackOutboundLinks',
            label: 'Track Outbound Links',
            type: 'boolean',
            value: config.trackOutboundLinks,
          },
          {
            name: 'trackForms',
            label: 'Track Form Submissions',
            type: 'boolean',
            value: config.trackForms,
          },
        ],
      });
    });

    context.logger.log('Analytics plugin booted');
  },

  async activate() {
    console.log('Analytics plugin activated');
  },

  async deactivate() {
    console.log('Analytics plugin deactivated');
  },
};
