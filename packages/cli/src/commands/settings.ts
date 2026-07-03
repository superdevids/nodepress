import { Command } from 'commander';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import { createSpinner, success, error, info, printTable } from '../utils/logger.js';

export function registerSettingsCommand(program: Command): void {
  const setting = program.command('setting').description('Manage settings');

  setting
    .command('get <key>')
    .description('Get a setting value')
    .option('-g, --group <group>', 'Setting group', 'general')
    .option('--json', 'Output as JSON')
    .action(
      async (
        key: string,
        options: { group?: string; json?: boolean }
      ) => {
        try {
          const prisma = await getPrismaClient();
          const setting = await prisma.setting.findUnique({
            where: { group_key: { group: options.group || 'general', key } },
          });

          if (!setting) {
            error(`Setting "${key}" not found in group "${options.group}"`);
            return;
          }

          if (options.json) {
            console.log(JSON.stringify(setting, null, 2));
            return;
          }

          console.log('');
          console.log(`  Group:   ${setting.group}`);
          console.log(`  Key:     ${setting.key}`);
          console.log(`  Value:   ${JSON.stringify(setting.value)}`);
          console.log(`  Autoload: ${setting.autoload ? 'Yes' : 'No'}`);
          if (setting.pluginId) {
            console.log(`  Plugin:  ${setting.pluginId}`);
          }
          console.log('');
        } catch (err: any) {
          error(err.message);
        } finally {
          await disconnectPrisma();
        }
      }
    );

  setting
    .command('set <key> <value>')
    .description('Set a setting value')
    .option('-g, --group <group>', 'Setting group', 'general')
    .option('--no-autoload', 'Disable autoload')
    .action(
      async (
        key: string,
        value: string,
        options: { group?: string; autoload?: boolean }
      ) => {
        const spinner = createSpinner(`Setting "${key}"...`);
        spinner.start();

        try {
          const prisma = await getPrismaClient();

          // Try to parse value as JSON, fall back to string
          let parsedValue: any = value;
          try {
            parsedValue = JSON.parse(value);
          } catch {
            // Keep as string
          }

          await prisma.setting.upsert({
            where: {
              group_key: { group: options.group || 'general', key },
            },
            update: {
              value: parsedValue,
              autoload: options.autoload !== false,
            },
            create: {
              group: options.group || 'general',
              key,
              value: parsedValue,
              autoload: options.autoload !== false,
            },
          });

          spinner.succeed(`Setting "${key}" saved`);
          info(`Value: ${JSON.stringify(parsedValue)}`);
        } catch (err: any) {
          spinner.fail(`Failed to set "${key}"`);
          error(err.message);
        } finally {
          await disconnectPrisma();
        }
      }
    );
}
