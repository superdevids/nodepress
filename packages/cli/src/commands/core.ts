import type { Command } from "commander";
import chalk from "chalk";

export function coreCommands(program: Command): void {
  const core = program.command("core").description("Core management commands");

  core
    .command("version")
    .description("Display version information")
    .action(() => {
      console.log(chalk.bold("\n  NodePress CLI v0.0.1"));
      console.log("  Core Engine:  0.0.1");
      console.log("  Plugin SDK:   0.0.1");
      console.log("  Database:     Prisma (PostgreSQL)");
      console.log(`  Node.js:      ${process.version}\n`);
    });

  core
    .command("install")
    .description("Install NodePress (setup database, create admin user)")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  core
    .command("update")
    .description("Update NodePress core")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
