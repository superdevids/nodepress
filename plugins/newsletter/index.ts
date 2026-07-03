import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

interface Subscriber {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'unsubscribed' | 'bounced' | 'pending';
  subscribedAt: string;
  unsubscribedAt?: string;
  lists: string[];
  metadata: Record<string, string>;
}

interface Campaign {
  id: string;
  subject: string;
  previewText: string;
  bodyHtml: string;
  listIds: string[];
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledAt?: string;
  sentAt?: string;
  stats: CampaignStats;
}

interface CampaignStats {
  recipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  isDefault: boolean;
}

interface MailProvider {
  type: 'smtp' | 'ses' | 'sendgrid' | 'resend';
  fromAddress: string;
  fromName: string;
  config: Record<string, string>;
}

const subscribers: Subscriber[] = [
  {
    id: 'sub-001',
    email: 'admin@example.com',
    name: 'Admin User',
    status: 'active',
    subscribedAt: '2025-01-15T08:00:00Z',
    lists: ['general', 'updates'],
    metadata: {},
  },
  {
    id: 'sub-002',
    email: 'user@example.com',
    name: 'Test User',
    status: 'active',
    subscribedAt: '2025-02-20T10:30:00Z',
    lists: ['general'],
    metadata: { source: 'signup-form' },
  },
];

const campaigns: Campaign[] = [];
const templates: EmailTemplate[] = [
  {
    id: 'tpl-default',
    name: 'Default Newsletter',
    subject: '{{subject}}',
    bodyHtml:
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto"><header style="background:#1a1a2e;color:white;padding:20px;text-align:center"><h1>NodePress</h1></header><main style="padding:20px">{{content}}</main><footer style="border-top:1px solid #eee;padding:10px;font-size:12px;color:#999;text-align:center"><p>You received this email because you subscribed. <a href="{{unsubscribe_url}}">Unsubscribe</a></p></footer></body></html>',
    isDefault: true,
  },
];

const mailProvider: MailProvider = {
  type: 'smtp',
  fromAddress: 'noreply@example.com',
  fromName: 'NodePress Newsletter',
  config: { host: 'localhost', port: '587', user: '', pass: '' },
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  console.log(`[${mailProvider.type.toUpperCase()}] Sending email to ${to}: "${subject}"`);
  return true;
}

function processTemplate(template: EmailTemplate, vars: Record<string, string>): string {
  let html = template.bodyHtml;
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return html;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

export const manifest = {
  slug: 'newsletter',
  name: 'Newsletter',
  version: '0.1.0',
  description:
    'Email list management, campaign creation, SMTP/SES/SendGrid sending, and subscriber analytics',
  permissions: ['settings:read', 'settings:write', 'content:read', 'content:write'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.hooks.addAction('newsletter:subscribe', async (data: unknown) => {
      const { email, name, list } = data as { email: string; name?: string; list?: string };
      if (!email || !validateEmail(email)) {
        context.logger.warn(`Newsletter: Invalid email address: ${email}`);
        return;
      }
      const existing = subscribers.find((s) => s.email === email);
      if (existing) {
        if (existing.status === 'unsubscribed') {
          existing.status = 'active';
          existing.unsubscribedAt = undefined;
          context.logger.log(`Newsletter: ${email} re-subscribed`);
        }
        if (list && !existing.lists.includes(list)) existing.lists.push(list);
        return;
      }
      subscribers.push({
        id: generateId('sub'),
        email,
        name: name || email.split('@')[0],
        status: 'active',
        subscribedAt: new Date().toISOString(),
        lists: list ? [list] : ['general'],
        metadata: {},
      });
      context.logger.log(`Newsletter: ${email} subscribed to ${list || 'general'}`);
    });

    context.hooks.addAction('newsletter:unsubscribe', async (data: unknown) => {
      const { email, list } = data as { email: string; list?: string };
      if (!email) {
        context.logger.warn('Newsletter: Unsubscribe called without email');
        return;
      }
      const sub = subscribers.find((s) => s.email === email);
      if (!sub) {
        context.logger.warn(`Newsletter: ${email} not found`);
        return;
      }
      if (list) {
        sub.lists = sub.lists.filter((l) => l !== list);
        context.logger.log(`Newsletter: ${email} removed from list ${list}`);
        if (sub.lists.length === 0) {
          sub.status = 'unsubscribed';
          sub.unsubscribedAt = new Date().toISOString();
        }
      } else {
        sub.status = 'unsubscribed';
        sub.unsubscribedAt = new Date().toISOString();
        sub.lists = [];
        context.logger.log(`Newsletter: ${email} fully unsubscribed`);
      }
    });

    context.hooks.addAction('newsletter:campaign:create', async (data: unknown) => {
      const { subject, bodyHtml, listIds, scheduledAt } = data as {
        subject: string;
        bodyHtml: string;
        listIds: string[];
        scheduledAt?: string;
      };
      if (!subject || !bodyHtml) {
        context.logger.warn('Newsletter: Campaign requires subject and body');
        return;
      }
      const campaign: Campaign = {
        id: generateId('cmp'),
        subject,
        previewText: bodyHtml.replace(/<[^>]+>/g, '').slice(0, 150),
        bodyHtml,
        listIds: listIds || ['general'],
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt,
        stats: {
          recipients: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          unsubscribed: 0,
          bounced: 0,
          openRate: 0,
          clickRate: 0,
          unsubscribeRate: 0,
        },
      };
      campaigns.push(campaign);
      context.logger.log(`Newsletter: Campaign "${subject}" created (${campaign.id})`);
    });

    context.hooks.addAction('newsletter:campaign:send', async (data: unknown) => {
      const { campaignId } = data as { campaignId: string };
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) {
        context.logger.warn(`Newsletter: Campaign ${campaignId} not found`);
        return;
      }
      campaign.status = 'sending';
      const targetSubs = subscribers.filter(
        (s) => s.status === 'active' && s.lists.some((l) => campaign.listIds.includes(l)),
      );
      campaign.stats.recipients = targetSubs.length;
      let delivered = 0;
      for (const sub of targetSubs) {
        const html = processTemplate(
          templates.find((t) => t.isDefault)!,
          {
            subject: campaign.subject,
            content: campaign.bodyHtml,
            unsubscribe_url: `https://example.com/unsubscribe?email=${encodeURIComponent(sub.email)}`,
            name: sub.name,
            email: sub.email,
          },
        );
        const success = await sendEmail(sub.email, campaign.subject, html);
        if (success) delivered++;
        else {
          sub.status = 'bounced';
          campaign.stats.bounced++;
        }
      }
      campaign.stats.delivered = delivered;
      campaign.status = 'sent';
      campaign.sentAt = new Date().toISOString();
      campaign.stats.openRate =
        campaign.stats.delivered > 0 ? (campaign.stats.opened / campaign.stats.delivered) * 100 : 0;
      campaign.stats.clickRate =
        campaign.stats.delivered > 0
          ? (campaign.stats.clicked / campaign.stats.delivered) * 100
          : 0;
      campaign.stats.unsubscribeRate =
        campaign.stats.delivered > 0
          ? (campaign.stats.unsubscribed / campaign.stats.delivered) * 100
          : 0;
      context.logger.log(
        `Newsletter: Campaign "${campaign.subject}" sent to ${delivered}/${targetSubs.length} recipients`,
      );
    });

    context.hooks.addAction('newsletter:track:open', async (data: unknown) => {
      const { campaignId, subscriberEmail } = data as {
        campaignId: string;
        subscriberEmail: string;
      };
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        campaign.stats.opened++;
        campaign.stats.openRate =
          campaign.stats.delivered > 0
            ? (campaign.stats.opened / campaign.stats.delivered) * 100
            : 0;
      }
    });

    context.hooks.addAction('newsletter:track:click', async (data: unknown) => {
      const { campaignId, subscriberEmail } = data as {
        campaignId: string;
        subscriberEmail: string;
      };
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        campaign.stats.clicked++;
        campaign.stats.clickRate =
          campaign.stats.delivered > 0
            ? (campaign.stats.clicked / campaign.stats.delivered) * 100
            : 0;
      }
    });

    context.hooks.addAction('newsletter:import:csv', async (data: unknown) => {
      const { csvContent, list } = data as { csvContent: string; list?: string };
      if (!csvContent) {
        context.logger.warn('Newsletter: CSV import called without content');
        return;
      }
      const lines = csvContent.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        context.logger.warn('Newsletter: CSV has no data rows');
        return;
      }
      const headers = parseCsvLine(lines[0]);
      const emailIdx = headers.findIndex((h) => h.toLowerCase() === 'email');
      const nameIdx = headers.findIndex((h) => h.toLowerCase() === 'name');
      if (emailIdx === -1) {
        context.logger.warn('Newsletter: CSV missing email column');
        return;
      }
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const email = cols[emailIdx]?.trim();
        if (!email || !validateEmail(email)) continue;
        const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : undefined;
        subscribers.push({
          id: generateId('sub'),
          email,
          name: name || email.split('@')[0],
          status: 'pending',
          subscribedAt: new Date().toISOString(),
          lists: list ? [list] : ['general'],
          metadata: {},
        });
        imported++;
      }
      context.logger.log(`Newsletter: Imported ${imported} subscribers from CSV`);
    });

    context.hooks.addAction('newsletter:export:csv', async (data: unknown) => {
      const { list } = data as { list?: string };
      const filtered = list ? subscribers.filter((s) => s.lists.includes(list)) : subscribers;
      const csvRows = ['email,name,status,subscribed_at,lists'];
      for (const sub of filtered) {
        csvRows.push(
          `${sub.email},${sub.name},${sub.status},${sub.subscribedAt},"${sub.lists.join(';')}"`,
        );
      }
      context.logger.log(`Newsletter: Exported ${filtered.length} subscribers as CSV`);
    });

    context.hooks.addAction('newsletter:bounce:handle', async (data: unknown) => {
      const { email, reason } = data as { email: string; reason: string };
      const sub = subscribers.find((s) => s.email === email);
      if (sub) {
        sub.status = 'bounced';
        context.logger.warn(`Newsletter: Bounce handled for ${email}: ${reason}`);
      }
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      const active = subscribers.filter((s) => s.status === 'active').length;
      const totalSent = campaigns.reduce((a, c) => a + c.stats.delivered, 0);
      const avgOpenRate =
        campaigns.length > 0
          ? campaigns.reduce((a, c) => a + c.stats.openRate, 0) / campaigns.length
          : 0;
      (data as any).widgets = (data as any).widgets || [];
      (data as any).widgets.push({
        title: 'Newsletter Overview',
        priority: 6,
        content: `<div class="newsletter-widget">
          <p>Active Subscribers: ${active}</p>
          <p>Campaigns: ${campaigns.length}</p>
          <p>Total Sent: ${totalSent}</p>
          <p>Avg Open Rate: ${avgOpenRate.toFixed(1)}%</p>
          <p>Provider: ${mailProvider.type.toUpperCase()}</p>
        </div>`,
      });
    });

    context.logger.log('Newsletter plugin booted');
  },

  async activate() {
    console.log('Newsletter plugin activated');
  },

  async deactivate() {
    console.log('Newsletter plugin deactivated');
  },
};
