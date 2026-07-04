import type { Command } from 'commander';
import { createSpinner, success, error, info } from '../utils/logger.js';
import { getPluginsDir, getThemesDir } from '../utils/config.js';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import fs from 'node:fs/promises';
import path from 'node:path';

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export function generateCommands(program: Command): void {
  const generate = program.command('generate').description('Scaffold new components');

  generate
    .command('plugin <name>')
    .description('Scaffold a new plugin')
    .option('--description <text>', 'Plugin description')
    .option('--version <version>', 'Plugin version', '1.0.0')
    .action(async (name: string, options) => {
      const spinner = createSpinner(`Scaffolding plugin "${name}"...`);
      spinner.start();
      try {
        const pluginsDir = getPluginsDir();
        const pluginDir = path.join(pluginsDir, name);
        await ensureDir(pluginDir);

        const manifest = {
          name,
          version: options.version || '1.0.0',
          description: options.description || `A NodePress plugin: ${name}`,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          main: 'index.ts',
          engines: { nodepress: '>=0.0.1' },
        };

        await fs.writeFile(path.join(pluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2));

        const indexTs = `import type { PluginLifecycle, PluginBootContext } from "@nodepressjs/core";

export default {
  async boot(ctx: PluginBootContext): Promise<void> {
    console.log(\`[${name}] Plugin booted\`);
  },

  async activate(): Promise<void> {
    console.log(\`[${name}] Plugin activated\`);
  },

  async deactivate(): Promise<void> {
    console.log(\`[${name}] Plugin deactivated\`);
  },

  async uninstall(): Promise<void> {
    console.log(\`[${name}] Plugin uninstalled\`);
  },
} satisfies PluginLifecycle;
`;
        await fs.writeFile(path.join(pluginDir, 'index.ts'), indexTs);

        spinner.stop();
        success(`Plugin "${name}" scaffolded at ${pluginDir}`);
        info('Edit plugin.json and index.ts to customize.');
      } catch (err: any) {
        spinner.fail('Failed to scaffold plugin');
        error(err.message);
      }
    });

  generate
    .command('content-type <name>')
    .description('Scaffold a new content type definition')
    .option('-f, --fields <fields>', 'Field definitions (key:type,key:type)')
    .option('--label-singular <label>', 'Singular label')
    .option('--label-plural <label>', 'Plural label')
    .action(async (name: string, options) => {
      const spinner = createSpinner(`Creating content type "${name}"...`);
      spinner.start();
      try {
        const prisma = await getPrismaClient();

        const fieldsArray = options.fields
          ? options.fields.split(',').map((f: string) => {
              const [fieldName, fieldType = 'text'] = f.split(':');
              return { name: fieldName, type: fieldType, required: false };
            })
          : [
              { name: 'title', type: 'text', required: true },
              { name: 'content', type: 'richtext', required: false },
            ];

        const ct = await prisma.contentType.upsert({
          where: { name },
          update: {
            fields: fieldsArray,
            label: {
              singular: options.labelSingular || name,
              plural: options.labelPlural || `${name}s`,
            },
          },
          create: {
            name,
            label: {
              singular: options.labelSingular || name,
              plural: options.labelPlural || `${name}s`,
            },
            fields: fieldsArray,
            supports: ['title', 'editor'],
            source: 'CODE',
            menuPosition: 30,
            showInMenu: true,
            hasArchive: true,
          },
        });

        spinner.stop();
        success(`Content type "${name}" created (ID: ${ct.id})`);
        info(`Fields: ${fieldsArray.map((f: any) => `${f.name}:${f.type}`).join(', ')}`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to create content type');
        error(err.message);
      }
    });

  generate
    .command('block <name>')
    .description('Scaffold a new block')
    .option('--description <text>', 'Block description')
    .option('--category <category>', 'Block category', 'widgets')
    .action(async (name: string, options) => {
      const spinner = createSpinner(`Scaffolding block "${name}"...`);
      spinner.start();
      try {
        const pluginsDir = getPluginsDir();
        const blocksDir = path.join(pluginsDir, '..', 'blocks');
        const blockDir = path.join(blocksDir, name);
        await ensureDir(blockDir);

        const slug = name.toLowerCase().replace(/\s+/g, '-');

        const blockJson = {
          name: slug,
          title: name,
          description: options.description || `A custom block: ${name}`,
          category: options.category || 'widgets',
          icon: 'block-default',
          keywords: [name],
          supports: { align: true },
        };

        await fs.writeFile(path.join(blockDir, 'block.json'), JSON.stringify(blockJson, null, 2));

        const editTsx = `import type { BlockEditProps } from "@nodepressjs/core";

export default function Edit(props: BlockEditProps) {
  return <div className="wp-block-${slug}">
    <h2>${name}</h2>
    <p>Edit this block in the editor.</p>
  </div>;
}
`;
        await fs.writeFile(path.join(blockDir, 'edit.tsx'), editTsx);

        const saveTsx = `export default function Save() {
  return <div className="wp-block-${slug}">
    <h2>${name}</h2>
    <p>Save this block.</p>
  </div>;
}
`;
        await fs.writeFile(path.join(blockDir, 'save.tsx'), saveTsx);

        spinner.stop();
        success(`Block "${name}" scaffolded at ${blockDir}`);
        info('Edit block.json, edit.tsx, and save.tsx to customize.');
      } catch (err: any) {
        spinner.fail('Failed to scaffold block');
        error(err.message);
      }
    });

  generate
    .command('theme <name>')
    .description('Scaffold a new theme')
    .option('--description <text>', 'Theme description')
    .option('--author <author>', 'Theme author')
    .option('--version <version>', 'Theme version', '1.0.0')
    .action(async (name: string, options) => {
      const spinner = createSpinner(`Scaffolding theme "${name}"...`);
      spinner.start();
      try {
        const themesDir = getThemesDir();
        const themeDir = path.join(themesDir, name);
        await ensureDir(themeDir);
        await ensureDir(path.join(themeDir, 'templates'));
        await ensureDir(path.join(themeDir, 'parts'));
        await ensureDir(path.join(themeDir, 'assets', 'css'));
        await ensureDir(path.join(themeDir, 'assets', 'js'));

        const slug = name.toLowerCase().replace(/\s+/g, '-');

        const themeJson = {
          name,
          slug,
          version: options.version || '1.0.0',
          description: options.description || `A NodePress theme: ${name}`,
          author: options.author || 'Unknown',
          template: null,
          tags: [],
          supports: ['title-tag', 'post-thumbnails', 'responsive-embeds'],
        };

        await fs.writeFile(path.join(themeDir, 'theme.json'), JSON.stringify(themeJson, null, 2));

        const styleCss = `/*
Theme Name: ${name}
Theme URI: https://example.com/${slug}
Author: ${options.author || 'Unknown'}
Description: ${options.description || `A NodePress theme: ${name}`}
Version: ${options.version || '1.0.0'}
*/
`;
        await fs.writeFile(path.join(themeDir, 'style.css'), styleCss);

        const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{site_title}}</title>
  {{wp_head}}
</head>
<body>
  <header>
    <h1>{{site_title}}</h1>
    {{primary_menu}}
  </header>

  <main>
    {{content}}
  </main>

  <footer>
    <p>&copy; {{year}} {{site_title}}</p>
    {{footer_menu}}
  </footer>

  {{wp_footer}}
</body>
</html>
`;
        await fs.writeFile(path.join(themeDir, 'index.html'), indexHtml);

        spinner.stop();
        success(`Theme "${name}" scaffolded at ${themeDir}`);
        info('Edit theme.json, templates, and assets to customize.');
      } catch (err: any) {
        spinner.fail('Failed to scaffold theme');
        error(err.message);
      }
    });
}
