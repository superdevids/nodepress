import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';
import { createPersistentStore } from '@nodepressjs/plugin-sdk';
import nodemailer from 'nodemailer';

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

// Persistent stores — initialized in boot()
let subscribersStore: import('@nodepressjs/plugin-sdk').PersistentPluginStore | null = null;
let campaignsStore: import('@nodepressjs/plugin-sdk').PersistentPluginStore | null = null;
let templatesStore: import('@nodepressjs/plugin-sdk').PersistentPluginStore | null = null;

const subscribersCache: Subscriber[] = [];
const campaignsCache: Campaign[] = [];
const templatesCache: EmailTemplate[] = [];

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

async function sendEmail(
  context: PluginContext,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: mailProvider.config.host || process.env.SMTP_HOST || 'localhost',
      port: parseInt(mailProvider.config.port || process.env.SMTP_PORT || '587', 10),
      secure: mailProvider.config.secure === 'true' || process.env.SMTP_SECURE === 'true',
      auth:
        mailProvider.config.user && mailProvider.config.pass
          ? {
              user: mailProvider.config.user || process.env.SMTP_USER || '',
              pass: mailProvider.config.pass || process.env.SMTP_PASS || '',
            }
          : undefined,
    });

    await transporter.sendMail({
      from: `"${mailProvider.fromName}" <${mailProvider.fromAddress}>`,
      to,
      subject,
      html,
    });

    context.logger.log(`[${mailProvider.type.toUpperCase()}] Sent email to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    context.logger.warn(
      `[${mailProvider.type.toUpperCase()}] Failed to send email to ${to}: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
    return false;
  }
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
    // Initialize persistent stores
    if (!subscribersStore) {
      subscribersStore = createPersistentStore(context.prisma, 'newsletter', 'subscribers');
      campaignsStore = createPersistentStore(context.prisma, 'newsletter', 'campaigns');
      templatesStore = createPersistentStore(context.prisma, 'newsletter', 'templates');
      await Promise.all([subscribersStore.load(), campaignsStore.load(), templatesStore.load()]);

      // Load existing data into caches
      const loadedSubs = await subscribersStore.getAll<Subscriber>();
      for (const v of Object.values(loadedSubs)) if (v) subscribersCache.push(v as Subscriber);

      const loadedCamps = await campaignsStore.getAll<Campaign>();
      for (const v of Object.values(loadedCamps)) if (v) campaignsCache.push(v as Campaign);

      const loadedTpls = await templatesStore.getAll<EmailTemplate>();
      if (Object.keys(loadedTpls).length > 0) {
        for (const v of Object.values(loadedTpls)) if (v) templatesCache.push(v as EmailTemplate);
      } else {
        // Seed default template
        const defaultTpl: EmailTemplate = {
          id: 'tpl-default',
          name: 'Default Newsletter',
          subject: '{{subject}}',
          bodyHtml:
            '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto"><header style="background:#1a1a2e;color:white;padding:20px;text-align:center"><h1>NodePress</h1></header><main style="padding:20px">{{content}}</main><footer style="border-top:1px solid #eee;padding:10px;font-size:12px;color:#999;text-align:center"><p>You received this email because you subscribed. <a href="{{unsubscribe_url}}">Unsubscribe</a></p></footer></body></html>',
          isDefault: true,
        };
        await templatesStore.set(defaultTpl.id, defaultTpl);
        templatesCache.push(defaultTpl);
      }
    }

    context.hooks.addAction('newsletter:subscribe', async (data: unknown) => {
      try {
        const { email, name, list } = data as { email: string; name?: string; list?: string };
        if (!email || !validateEmail(email)) {
          context.logger.warn(`Newsletter: Invalid email address: ${email}`);
          return;
        }
        const existing = subscribersCache.find((s) => s.email === email);
        if (existing) {
          if (existing.status === 'unsubscribed') {
            existing.status = 'active';
            existing.unsubscribedAt = undefined;
            context.logger.log(`Newsletter: ${email} re-subscribed`);
          }
          if (list && !existing.lists.includes(list)) existing.lists.push(list);
          await subscribersStore.set(existing.id, existing);
          return;
        }
        const newSub: Subscriber = {
          id: generateId('sub'),
          email,
          name: name || email.split('@')[0],
          status: 'active',
          subscribedAt: new Date().toISOString(),
          lists: list ? [list] : ['general'],
          metadata: {},
        };
        subscribersCache.push(newSub);
        await subscribersStore.set(newSub.id, newSub);
        context.logger.log(`Newsletter: ${email} subscribed to ${list || 'general'}`);
      } catch (err) {
        context.logger.warn(
          `Newsletter: subscribe error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:unsubscribe', async (data: unknown) => {
      try {
        const { email, list } = data as { email: string; list?: string };
        if (!email) {
          context.logger.warn('Newsletter: Unsubscribe called without email');
          return;
        }
        const sub = subscribersCache.find((s) => s.email === email);
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
        await subscribersStore.set(sub.id, sub);
      } catch (err) {
        context.logger.warn(
          `Newsletter: unsubscribe error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:campaign:create', async (data: unknown) => {
      try {
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
        campaignsCache.push(campaign);
        await campaignsStore.set(campaign.id, campaign);
        context.logger.log(`Newsletter: Campaign "${subject}" created (${campaign.id})`);
      } catch (err) {
        context.logger.warn(
          `Newsletter: campaign:create error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:campaign:send', async (data: unknown) => {
      try {
        const { campaignId } = data as { campaignId: string };
        const campaign = campaignsCache.find((c) => c.id === campaignId);
        if (!campaign) {
          context.logger.warn(`Newsletter: Campaign ${campaignId} not found`);
          return;
        }
        campaign.status = 'sending';
        const targetSubs = subscribersCache.filter(
          (s) => s.status === 'active' && s.lists.some((l) => campaign.listIds.includes(l)),
        );
        campaign.stats.recipients = targetSubs.length;
        let delivered = 0;
        for (const sub of targetSubs) {
          const html = processTemplate(
            templatesCache.find((t) => t.isDefault)!,
            {
              subject: campaign.subject,
              content: campaign.bodyHtml,
              unsubscribe_url: `https://example.com/unsubscribe?email=${encodeURIComponent(sub.email)}`,
              name: sub.name,
              email: sub.email,
            },
          );
          const success = await sendEmail(context, sub.email, campaign.subject, html);
          if (success) delivered++;
          else {
            sub.status = 'bounced';
            campaign.stats.bounced++;
            await subscribersStore.set(sub.id, sub);
          }
        }
        campaign.stats.delivered = delivered;
        campaign.status = 'sent';
        campaign.sentAt = new Date().toISOString();
        campaign.stats.openRate =
          campaign.stats.delivered > 0
            ? (campaign.stats.opened / campaign.stats.delivered) * 100
            : 0;
        campaign.stats.clickRate =
          campaign.stats.delivered > 0
            ? (campaign.stats.clicked / campaign.stats.delivered) * 100
            : 0;
        campaign.stats.unsubscribeRate =
          campaign.stats.delivered > 0
            ? (campaign.stats.unsubscribed / campaign.stats.delivered) * 100
            : 0;
        await campaignsStore.set(campaign.id, campaign);
        context.logger.log(
          `Newsletter: Campaign "${campaign.subject}" sent to ${delivered}/${targetSubs.length} recipients`,
        );
      } catch (err) {
        context.logger.warn(
          `Newsletter: campaign:send error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:track:open', async (data: unknown) => {
      try {
        const { campaignId, subscriberEmail } = data as {
          campaignId: string;
          subscriberEmail: string;
        };
        const campaign = campaignsCache.find((c) => c.id === campaignId);
        if (campaign) {
          campaign.stats.opened++;
          campaign.stats.openRate =
            campaign.stats.delivered > 0
              ? (campaign.stats.opened / campaign.stats.delivered) * 100
              : 0;
          await campaignsStore.set(campaign.id, campaign);
        }
      } catch (err) {
        context.logger.warn(
          `Newsletter: track:open error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:track:click', async (data: unknown) => {
      try {
        const { campaignId, subscriberEmail } = data as {
          campaignId: string;
          subscriberEmail: string;
        };
        const campaign = campaignsCache.find((c) => c.id === campaignId);
        if (campaign) {
          campaign.stats.clicked++;
          campaign.stats.clickRate =
            campaign.stats.delivered > 0
              ? (campaign.stats.clicked / campaign.stats.delivered) * 100
              : 0;
          await campaignsStore.set(campaign.id, campaign);
        }
      } catch (err) {
        context.logger.warn(
          `Newsletter: track:click error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:import:csv', async (data: unknown) => {
      try {
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
          const newSub: Subscriber = {
            id: generateId('sub'),
            email,
            name: name || email.split('@')[0],
            status: 'pending',
            subscribedAt: new Date().toISOString(),
            lists: list ? [list] : ['general'],
            metadata: {},
          };
          subscribersCache.push(newSub);
          await subscribersStore.set(newSub.id, newSub);
          imported++;
        }
        context.logger.log(`Newsletter: Imported ${imported} subscribers from CSV`);
      } catch (err) {
        context.logger.warn(
          `Newsletter: import:csv error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:export:csv', async (data: unknown) => {
      try {
        const { list } = data as { list?: string };
        const filtered = list
          ? subscribersCache.filter((s) => s.lists.includes(list))
          : subscribersCache;
        const csvRows = ['email,name,status,subscribed_at,lists'];
        for (const sub of filtered) {
          csvRows.push(
            `${sub.email},${sub.name},${sub.status},${sub.subscribedAt},"${sub.lists.join(';')}"`,
          );
        }
        context.logger.log(`Newsletter: Exported ${filtered.length} subscribers as CSV`);
      } catch (err) {
        context.logger.warn(
          `Newsletter: export:csv error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('newsletter:bounce:handle', async (data: unknown) => {
      try {
        const { email, reason } = data as { email: string; reason: string };
        const sub = subscribersCache.find((s) => s.email === email);
        if (sub) {
          sub.status = 'bounced';
          await subscribersStore.set(sub.id, sub);
          context.logger.warn(`Newsletter: Bounce handled for ${email}: ${reason}`);
        }
      } catch (err) {
        context.logger.warn(
          `Newsletter: bounce:handle error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.hooks.addAction('admin:dashboard:render', async (data: unknown) => {
      try {
        const active = subscribersCache.filter((s) => s.status === 'active').length;
        const totalSent = campaignsCache.reduce((a, c) => a + c.stats.delivered, 0);
        const avgOpenRate =
          campaignsCache.length > 0
            ? campaignsCache.reduce((a, c) => a + c.stats.openRate, 0) / campaignsCache.length
            : 0;
        (data as any).widgets = (data as any).widgets || [];
        (data as any).widgets.push({
          title: 'Newsletter Overview',
          priority: 6,
          content: `<div class="newsletter-widget">
          <p>Active Subscribers: ${active}</p>
          <p>Campaigns: ${campaignsCache.length}</p>
          <p>Total Sent: ${totalSent}</p>
          <p>Avg Open Rate: ${avgOpenRate.toFixed(1)}%</p>
          <p>Provider: ${mailProvider.type.toUpperCase()}</p>
        </div>`,
        });
      } catch (err) {
        context.logger.warn(
          `Newsletter: admin:dashboard:render error - ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    });

    context.logger.log('Newsletter plugin booted');
  },

  async activate(context: PluginContext) {
    context.logger.log('Newsletter plugin activated');
  },

  async deactivate(context: PluginContext) {
    context.logger.log('Newsletter plugin deactivated');
  },
};
