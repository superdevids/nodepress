#!/usr/bin/env node

/**
 * NodePress CLI — Command-line tool for managing NodePress installations.
 *
 * Usage: npx nodepress <command> [options]
 *
 * Commands:
 *   core:version          Display version information
 *   core:install          Install NodePress (setup database, create admin user)
 *   core:update           Update NodePress core
 *   db:migrate            Run database migrations
 *   db:push               Push schema changes to database
 *   db:seed               Seed the database with sample data
 *   db:reset              Reset the database
 *   db:studio             Open Prisma Studio
 *   content:list          List content entries
 *   content:create        Create a new content entry
 *   content:delete        Delete a content entry
 *   plugin:list           List installed plugins
 *   plugin:activate       Activate a plugin
 *   plugin:deactivate     Deactivate a plugin
 *   theme:list            List installed themes
 *   theme:activate        Activate a theme
 *   user:create           Create a user
 *   user:list             List users
 *   user:delete           Delete a user
 *   user:set-role         Set user role
 *   cache:clear           Clear the cache
 *   backup:create         Create a backup
 *   backup:restore        Restore from a backup
 *   generate:plugin       Scaffold a new plugin
 *   generate:content-type Scaffold a new content type
 *   generate:block        Scaffold a new block
 *   generate:theme        Scaffold a new theme
 *   maintenance:enable    Enable maintenance mode
 *   maintenance:disable   Disable maintenance mode
 *   cron:list             List scheduled cron jobs
 *   cron:run              Run a specific cron job
 */

import { Command } from "commander";

const program = new Command();

program
  .name("nodepress")
  .description("NodePress CLI — WordPress-compatible CMS for Node.js")
  .version("0.0.1");

// ─── Core commands ─────────────────────────────────────────
import { coreCommands } from "./commands/core.js";
import { dbCommands } from "./commands/db.js";
import { contentCommands } from "./commands/content.js";
import { pluginCommands } from "./commands/plugin.js";
import { themeCommands } from "./commands/theme.js";
import { userCommands } from "./commands/user.js";
import { cacheCommands } from "./commands/cache.js";
import { backupCommands } from "./commands/backup.js";
import { generateCommands } from "./commands/generate.js";
import { maintenanceCommands } from "./commands/maintenance.js";
import { cronCommands } from "./commands/cron.js";
import { registerSecurityCommand } from "./commands/security.js";
import { registerSettingsCommand } from "./commands/settings.js";

coreCommands(program);
dbCommands(program);
contentCommands(program);
pluginCommands(program);
themeCommands(program);
userCommands(program);
cacheCommands(program);
backupCommands(program);
generateCommands(program);
maintenanceCommands(program);
cronCommands(program);
registerSecurityCommand(program);
registerSettingsCommand(program);

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
