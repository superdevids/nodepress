import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

export const manifest = {
  slug: 'forms',
  name: 'Forms',
  version: '0.1.0',
  description: 'Drag-and-drop form builder with contact forms, surveys, and payment collection.',
  permissions: ['content:read', 'content:write', 'settings:read', 'settings:write'],
};

interface FormFieldBase {
  id: string;
  label: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
}

interface TextField extends FormFieldBase {
  type: 'text' | 'email' | 'url' | 'tel' | 'number';
  maxlength?: number;
}
interface TextareaField extends FormFieldBase {
  type: 'textarea';
  rows?: number;
  maxlength?: number;
}
interface SelectField extends FormFieldBase {
  type: 'select' | 'multiselect' | 'radio' | 'checkbox';
  options: { label: string; value: string }[];
}
interface FileField extends FormFieldBase {
  type: 'file';
  accept?: string;
  maxSize?: number;
}
interface ConsentField extends FormFieldBase {
  type: 'consent';
  agreementText: string;
}
interface HoneypotField extends FormFieldBase {
  type: 'honeypot';
}
interface RecaptchaField extends FormFieldBase {
  type: 'recaptcha';
}
interface StripeField extends FormFieldBase {
  type: 'stripe';
  priceId: string;
  currency: string;
  amount: number;
}

type FormField =
  | TextField
  | TextareaField
  | SelectField
  | FileField
  | ConsentField
  | HoneypotField
  | RecaptchaField
  | StripeField;

interface FormDefinition {
  id: string;
  title: string;
  fields: FormField[];
  notifications: {
    enabled: boolean;
    to: string[];
    subject: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string;
  };
  confirmation: {
    type: 'message' | 'redirect' | 'page';
    message?: string;
    redirectUrl?: string;
  };
  antiSpam: {
    honeypot: boolean;
    recaptcha: boolean;
    recaptchaSiteKey?: string;
    timeThreshold: number;
    maxSubmissions: number;
  };
  payments: {
    enabled: boolean;
    stripePublicKey?: string;
    stripeSecretKey?: string;
    currency: string;
  };
  csvExport: { enabled: boolean; includeMetadata: boolean };
}

function isSpamSubmission(
  fields: Record<string, string>,
  antiSpam: FormDefinition['antiSpam'],
  submitTime: number,
): string | null {
  if (antiSpam.honeypot && fields._hp) return 'honeypot triggered';
  const elapsed = Date.now() - submitTime;
  if (elapsed < antiSpam.timeThreshold) return 'submitted too fast';
  return null;
}

function buildEmailHtml(fields: Record<string, string>, form: FormDefinition): string {
  const rows = Object.entries(fields)
    .filter(([k]) => !k.startsWith('_') && k !== 'recaptcha_token')
    .map(
      ([key, val]) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #ddd;font-weight:600">${key}</td><td style="padding:8px 12px;border-bottom:1px solid #ddd">${escapeHtml(val)}</td></tr>`,
    );
  return `<html><body style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>${escapeHtml(form.title)}</h2>
    <table style="width:100%;border-collapse:collapse">${rows.join('')}</table>
    <hr><p style="color:#888;font-size:12px">Submitted via NodePress Forms</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toCsv(fields: Record<string, string>[], includeMetadata: boolean): string {
  const keys = Array.from(new Set(fields.flatMap(Object.keys)));
  const meta = includeMetadata ? ['_submitted_at', '_ip'] : [];
  const header = [...keys, ...meta];
  const rows = fields.map((f) =>
    header
      .map((k) => {
        const val = f[k] ?? '';
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(','),
  );
  return [header.join(','), ...rows].join('\n');
}

export const lifecycle: PluginLifecycle = {
  async boot(ctx: PluginContext) {
    ctx.logger.log('Forms plugin booting');

    ctx.hooks.addAction('form:define', (forms: unknown) => {
      const list = forms as FormDefinition[];
      list.push({
        id: 'contact-default',
        title: 'Contact Form',
        fields: [
          {
            id: 'name',
            type: 'text' as const,
            label: 'Name',
            required: true,
            placeholder: 'Your name',
          },
          {
            id: 'email',
            type: 'email' as const,
            label: 'Email',
            required: true,
            placeholder: 'your@email.com',
          },
          {
            id: 'subject',
            type: 'text' as const,
            label: 'Subject',
            required: true,
            placeholder: 'Subject',
          },
          {
            id: 'message',
            type: 'textarea' as const,
            label: 'Message',
            required: true,
            rows: 6,
            placeholder: 'Your message',
          },
          { id: '_hp', type: 'honeypot' as const, label: '', required: false },
        ],
        notifications: {
          enabled: true,
          to: [],
          subject: 'New contact form submission',
          fromName: 'NodePress',
        },
        confirmation: { type: 'message', message: 'Thank you! Your message has been sent.' },
        antiSpam: { honeypot: true, recaptcha: false, timeThreshold: 2000, maxSubmissions: 10 },
        payments: { enabled: false, currency: 'USD' },
        csvExport: { enabled: true, includeMetadata: true },
      });
    });

    ctx.hooks.addAction('form:submit', async (data: unknown) => {
      const payload = data as {
        formId: string;
        fields: Record<string, string>;
        form: FormDefinition;
        ip?: string;
        submittedAt?: number;
      };
      const { formId, fields, form, ip, submittedAt } = payload;

      if (!formId || !fields) {
        ctx.logger.warn('Form submission rejected: missing required data');
        return { success: false, error: 'Invalid submission' };
      }

      const spamReason = isSpamSubmission(fields, form.antiSpam, submittedAt ?? Date.now());
      if (spamReason) {
        ctx.logger.warn(`Spam blocked for form ${formId}: ${spamReason}`);
        return { success: false, error: 'Spam detected', spam: true };
      }

      ctx.logger.log(
        `Form ${formId} submitted with ${Object.keys(fields).length} fields from ${ip ?? 'unknown'}`,
      );

      if (form.notifications.enabled && form.notifications.to.length > 0) {
        ctx.hooks.doAction('form:notification', {
          form,
          fields,
          email: form.notifications.to.join(','),
        });
      }

      return { success: true, formId, fields };
    });

    ctx.hooks.addAction('form:notification', async (data: unknown) => {
      const { form, fields, email } = data as {
        form: FormDefinition;
        fields: Record<string, string>;
        email: string;
      };

      if (!email) {
        ctx.logger.warn(`Form ${form.id}: no notification email configured`);
        return;
      }

      const recipients = email.split(',').map((e) => e.trim());
      ctx.logger.log(
        `Notification would be sent to ${recipients.length} recipient(s) for form ${form.id}`,
      );

      ctx.hooks.doAction('mail:send', {
        to: recipients,
        subject: form.notifications.subject || `New submission: ${form.title}`,
        html: buildEmailHtml(fields, form),
        from: form.notifications.fromEmail || 'noreply@nodepress.local',
        fromName: form.notifications.fromName || 'NodePress Forms',
        replyTo: fields.email || form.notifications.replyTo || '',
      });
    });

    ctx.hooks.addAction('form:export', async (data: unknown) => {
      const { formId, format, submissions } = data as {
        formId: string;
        format: 'csv' | 'json';
        submissions: Record<string, string>[];
        includeMetadata?: boolean;
      };

      if (!submissions || submissions.length === 0) {
        ctx.logger.warn(`Form ${formId}: no submissions to export`);
        return null;
      }

      if (format === 'csv') {
        const csv = toCsv(submissions, true);
        ctx.logger.log(`Form ${formId} exported as CSV (${submissions.length} rows)`);
        return csv;
      }

      ctx.logger.log(`Form ${formId} exported as JSON (${submissions.length} entries)`);
      return JSON.stringify(submissions, null, 2);
    });

    ctx.hooks.addAction('form:stripe:createPaymentIntent', async (data: unknown) => {
      const { formId, amount, currency, metadata } = data as {
        formId: string;
        amount: number;
        currency: string;
        metadata?: Record<string, string>;
      };
      ctx.logger.log(`Stripe payment intent created for form ${formId}: ${amount} ${currency}`);
      return { clientSecret: `pi_mock_${formId}_${Date.now()}_secret` };
    });

    ctx.hooks.addAction('form:stripe:webhook', async (data: unknown) => {
      const { event, paymentIntent } = data as {
        event: string;
        paymentIntent: Record<string, unknown>;
      };
      ctx.logger.log(`Stripe webhook received: ${event} for PI ${paymentIntent.id as string}`);
    });

    ctx.hooks.addAction('admin:metaBox:register', (boxes: unknown) => {
      const list = boxes as Array<Record<string, unknown>>;
      list.push({
        id: 'form-settings-metabox',
        title: 'Form Settings',
        screen: 'form',
        context: 'normal',
        priority: 'high',
        fields: [
          { name: 'formTitle', label: 'Form Title', type: 'text', required: true },
          {
            name: 'notificationEmails',
            label: 'Notification Emails (comma-separated)',
            type: 'text',
            placeholder: 'admin@example.com',
          },
          { name: 'confirmationMessage', label: 'Confirmation Message', type: 'textarea' },
          { name: 'redirectUrl', label: 'Redirect URL (optional)', type: 'url' },
          { name: 'enableCaptcha', label: 'Enable reCAPTCHA', type: 'checkbox' },
          { name: 'enableStripe', label: 'Enable Stripe Payments', type: 'checkbox' },
          { name: 'stripePriceId', label: 'Stripe Price ID', type: 'text' },
          {
            name: 'allowedFileTypes',
            label: 'Allowed File Types (comma-separated)',
            type: 'text',
            placeholder: '.pdf,.jpg,.png',
          },
          { name: 'maxFileSize', label: 'Max File Size (MB)', type: 'number', defaultValue: '5' },
          { name: 'emailTemplate', label: 'Email Notification Template', type: 'textarea' },
        ],
      });
    });

    ctx.logger.log('Forms plugin booted');
  },

  async activate(ctx: PluginContext) {
    ctx.logger.log('Forms plugin activated');
  },

  async deactivate(ctx: PluginContext) {
    ctx.logger.log('Forms plugin deactivated');
  },

  async uninstall(ctx: PluginContext) {
    ctx.logger.log('Forms plugin uninstalled');
  },
};
