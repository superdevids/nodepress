import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

export const manifest = {
  slug: 'forms',
  name: 'Forms',
  version: '0.0.1',
  description: 'Drag-and-drop form builder for NodePress',
  permissions: ['content:read', 'content:write', 'settings:read', 'settings:write'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log('Forms plugin booting');

    context.hooks.addAction('form:submit', async (data: unknown) => {
      const { formId, fields } = data as {
        formId: string;
        fields: Record<string, string>;
        ip?: string;
      };

      if (!formId || !fields) {
        context.logger.warn('Form submission rejected: missing required data');
        return;
      }

      const hasHoneypot = 'website' in fields && fields.website;
      if (hasHoneypot) {
        context.logger.warn(`Spam form submission detected (honeypot) for form ${formId}`);
        return;
      }

      context.logger.log(`Form ${formId} submitted with ${Object.keys(fields).length} fields`);
    });

    context.hooks.addAction('form:notification', async (data: unknown) => {
      const { formId, email } = data as {
        formId: string;
        email: string;
        fields: Record<string, string>;
      };

      if (!email) {
        context.logger.warn(`Form ${formId}: no notification email configured`);
        return;
      }

      context.logger.log(`Notification sent to ${email} for form ${formId}`);
    });

    context.hooks.addAction('form:export', async (data: unknown) => {
      const { formId, format } = data as { formId: string; format: string };
      context.logger.log(`Form ${formId} exported as ${format}`);
    });

    context.logger.log('Forms plugin booted');
  },

  async activate() {
    console.log('Forms plugin activated');
  },

  async deactivate() {
    console.log('Forms plugin deactivated');
  },
};
