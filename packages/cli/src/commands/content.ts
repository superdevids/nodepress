import type { Command } from 'commander';
import chalk from 'chalk';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import { createSpinner, success, error, info, printTable } from '../utils/logger.js';
import { formatDate, truncate } from '../utils/format.js';

export function contentCommands(program: Command): void {
  const content = program.command('content').description('Content management commands');

  content
    .command('list')
    .description('List content entries')
    .option('-t, --type <type>', 'Content type to list')
    .option('--limit <number>', 'Number of entries to show', '20')
    .option('--status <status>', 'Filter by status')
    .action(async (options) => {
      const spinner = createSpinner('Loading content entries...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const where: any = {};
        if (options.type) {
          const ct = await prisma.contentType.findUnique({ where: { name: options.type } });
          if (!ct) {
            spinner.fail(`Content type "${options.type}" not found`);
            await disconnectPrisma();
            return;
          }
          where.contentTypeId = ct.id;
        }
        if (options.status) {
          where.status = options.status.toUpperCase();
        }
        const entries = await prisma.contentEntry.findMany({
          where,
          take: parseInt(options.limit, 10),
          orderBy: { createdAt: 'desc' },
          include: { contentType: true, author: true },
        });
        spinner.stop();
        if (entries.length === 0) {
          console.log(chalk.dim('\n  No content entries found.\n'));
        } else {
          const headers = ['ID', 'Title', 'Type', 'Status', 'Author', 'Date'];
          const rows = entries.map((e: any) => [
            e.id.slice(0, 8),
            truncate(e.data?.title || '(untitled)', 30),
            e.contentType?.name || '—',
            e.status,
            e.author?.name || '—',
            formatDate(e.createdAt),
          ]);
          console.log();
          printTable(headers, rows);
          console.log();
        }
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to load content entries');
        error(err.message);
      }
    });

  content
    .command('create')
    .description('Create a new content entry')
    .requiredOption('-t, --type <type>', 'Content type')
    .requiredOption('--title <title>', 'Entry title')
    .option('--content <content>', 'Entry content')
    .option('--status <status>', 'Entry status', 'draft')
    .option('--author <email>', 'Author email')
    .action(async (options) => {
      const spinner = createSpinner('Creating content entry...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const ct = await prisma.contentType.findUnique({ where: { name: options.type } });
        if (!ct) {
          spinner.fail(`Content type "${options.type}" not found`);
          await disconnectPrisma();
          return;
        }
        let authorId: string;
        if (options.author) {
          const user = await prisma.user.findUnique({ where: { email: options.author } });
          if (!user) {
            spinner.fail(`Author "${options.author}" not found`);
            await disconnectPrisma();
            return;
          }
          authorId = user.id;
        } else {
          const admin = await prisma.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            orderBy: { createdAt: 'asc' },
          });
          if (!admin) {
            spinner.fail('No admin user found. Create a user first.');
            await disconnectPrisma();
            return;
          }
          authorId = admin.id;
        }
        const slug = options.title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/^-+|-+$/g, '');
        const entry = await prisma.contentEntry.create({
          data: {
            contentTypeId: ct.id,
            slug,
            status: options.status.toUpperCase(),
            data: {
              title: options.title,
              content: options.content || '',
            },
            authorId,
            publishedAt: options.status === 'publish' ? new Date() : null,
          },
        });
        spinner.stop();
        success(`Content entry created: ${entry.id}`);
        info(`Title: ${options.title}`);
        info(`Type: ${options.type}`);
        info(`Status: ${options.status}`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to create content entry');
        error(err.message);
      }
    });

  content
    .command('delete')
    .description('Delete a content entry')
    .requiredOption('--id <id>', 'Entry ID')
    .option('--force', 'Skip confirmation')
    .action(async (options) => {
      const spinner = createSpinner('Finding content entry...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const entry = await prisma.contentEntry.findUnique({ where: { id: options.id } });
        if (!entry) {
          spinner.fail(`Content entry "${options.id}" not found`);
          await disconnectPrisma();
          return;
        }
        spinner.stop();
        if (!options.force) {
          console.log(chalk.yellow(`\n  ⚠ Delete "${entry.data?.title || entry.id}"?`));
          console.log(chalk.dim(`  ID: ${entry.id}`));
          console.log(chalk.dim(`  Type: ${entry.contentTypeId}`));
          console.log(chalk.dim(`  Use --force to skip confirmation.\n`));
          await disconnectPrisma();
          return;
        }
        const del = createSpinner('Deleting content entry...');
        del.start();
        await prisma.contentEntry.delete({ where: { id: options.id } });
        del.stop();
        success(`Content entry "${entry.data?.title || entry.id}" deleted`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to delete content entry');
        error(err.message);
      }
    });
}
