import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

export const manifest = {
  slug: 'comments',
  name: 'Comments',
  version: '0.0.1',
  description: 'Full comment system for NodePress',
  permissions: ['content:read', 'content:write', 'settings:read', 'settings:write'],
};

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log('Comments plugin booting');

    context.hooks.addAction('comment:submit', async (data: unknown) => {
      const { content, authorEmail } = data as {
        content: string;
        authorEmail: string;
        postId: string;
      };
      if (!content || !authorEmail) return;

      const spamKeywords = ['viagra', 'casino', 'free money', 'click here'];
      const isSpam = spamKeywords.some((kw) => content.toLowerCase().includes(kw));
      if (isSpam) {
        context.logger.warn(`Spam comment blocked from ${authorEmail}`);
        return;
      }

      context.logger.log(`Comment submitted by ${authorEmail}`);
    });

    context.hooks.addAction('comment:approve', async (data: unknown) => {
      const { id, authorEmail } = data as { id: string; authorEmail: string };
      context.logger.log(`Comment ${id} approved from ${authorEmail}`);
    });

    context.hooks.addAction('comment:report', async (data: unknown) => {
      const { id, reason } = data as { id: string; reason: string };
      context.logger.warn(`Comment ${id} reported: ${reason}`);
    });

    context.logger.log('Comments plugin booted');
  },

  async activate() {
    console.log('Comments plugin activated');
  },

  async deactivate() {
    console.log('Comments plugin deactivated');
  },
};
