import type { Command } from 'commander';
import chalk from 'chalk';
import { getPrismaClient, disconnectPrisma } from '../utils/db.js';
import { createSpinner, success, error } from '../utils/logger.js';

export function themeCommands(program: Command): void {
  const theme = program.command('theme').description('Theme management commands');

  theme
    .command('list')
    .description('List installed themes')
    .action(async () => {
      const spinner = createSpinner('Loading themes...');
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const themes = await prisma.theme.findMany({ orderBy: { name: 'asc' } });
        spinner.stop();
        if (themes.length === 0) {
          console.log(chalk.dim('\n  No themes installed.\n'));
        } else {
          console.log(chalk.cyan('\n  Installed themes:\n'));
          for (const t of themes) {
            const status = t.active ? chalk.green('active') : chalk.dim('inactive');
            console.log(`  ${chalk.bold(t.slug.padEnd(25))} ${status}  v${t.version}  ${t.name}`);
          }
          console.log();
        }
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail('Failed to load themes');
        error(err.message);
      }
    });

  theme
    .command('activate')
    .description('Activate a theme')
    .requiredOption('-s, --slug <slug>', 'Theme slug')
    .action(async (options) => {
      const spinner = createSpinner(`Activating theme "${options.slug}"...`);
      spinner.start();
      try {
        const prisma = await getPrismaClient();
        const existing = await prisma.theme.findUnique({ where: { slug: options.slug } });
        if (!existing) {
          spinner.fail(`Theme "${options.slug}" not found`);
          await disconnectPrisma();
          return;
        }
        await prisma.theme.updateMany({ where: { active: true }, data: { active: false } });
        await prisma.theme.update({ where: { slug: options.slug }, data: { active: true } });
        spinner.stop();
        success(`Theme "${options.slug}" activated.`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail(`Failed to activate theme "${options.slug}"`);
        error(err.message);
      }
    });
}
