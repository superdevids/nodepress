import type { Command } from 'commander';
import chalk from 'chalk';
import { getPrismaClient, disconnectPrisma, runMigrations } from '../utils/db.js';
import { createSpinner, success, error, info } from '../utils/logger.js';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export function coreCommands(program: Command): void {
  const core = program.command('core').description('Core management commands');

  core
    .command('version')
    .description('Display version information')
    .action(() => {
      console.log(chalk.bold('\n  NodePress CLI v0.0.1'));
      console.log('  Core Engine:  0.0.1');
      console.log('  Plugin SDK:   0.0.1');
      console.log('  Database:     Prisma (PostgreSQL)');
      console.log(`  Node.js:      ${process.version}\n`);
    });

  core
    .command('install')
    .description('Install NodePress (setup database, create admin user)')
    .option('-e, --email <email>', 'Admin email', 'admin@nodepress.dev')
    .option('-p, --password <password>', 'Admin password')
    .option('-n, --name <name>', 'Admin display name', 'Admin')
    .option('--skip-migrations', 'Skip running migrations')
    .option('--skip-seed', 'Skip seeding default data')
    .action(async (options) => {
      const spinner = createSpinner('Installing NodePress...');
      spinner.start();
      try {
        if (!options.skipMigrations) {
          await runMigrations();
        }

        const prisma = await getPrismaClient();

        if (!options.skipSeed) {
          const password = options.password || process.env.NODEPRESS_ADMIN_PASSWORD || '';
          if (!password) {
            throw new Error(
              'Admin password is required. Provide it via --password flag or NODEPRESS_ADMIN_PASSWORD environment variable.',
            );
          }
          const passwordHash = await bcrypt.hash(password, 12);
          await prisma.user.upsert({
            where: { email: options.email },
            update: {},
            create: {
              email: options.email,
              passwordHash,
              name: options.name,
              displayName: options.name,
              role: 'SUPER_ADMIN',
              capabilities: ['manage_all'],
              userStatus: 0,
            },
          });

          await prisma.contentType.upsert({
            where: { name: 'post' },
            update: {},
            create: {
              name: 'post',
              label: { singular: 'Post', plural: 'Posts' },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'content', type: 'richtext', required: true },
              ],
              supports: ['title', 'editor', 'excerpt', 'thumbnail', 'comments'],
              source: 'CODE',
              menuPosition: 5,
              showInMenu: true,
              hasArchive: true,
            },
          });

          await prisma.contentType.upsert({
            where: { name: 'page' },
            update: {},
            create: {
              name: 'page',
              label: { singular: 'Page', plural: 'Pages' },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'content', type: 'richtext', required: true },
              ],
              supports: ['title', 'editor', 'thumbnail'],
              source: 'CODE',
              menuPosition: 10,
              showInMenu: true,
              hasArchive: false,
            },
          });

          const settings = [
            { key: 'site_title', value: 'NodePress CMS' },
            { key: 'admin_email', value: options.email },
            { key: 'site_url', value: 'http://localhost:3000' },
            { key: 'language', value: 'en_US' },
          ];
          for (const s of settings) {
            await prisma.setting.upsert({
              where: { group_key: { group: 'general', key: s.key } },
              update: { value: s.value },
              create: { group: 'general', key: s.key, value: s.value },
            });
          }
        }

        const keyNames = [
          'AUTH_KEY',
          'SECURE_AUTH_KEY',
          'LOGGED_IN_KEY',
          'NONCE_KEY',
          'AUTH_SALT',
          'SECURE_AUTH_SALT',
          'LOGGED_IN_SALT',
          'NONCE_SALT',
        ];
        for (const key of keyNames) {
          await prisma.setting.upsert({
            where: { group_key: { group: 'security', key } },
            update: { value: crypto.randomBytes(64).toString('hex') },
            create: {
              group: 'security',
              key,
              value: crypto.randomBytes(64).toString('hex'),
              autoload: false,
            },
          });
        }

        spinner.stop();
        success('NodePress installed successfully!');
        info(`Admin: ${options.email}`);
        if (options.password) {
          info('Password: [provided via --password flag]');
        } else if (process.env.NODEPRESS_ADMIN_PASSWORD) {
          info('Password: [provided via NODEPRESS_ADMIN_PASSWORD environment variable]');
        }
      } catch (err: any) {
        spinner.fail('Installation failed');
        error(err.message);
        process.exit(1);
      } finally {
        await disconnectPrisma();
      }
    });

  core
    .command('update')
    .description('Update NodePress core')
    .action(async () => {
      const spinner = createSpinner('Updating NodePress...');
      spinner.start();
      try {
        await runMigrations();
        const prisma = await getPrismaClient();
        await prisma.setting.upsert({
          where: { group_key: { group: 'general', key: 'core_version' } },
          update: { value: '0.0.1' },
          create: { group: 'general', key: 'core_version', value: '0.0.1' },
        });
        spinner.stop();
        success('NodePress updated to v0.0.1');
      } catch (err: any) {
        spinner.fail('Update failed');
        error(err.message);
      } finally {
        await disconnectPrisma();
      }
    });
}
