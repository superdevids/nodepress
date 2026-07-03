import type { PluginLifecycle, PluginContext } from '@nodepressjs/plugin-sdk';

export const manifest = {
  slug: 'file-editor',
  name: 'File Editor',
  version: '0.1.0',
  description: 'In-browser code editor for theme and plugin files (Monaco-based).',
  permissions: ['settings:read', 'settings:write'],
};

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  extension?: string;
  size?: number;
  modifiedAt?: string;
}

interface FileBackup {
  path: string;
  content: string;
  timestamp: string;
  label: string;
}

interface FileChange {
  path: string;
  oldContent: string;
  newContent: string;
  timestamp: string;
  label: string;
}

const ALLOWED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.json',
  '.md',
  '.html',
  '.yml',
  '.yaml',
  '.env.example',
  '.prisma',
  '.graphql',
  '.mjs',
  '.cjs',
];
const BLOCKED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  '.env',
  'credentials',
  '.turbo',
  '.next',
  'coverage',
];
const BLOCKED_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'credentials.json',
  'service-account.json',
  'config\\.php',
  'wp-config\\.php',
];
const MAX_FILE_SIZE = 512 * 1024;

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.css': 'css',
  '.json': 'json',
  '.md': 'markdown',
  '.html': 'html',
  '.yml': 'yaml',
  '.yaml': 'yaml',
  '.prisma': 'prisma',
  '.graphql': 'graphql',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
};

const backends = new Map<string, FileBackup>();
const changes = new Map<string, FileChange[]>();

function isPathBlocked(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  if (
    BLOCKED_PATHS.some(
      (p) => normalized.includes(`/${p}/`) || normalized.startsWith(`${p}/`) || normalized === p,
    )
  )
    return true;
  if (BLOCKED_FILES.some((f) => normalized.endsWith(`/${f}`) || normalized === f)) return true;
  return false;
}

function isExtensionAllowed(filePath: string): boolean {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(ext);
}

function getLanguage(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}

function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = [];

  for (const fullPath of paths) {
    const parts = fullPath.replace(/\\/g, '/').split('/');
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && part.includes('.');
      const existing = currentLevel.find((n) => n.name === part);

      if (existing) {
        if (isFile) {
          existing.type = 'file';
          existing.path = fullPath;
          existing.extension = part.slice(part.lastIndexOf('.'));
        }
        currentLevel = existing.children ?? [];
      } else {
        const node: FileNode = isFile
          ? {
              name: part,
              path: fullPath,
              type: 'file',
              extension: part.slice(part.lastIndexOf('.')),
            }
          : { name: part, path: fullPath, type: 'directory', children: [] };
        currentLevel.push(node);
        currentLevel = isFile ? [] : (node.children ?? []);
      }
    }
  }

  return root;
}

export const lifecycle: PluginLifecycle = {
  async boot(ctx: PluginContext) {
    ctx.logger.log('File Editor plugin booting');

    ctx.hooks.addAction('file-editor:listFiles', async (data: unknown) => {
      const { basePaths } = data as { basePaths: string[] };
      if (!basePaths || basePaths.length === 0) {
        ctx.logger.warn('File listing rejected: no base paths provided');
        return [];
      }

      const validPaths = basePaths.filter((p) => !isPathBlocked(p) && isExtensionAllowed(p));
      const tree = buildFileTree(validPaths);
      ctx.logger.log(`File tree built with ${validPaths.length} valid files`);
      return tree;
    });

    ctx.hooks.addAction('file-editor:read', async (data: unknown) => {
      const { filePath } = data as { filePath: string };

      if (!filePath) {
        ctx.logger.warn('File read rejected: no path provided');
        return { success: false, error: 'No path provided' };
      }

      if (!isExtensionAllowed(filePath)) {
        ctx.logger.warn(`File read rejected: extension not allowed (${filePath})`);
        return {
          success: false,
          error: `File type "${filePath.slice(filePath.lastIndexOf('.'))}" is not editable`,
        };
      }

      if (isPathBlocked(filePath)) {
        ctx.logger.warn(`File read rejected: path blocked (${filePath})`);
        return { success: false, error: 'This file cannot be edited for security reasons' };
      }

      ctx.logger.log(`File read permitted: ${filePath}`);
      return { success: true, path: filePath, language: getLanguage(filePath) };
    });

    ctx.hooks.addAction('file-editor:write', async (data: unknown) => {
      const { filePath, content, createBackup } = data as {
        filePath: string;
        content: string;
        createBackup?: boolean;
      };

      if (!filePath) {
        ctx.logger.warn('File write rejected: no path provided');
        return { success: false, error: 'No path provided' };
      }

      if (!isExtensionAllowed(filePath)) {
        ctx.logger.warn(`File write rejected: extension not allowed (${filePath})`);
        return {
          success: false,
          error: `File type "${filePath.slice(filePath.lastIndexOf('.'))}" cannot be written`,
        };
      }

      if (isPathBlocked(filePath)) {
        ctx.logger.warn(`File write rejected: path blocked (${filePath})`);
        return { success: false, error: 'This file cannot be modified for security reasons' };
      }

      if (content.length > MAX_FILE_SIZE) {
        ctx.logger.warn(`File write rejected: file too large (${content.length} bytes)`);
        return { success: false, error: 'File exceeds maximum size of 512KB' };
      }

      if (createBackup !== false) {
        const backupKey = `${filePath}::${Date.now()}`;
        backends.set(backupKey, {
          path: filePath,
          content: content,
          timestamp: new Date().toISOString(),
          label: `Before edit ${new Date().toLocaleString()}`,
        });

        if (!changes.has(filePath)) changes.set(filePath, []);
        changes.get(filePath)!.push({
          path: filePath,
          oldContent: content,
          newContent: content,
          timestamp: new Date().toISOString(),
          label: `Edit ${(changes.get(filePath)?.length ?? 0) + 1}`,
        });

        ctx.logger.log(`Backup created for ${filePath} (${backupKey})`);
      }

      ctx.logger.log(`File write permitted: ${filePath} (${content.length} bytes)`);
      return {
        success: true,
        path: filePath,
        backupKey: createBackup !== false ? `${filePath}::${Date.now()}` : undefined,
      };
    });

    ctx.hooks.addAction('file-editor:search', async (data: unknown) => {
      const { query, filePaths } = data as { query: string; filePaths: string[] };
      if (!query || query.length < 2) {
        ctx.logger.warn('Search rejected: query too short');
        return [];
      }

      const results = filePaths
        .filter((p) => isExtensionAllowed(p) && !isPathBlocked(p))
        .map((path) => ({ path, matches: [] as { line: number; content: string }[] }))
        .filter((r) => r.matches.length > 0);

      ctx.logger.log(
        `Search "${query}" across ${filePaths.length} files returned ${results.length} results`,
      );
      return results;
    });

    ctx.hooks.addAction('file-editor:replace', async (data: unknown) => {
      const { filePath, search, replace, dryRun } = data as {
        filePath: string;
        search: string;
        replace: string;
        dryRun?: boolean;
      };

      if (!filePath || !search) {
        return { success: false, error: 'Missing required parameters' };
      }

      if (isPathBlocked(filePath)) {
        return { success: false, error: 'This file cannot be modified' };
      }

      if (dryRun) {
        ctx.logger.log(`Replace dry-run in ${filePath}: "${search}" -> "${replace}"`);
        return { success: true, dryRun: true, replacements: 0 };
      }

      ctx.logger.log(`Replace in ${filePath}: "${search}" -> "${replace}"`);
      return { success: true, replacements: 0 };
    });

    ctx.hooks.addAction('file-editor:diff', async (data: unknown) => {
      const { filePath, originalContent, newContent } = data as {
        filePath: string;
        originalContent: string;
        newContent: string;
      };

      if (!filePath || originalContent == null || newContent == null) {
        return { success: false, error: 'Missing required parameters' };
      }

      const origLines = originalContent.split('\n');
      const newLines = newContent.split('\n');
      const maxLen = Math.max(origLines.length, newLines.length);
      const diffs: {
        line: number;
        type: 'same' | 'added' | 'removed' | 'modified';
        oldContent?: string;
        newContent?: string;
      }[] = [];

      for (let i = 0; i < maxLen; i++) {
        const oldLine = i < origLines.length ? origLines[i] : undefined;
        const newLine = i < newLines.length ? newLines[i] : undefined;

        if (oldLine === undefined) diffs.push({ line: i + 1, type: 'added', newContent: newLine });
        else if (newLine === undefined)
          diffs.push({ line: i + 1, type: 'removed', oldContent: oldLine });
        else if (oldLine !== newLine)
          diffs.push({ line: i + 1, type: 'modified', oldContent: oldLine, newContent: newLine });
        else diffs.push({ line: i + 1, type: 'same' });
      }

      ctx.logger.log(
        `Diff generated for ${filePath}: ${diffs.filter((d) => d.type !== 'same').length} changes`,
      );
      return { success: true, path: filePath, diffs };
    });

    ctx.hooks.addAction('file-editor:backups', async (data: unknown) => {
      const { filePath } = data as { filePath: string };
      const fileBackups = Array.from(backends.values()).filter((b) => b.path === filePath);
      const fileChanges = changes.get(filePath) ?? [];
      ctx.logger.log(
        `Backups listed for ${filePath}: ${fileBackups.length} backups, ${fileChanges.length} changes`,
      );
      return { backups: fileBackups, changes: fileChanges };
    });

    ctx.hooks.addAction('file-editor:restore', async (data: unknown) => {
      const { backupKey } = data as { backupKey: string };
      const backup = backends.get(backupKey);
      if (!backup) {
        ctx.logger.warn(`Backup not found: ${backupKey}`);
        return { success: false, error: 'Backup not found' };
      }
      ctx.logger.log(`Restoring backup ${backupKey} for ${backup.path}`);
      return {
        success: true,
        path: backup.path,
        content: backup.content,
        timestamp: backup.timestamp,
        label: backup.label,
      };
    });

    ctx.hooks.addAction('file-editor:configure', async () => {
      ctx.logger.log('Monaco editor configured with NodePress theme');
      return {
        theme: 'nodepress-dark',
        language: 'typescript',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: 'on',
        tabSize: 2,
        wordWrap: 'on',
        autoClosingBrackets: 'always',
        formatOnPaste: true,
        suggestOnTriggerCharacters: true,
        bracketPairColorization: { enabled: true },
        renderWhitespace: 'selection',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
      };
    });

    ctx.hooks.addAction('admin:metaBox:register', (boxes: unknown) => {
      const list = boxes as Array<Record<string, unknown>>;
      list.push({
        id: 'file-editor-settings',
        title: 'File Editor Settings',
        screen: 'file-editor',
        context: 'side',
        priority: 'high',
        fields: [
          {
            name: 'theme',
            label: 'Editor Theme',
            type: 'select',
            defaultValue: 'vs-dark',
            options: [
              { label: 'Dark (VS Code)', value: 'vs-dark' },
              { label: 'Light', value: 'vs' },
              { label: 'High Contrast', value: 'hc-black' },
            ],
          },
          { name: 'fontSize', label: 'Font Size', type: 'number', defaultValue: '14' },
          {
            name: 'tabSize',
            label: 'Tab Size',
            type: 'select',
            defaultValue: '2',
            options: [
              { label: '2 spaces', value: '2' },
              { label: '4 spaces', value: '4' },
            ],
          },
          {
            name: 'wordWrap',
            label: 'Word Wrap',
            type: 'select',
            defaultValue: 'on',
            options: [
              { label: 'On', value: 'on' },
              { label: 'Off', value: 'off' },
            ],
          },
          {
            name: 'createBackups',
            label: 'Create backups on save',
            type: 'checkbox',
            defaultValue: true,
          },
          {
            name: 'allowedDirectories',
            label: 'Allowed directories (comma-separated)',
            type: 'text',
            defaultValue: 'plugins,themes,src',
          },
        ],
      });
    });

    ctx.logger.log('File Editor plugin booted');
  },

  async activate(ctx: PluginContext) {
    ctx.logger.log('File Editor plugin activated');
  },

  async deactivate(ctx: PluginContext) {
    ctx.logger.log('File Editor plugin deactivated');
  },

  async uninstall(ctx: PluginContext) {
    ctx.logger.log('File Editor plugin uninstalled');
  },
};
