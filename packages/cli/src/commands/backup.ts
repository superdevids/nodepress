import type { Command } from 'commander';
import chalk from 'chalk';
import { getPrismaClient } from '../utils/db.js';
import { createSpinner, success, error, info } from '../utils/logger.js';
import { formatFileSize } from '../utils/format.js';

export function backupCommands(program: Command): void {
  const backup = program.command('backup').description('Backup and restore commands');

  backup
    .command('create')
    .description('Create a full backup (database + media + config)')
    .option('-o, --output <path>', 'Output directory')
    .option('-t, --type <type>', 'Backup type (full, database, media, config)', 'full')
    .option('--description <text>', 'Backup description')
    .action(async (options) => {
      const spinner = createSpinner('Creating backup...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const { BackupManager } = await import('@nodepressjs/core');
        const manager = new BackupManager(prisma, {
          backupDir: options.output || process.env.BACKUP_DIR || './backups',
        });
        const record = await manager.createBackup({
          type: options.type as any,
          description: options.description,
        });
        spinner.stop();
        success(`Backup created: ${record.id}`);
        info(`File: ${record.path}`);
        info(`Size: ${formatFileSize(record.size)}`);
        info(`Type: ${record.type}`);
      } catch (err: any) {
        spinner.fail('Backup failed');
        error(err.message);
      }
    });

  backup
    .command('restore')
    .description('Restore from a backup')
    .requiredOption('-i, --input <id>', 'Backup ID or file path')
    .option('-t, --type <type>', 'Restore type (full, database, media, config)', 'full')
    .option('--force', 'Skip confirmation')
    .action(async (options) => {
      if (!options.force) {
        console.log(chalk.yellow('\n  ⚠ Restore will OVERWRITE current data.\n'));
        console.log(chalk.dim('  Use --force to skip confirmation.\n'));
        return;
      }
      const spinner = createSpinner('Restoring from backup...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const { BackupManager } = await import('@nodepressjs/core');
        const manager = new BackupManager(prisma, {
          backupDir: process.env.BACKUP_DIR || './backups',
        });
        await manager.restoreBackup(options.input, { type: options.type as any });
        spinner.stop();
        success('Backup restored successfully');
      } catch (err: any) {
        spinner.fail('Restore failed');
        error(err.message);
      }
    });
}
