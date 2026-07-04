import type { Command } from 'commander';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import { createSpinner, success, error, info } from '../utils/logger.js';
import crypto from 'node:crypto';

export function maintenanceCommands(program: Command): void {
  const maintenance = program.command('maintenance').description('Maintenance mode commands');

  maintenance
    .command('enable')
    .description('Enable maintenance mode')
    .option('--secret <secret>', 'Secret bypass token')
    .option('--message <message>', 'Maintenance message')
    .action(async (options) => {
      const spinner = createSpinner('Enabling maintenance mode...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const secret = options.secret || crypto.randomBytes(16).toString('hex');
        const message = options.message || 'Site under maintenance. Please check back later.';

        await prisma.setting.upsert({
          where: { group_key: { group: 'maintenance', key: 'mode' } },
          update: { value: true },
          create: { group: 'maintenance', key: 'mode', value: true },
        });

        await prisma.setting.upsert({
          where: { group_key: { group: 'maintenance', key: 'secret' } },
          update: { value: secret },
          create: { group: 'maintenance', key: 'secret', value: secret, autoload: false },
        });

        await prisma.setting.upsert({
          where: { group_key: { group: 'maintenance', key: 'message' } },
          update: { value: message },
          create: { group: 'maintenance', key: 'message', value: message, autoload: false },
        });

        spinner.stop();
        success('Maintenance mode enabled');
        info(`Secret token: ${secret}`);
        info('Use this token to bypass maintenance mode: ?maintenance_secret=<token>');
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to enable maintenance mode');
        error(err.message);
      }
    });

  maintenance
    .command('disable')
    .description('Disable maintenance mode')
    .action(async () => {
      const spinner = createSpinner('Disabling maintenance mode...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        await prisma.setting.upsert({
          where: { group_key: { group: 'maintenance', key: 'mode' } },
          update: { value: false },
          create: { group: 'maintenance', key: 'mode', value: false },
        });
        spinner.stop();
        success('Maintenance mode disabled');
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to disable maintenance mode');
        error(err.message);
      }
    });
}
