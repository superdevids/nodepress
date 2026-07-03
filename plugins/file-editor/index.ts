import type { PluginLifecycle, PluginContext } from '@nodepress/plugin-sdk';

export const manifest = {
  slug: 'file-editor',
  name: 'File Editor',
  version: '0.0.1',
  description: 'In-browser code editor for theme and plugin files',
  permissions: ['settings:read', 'settings:write'],
};

const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.css', '.json', '.md', '.html', '.js', '.jsx'];
const BLOCKED_PATHS = ['node_modules', '.git', 'dist', '.env', 'credentials'];

export const lifecycle: PluginLifecycle = {
  async boot(context: PluginContext) {
    context.logger.log('File Editor plugin booting');

    context.hooks.addAction('file-editor:read', async (data: unknown) => {
      const { filePath } = data as { filePath: string };
      if (!filePath) {
        context.logger.warn('File read rejected: no path provided');
        return;
      }

      const ext = filePath.slice(filePath.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        context.logger.warn(`File read rejected: extension not allowed (${ext})`);
        return;
      }

      const blocked = BLOCKED_PATHS.some((p) => filePath.includes(p));
      if (blocked) {
        context.logger.warn(`File read rejected: path blocked (${filePath})`);
        return;
      }

      context.logger.log(`File read permitted: ${filePath}`);
    });

    context.hooks.addAction('file-editor:write', async (data: unknown) => {
      const { filePath } = data as { filePath: string };
      if (!filePath) {
        context.logger.warn('File write rejected: no path provided');
        return;
      }

      const ext = filePath.slice(filePath.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        context.logger.warn(`File write rejected: extension not allowed (${ext})`);
        return;
      }

      const blocked = BLOCKED_PATHS.some((p) => filePath.includes(p));
      if (blocked) {
        context.logger.warn(`File write rejected: path blocked (${filePath})`);
        return;
      }

      context.logger.log(`File write permitted: ${filePath}`);
    });

    context.hooks.addAction('file-editor:configure', async () => {
      context.logger.log('Monaco editor configured with NodePress theme');
    });

    context.logger.log('File Editor plugin booted');
  },

  async activate() {
    console.log('File Editor plugin activated');
  },

  async deactivate() {
    console.log('File Editor plugin deactivated');
  },
};
