import type { Command } from "commander";
import chalk from "chalk";
import { getPrismaClient, disconnectPrisma } from "../utils/db.js";
import { createSpinner, success, error, warn } from "../utils/logger.js";
import fs from "fs/promises";
import path from "path";

export function pluginCommands(program: Command): void {
  const plugin = program.command("plugin").description("Plugin management commands");

  plugin
    .command("list")
    .description("List installed plugins")
    .action(async () => {
      const spinner = createSpinner("Loading plugins...");
      spinner.start();
      try {
        const client = await getPrismaClient();
        const plugins = await client.plugin.findMany({ orderBy: { slug: "asc" } });
        spinner.stop();
        if (plugins.length === 0) {
          console.log(chalk.dim("\n  No plugins installed.\n"));
        } else {
          console.log(chalk.cyan("\n  Installed plugins:\n"));
          for (const p of plugins) {
            const status = p.active ? chalk.green("active") : chalk.dim("inactive");
            console.log(`  ${chalk.bold(p.slug.padEnd(25))} ${status}  v${p.version}`);
          }
          console.log();
        }
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail("Failed to load plugins");
        error(err.message);
      }
    });

  plugin
    .command("activate")
    .description("Activate a plugin")
    .requiredOption("-s, --slug <slug>", "Plugin slug")
    .action(async (options) => {
      const spinner = createSpinner(`Activating plugin "${options.slug}"...`);
      spinner.start();
      try {
        const client = await getPrismaClient();
        const existing = await client.plugin.findUnique({ where: { slug: options.slug } });
        if (!existing) {
          spinner.fail(`Plugin "${options.slug}" not found`);
          await disconnectPrisma();
          return;
        }
        await client.plugin.update({
          where: { slug: options.slug },
          data: { active: true },
        });
        spinner.stop();
        success(`Plugin "${options.slug}" activated.`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail(`Failed to activate plugin "${options.slug}"`);
        error(err.message);
      }
    });

  plugin
    .command("deactivate")
    .description("Deactivate a plugin (emergency fallback)")
    .requiredOption("-s, --slug <slug>", "Plugin slug")
    .option("--emergency", "Emergency mode — bypass hooks")
    .action(async (options) => {
      const spinner = createSpinner(`Deactivating plugin "${options.slug}"...`);
      spinner.start();
      try {
        const client = await getPrismaClient();
        const existing = await client.plugin.findUnique({ where: { slug: options.slug } });
        if (!existing) {
          spinner.fail(`Plugin "${options.slug}" not found`);
          await disconnectPrisma();
          return;
        }
        if (!existing.active) {
          spinner.stop();
          warn(`Plugin "${options.slug}" is already inactive.`);
          await disconnectPrisma();
          return;
        }
        await client.plugin.update({
          where: { slug: options.slug },
          data: { active: false },
        });

        if (options.emergency) {
          const lockDir = process.env.NODEPRESS_LOCK_DIR || "./.nodepress/locks";
          await fs.mkdir(lockDir, { recursive: true });
          const lockFile = path.join(lockDir, `${options.slug}.lock`);
          await fs.writeFile(lockFile, JSON.stringify({
            deactivatedAt: new Date().toISOString(),
            reason: "CLI emergency deactivation",
            deactivatedBy: "cli",
          }, null, 2));
        }

        spinner.stop();
        success(`Plugin "${options.slug}" deactivated.`);
        await disconnectPrisma();
      } catch (err: any) {
        spinner.fail(`Failed to deactivate plugin "${options.slug}"`);
        error(err.message);
      }
    });
}
