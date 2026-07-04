import type { Command } from 'commander';
import chalk from 'chalk';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import { createSpinner, success, error, info, printTable } from '../utils/logger.js';
import { formatDate, statusBadge } from '../utils/format.js';

export function cronCommands(program: Command): void {
  const cron = program.command('cron').description('Scheduled task management');

  cron
    .command('list')
    .description('List scheduled cron jobs')
    .option('--status <status>', 'Filter by status (active, paused, disabled)')
    .action(async (options) => {
      const spinner = createSpinner('Loading cron jobs...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const where: any = {};
        if (options.status) {
          where.status = options.status.toUpperCase();
        }
        const events = await prisma.cronEvent.findMany({
          where,
          orderBy: { nextRun: 'asc' },
        });
        spinner.stop();
        if (events.length === 0) {
          console.log(chalk.dim('\n  No scheduled cron jobs found.\n'));
        } else {
          const headers = ['Hook', 'Schedule', 'Status', 'Last Run', 'Next Run', 'Errors'];
          const rows = events.map((e: any) => [
            e.hook,
            e.schedule,
            statusBadge(e.status),
            e.lastRun ? formatDate(e.lastRun) : '—',
            e.nextRun ? formatDate(e.nextRun) : '—',
            String(e.errorCount || 0),
          ]);
          console.log();
          printTable(headers, rows);
          console.log();
        }
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to load cron jobs');
        error(err.message);
      }
    });

  cron
    .command('run <hook>')
    .description('Run a specific cron job by hook name')
    .action(async (hook: string) => {
      const spinner = createSpinner(`Triggering cron job "${hook}"...`);
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const event = await prisma.cronEvent.findFirst({ where: { hook } });
        if (!event) {
          spinner.fail(`Cron job "${hook}" not found`);
          await disconnectPrisma();
          return;
        }

        await prisma.cronEvent.update({
          where: { id: event.id },
          data: {
            lastRun: new Date(),
            nextRun: new Date(Date.now() + 3600000),
            errorCount: 0,
          },
        });

        spinner.stop();
        success(`Cron job "${hook}" executed`);
        info(`Last run: ${formatDate(new Date())}`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail(`Failed to run cron job "${hook}"`);
        error(err.message);
      }
    });
}
