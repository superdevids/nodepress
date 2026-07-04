import type { Command } from 'commander';
import chalk from 'chalk';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import { createSpinner, success, error, info, warn, printTable } from '../utils/logger.js';
import { formatDate } from '../utils/format.js';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export function userCommands(program: Command): void {
  const user = program.command('user').description('User management commands');

  user
    .command('create')
    .description('Create a new user')
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-n, --name <name>', 'User display name')
    .option('-p, --password <password>', 'User password')
    .option('-r, --role <role>', 'User role', 'subscriber')
    .action(async (options) => {
      const spinner = createSpinner('Creating user...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const existing = await prisma.user.findUnique({ where: { email: options.email } });
        if (existing) {
          spinner.fail(`User "${options.email}" already exists`);
          await disconnectPrisma();
          return;
        }
        const password = options.password || crypto.randomBytes(12).toString('hex');
        const passwordHash = await bcrypt.hash(password, 12);
        const role = options.role.toUpperCase();
        const validRoles = [
          'SUPER_ADMIN',
          'ADMIN',
          'EDITOR',
          'AUTHOR',
          'CONTRIBUTOR',
          'SUBSCRIBER',
        ];
        if (!validRoles.includes(role)) {
          spinner.fail(`Invalid role "${options.role}". Valid: ${validRoles.join(', ')}`);
          await disconnectPrisma();
          return;
        }
        const created = await prisma.user.create({
          data: {
            email: options.email,
            name: options.name,
            displayName: options.name,
            passwordHash,
            role,
            userStatus: 0,
          },
        });
        spinner.stop();
        success(`User created: ${created.email}`);
        info(`Role: ${role}`);
        if (!options.password) {
          warn(`Generated password: ${password}`);
          info('Change it on first login.');
        }
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to create user');
        error(err.message);
      }
    });

  user
    .command('list')
    .description('List all users')
    .action(async () => {
      const spinner = createSpinner('Loading users...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
        spinner.stop();
        if (users.length === 0) {
          console.log(chalk.dim('\n  No users found.\n'));
        } else {
          const headers = ['Email', 'Name', 'Role', 'Registered'];
          const rows = users.map((u: any) => [
            u.email,
            u.displayName || u.name,
            u.role,
            formatDate(u.createdAt),
          ]);
          console.log();
          printTable(headers, rows);
          console.log();
        }
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to load users');
        error(err.message);
      }
    });

  user
    .command('delete')
    .description('Delete a user')
    .requiredOption('-e, --email <email>', 'User email')
    .option('--force', 'Skip confirmation')
    .action(async (options) => {
      const spinner = createSpinner('Finding user...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const existing = await prisma.user.findUnique({ where: { email: options.email } });
        if (!existing) {
          spinner.fail(`User "${options.email}" not found`);
          await disconnectPrisma();
          return;
        }
        spinner.stop();
        if (!options.force) {
          console.log(chalk.yellow(`\n  ⚠ Delete user "${existing.email}"?`));
          console.log(chalk.dim(`  Name: ${existing.name}`));
          console.log(chalk.dim(`  Role: ${existing.role}`));
          console.log(chalk.dim(`  Use --force to skip confirmation.\n`));
          await disconnectPrisma();
          return;
        }
        const del = createSpinner(`Deleting user "${options.email}"...`);
        del.start();
        await prisma.user.delete({ where: { email: options.email } });
        del.stop();
        success(`User "${options.email}" deleted`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to delete user');
        error(err.message);
      }
    });

  user
    .command('set-role')
    .description("Set a user's role")
    .requiredOption('-e, --email <email>', 'User email')
    .requiredOption('-r, --role <role>', 'New role')
    .action(async (options) => {
      const spinner = createSpinner(`Setting role for "${options.email}"...`);
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const existing = await prisma.user.findUnique({ where: { email: options.email } });
        if (!existing) {
          spinner.fail(`User "${options.email}" not found`);
          await disconnectPrisma();
          return;
        }
        const role = options.role.toUpperCase();
        const validRoles = [
          'SUPER_ADMIN',
          'ADMIN',
          'EDITOR',
          'AUTHOR',
          'CONTRIBUTOR',
          'SUBSCRIBER',
        ];
        if (!validRoles.includes(role)) {
          spinner.fail(`Invalid role "${options.role}". Valid: ${validRoles.join(', ')}`);
          await disconnectPrisma();
          return;
        }
        await prisma.user.update({ where: { email: options.email }, data: { role } });
        spinner.stop();
        success(`Role set to "${role}" for "${options.email}"`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to set role');
        error(err.message);
      }
    });
}
