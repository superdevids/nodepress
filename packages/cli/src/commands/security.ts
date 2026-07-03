import { Command } from 'commander';
import chalk from 'chalk';
import { createSpinner, success, error, info, warn } from '../utils/logger.js';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import crypto from 'node:crypto';

export function registerSecurityCommand(program: Command): void {
  const security = program
    .command('security')
    .description('Security tools');

  security
    .command('salt:generate')
    .description('Generate security keys/salts (Gap F-01)')
    .option('--length <number>', 'Length of each key', '64')
    .option('--count <number>', 'Number of keys to generate', '8')
    .option('--format <format>', 'Output format (table, env, json)', 'table')
    .action(
      async (options: { length?: string; count?: string; format?: string }) => {
        const spinner = createSpinner('Generating security keys...');
        spinner.start();

        try {
          const length = parseInt(options.length || '64', 10);
          const count = parseInt(options.count || '8', 10);

          const keys: { name: string; value: string }[] = [
            { name: 'AUTH_KEY', value: crypto.randomBytes(length).toString('hex') },
            { name: 'SECURE_AUTH_KEY', value: crypto.randomBytes(length).toString('hex') },
            { name: 'LOGGED_IN_KEY', value: crypto.randomBytes(length).toString('hex') },
            { name: 'NONCE_KEY', value: crypto.randomBytes(length).toString('hex') },
            { name: 'AUTH_SALT', value: crypto.randomBytes(length).toString('hex') },
            { name: 'SECURE_AUTH_SALT', value: crypto.randomBytes(length).toString('hex') },
            { name: 'LOGGED_IN_SALT', value: crypto.randomBytes(length).toString('hex') },
            { name: 'NONCE_SALT', value: crypto.randomBytes(length).toString('hex') },
          ];

          while (keys.length < count) {
            const idx = keys.length + 1;
            keys.push({
              name: `CUSTOM_KEY_${idx}`,
              value: crypto.randomBytes(length).toString('hex'),
            });
          }

          spinner.stop();

          switch (options.format) {
            case 'json':
              console.log(JSON.stringify(keys, null, 2));
              break;
            case 'env': {
              console.log('# ─── NodePress Security Keys ──────────────────────');
              console.log('# Add these to your .env file');
              console.log('');
              for (const k of keys) {
                console.log(`${k.name}=${k.value}`);
              }
              console.log('');
              info('Add these keys to your .env file and keep them secret!');
              break;
            }
            default: {
              console.log('');
              console.log('  Security Keys (keep these secret!):');
              console.log('  ───────────────────────────────────────────');
              for (const k of keys) {
                console.log(`  ${k.name.padEnd(20)} ${k.value.slice(0, 40)}...`);
              }
              console.log('');
              info(`Generated ${keys.length} keys (${length} bytes each)`);
              break;
            }
          }
          success('Security keys generated successfully');
        } catch (err: any) {
          spinner.fail('Failed to generate security keys');
          error(err.message);
        }
      }
    );

  security
    .command('app-password:create')
    .description('Generate an application password (Gap F-04)')
    .option('-u, --user <email>', 'User email (defaults to admin)')
    .option('-n, --name <name>', 'Application name')
    .action(async (options: { user?: string; name?: string }) => {
      const spinner = createSpinner('Generating application password...');
      spinner.start();
      try {
        const client = await getPrismaClient();
        let userEmail = options.user;
        if (!userEmail) {
          const admin = await client.user.findFirst({
            where: { role: 'SUPER_ADMIN' },
            orderBy: { createdAt: 'asc' },
          });
          if (!admin) {
            spinner.fail('No admin user found. Create a user first.');
            return;
          }
          userEmail = admin.email;
        }
        const user = await client.user.findUnique({ where: { email: userEmail } });
        if (!user) {
          spinner.fail(`User "${userEmail}" not found`);
          return;
        }
        const rawPassword = crypto.randomBytes(24).toString('base64url');
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash(rawPassword, 12);
        const appName = options.name || `CLI App ${new Date().toISOString().slice(0, 10)}`;
        await client.applicationPassword.create({
          data: {
            userId: user.id,
            name: appName,
            hashedPassword,
          },
        });
        spinner.stop();
        console.log('');
        console.log('  ┌───────────────────────────────────────────────────┐');
        console.log('  │  Application Password Generated                   │');
        console.log('  ├───────────────────────────────────────────────────┤');
        console.log(`  │  User:        ${(user.email || '').padEnd(33)}│`);
        console.log(`  │  App:         ${appName.padEnd(33)}│`);
        console.log('  │                                                   │');
        console.log(`  │  Password:    ${rawPassword.padEnd(33)}│`);
        console.log('  │  (Show once — save securely)                     │');
        console.log('  └───────────────────────────────────────────────────┘');
        console.log('');
        success('Application password created');
        warn('This password will not be shown again. Save it securely!');
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to generate application password');
        error(err.message);
      }
    });

  security
    .command('policy:show')
    .description('Show current password policy configuration')
    .action(async () => {
      console.log(chalk.cyan('\n  Password Policy Configuration:\n'));
      console.log(`  Min Length:     ${process.env.PASSWORD_MIN_LENGTH || '8'}`);
      console.log(`  Require Upper:  ${process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false'}`);
      console.log(`  Require Number: ${process.env.PASSWORD_REQUIRE_NUMBERS !== 'false'}`);
      console.log(`  Require Symbol: ${process.env.PASSWORD_REQUIRE_SYMBOLS !== 'false'}`);
      console.log(`  History Count:  ${process.env.PASSWORD_HISTORY_COUNT || '5'}`);
      console.log(`  Expiry Days:    ${process.env.PASSWORD_EXPIRY_DAYS || '90'}`);
      console.log();
    });

  security
    .command('2fa:status')
    .description('Check 2FA status for a user')
    .requiredOption('-u, --user <email>', 'User email')
    .action(async (options: { user: string }) => {
      const spinner = createSpinner('Checking 2FA status...');
      spinner.start();
      try {
        const client = await getPrismaClient();
        const user = await client.user.findUnique({ where: { email: options.user } });
        if (!user) {
          spinner.fail(`User "${options.user}" not found`);
          return;
        }
        // Placeholder — real 2FA status requires two_factor_secrets table
        spinner.stop();
        info(`2FA status for ${options.user}: not yet implemented (requires DB migration)`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to check 2FA status');
        error(err.message);
      }
    });
}
