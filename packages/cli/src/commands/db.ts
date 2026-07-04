import type { Command } from 'commander';
import chalk from 'chalk';
import { pushSchema, runMigrations, seedDatabase } from '../utils/db.js';
import { createSpinner, error, info } from '../utils/logger.js';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

function findPrismaBin(): string {
  const candidates = [
    path.join(process.cwd(), 'node_modules', '.bin', 'prisma'),
    path.join(process.cwd(), '..', 'db', 'node_modules', '.bin', 'prisma'),
    'npx.cmd',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  for (const c of candidates) {
    if (fs.existsSync(c + '.cmd')) return c + '.cmd';
  }
  return 'npx.cmd';
}

function getDbPackageDir(): string {
  const pkgDir = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '..',
    '..',
    '..',
    'db',
  );
  if (fs.existsSync(pkgDir)) return pkgDir;
  return process.cwd();
}

function runPrisma(args: string[], label: string): void {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL environment variable is required');
  const spinner = createSpinner(label);
  spinner.start();
  try {
    const prismaBin = findPrismaBin();
    const cwd = getDbPackageDir();
    const schemaPath = path.join(cwd, 'prisma', 'schema.prisma');
    const schemaArg = fs.existsSync(schemaPath) ? ` --schema="${schemaPath}"` : '';
    execSync(
      `${prismaBin}${prismaBin === 'npx.cmd' ? ' prisma' : ''} ${args.join(' ')}${schemaArg}`,
      {
        cwd,
        stdio: 'pipe',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      },
    );
    spinner.succeed(`${label} completed`);
  } catch (err: any) {
    spinner.fail(`${label} failed`);
    error(err.stderr?.toString() || err.message);
    throw err;
  }
}

export function dbCommands(program: Command): void {
  const db = program.command('db').description('Database management commands');

  db.command('migrate')
    .description('Run database migrations')
    .option('--name <name>', 'Migration name')
    .action(async (options) => {
      try {
        if (options.name) {
          runPrisma([`migrate`, `dev`, `--name`, `"${options.name}"`], 'Creating migration');
        } else {
          await runMigrations();
        }
      } catch {
        process.exit(1);
      }
    });

  db.command('push')
    .description('Push schema changes to database')
    .action(async () => {
      try {
        await pushSchema();
      } catch {
        process.exit(1);
      }
    });

  db.command('seed')
    .description('Seed the database with sample data')
    .action(async () => {
      try {
        await seedDatabase();
      } catch {
        process.exit(1);
      }
    });

  db.command('reset')
    .description('Reset the database')
    .option('--force', 'Skip confirmation')
    .action(async (options) => {
      if (!options.force) {
        console.log(chalk.yellow('\n  ⚠ This will DESTROY ALL DATA in the database.\n'));
        console.log('  Use --force to skip this warning.\n');
        return;
      }
      try {
        runPrisma(['migrate', 'reset', '--force'], 'Resetting database');
      } catch {
        process.exit(1);
      }
    });

  db.command('studio')
    .description('Open Prisma Studio')
    .action(async () => {
      info('Starting Prisma Studio...');
      try {
        runPrisma(['studio'], 'Prisma Studio');
      } catch (err: any) {
        error(err.message);
      }
    });
}
