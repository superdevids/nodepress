import type { Command } from "commander";

export function backupCommands(program: Command): void {
  const backup = program.command("backup").description("Backup and restore commands");

  backup
    .command("create")
    .description("Create a full backup (database + media + config)")
    .option("-o, --output <path>", "Output directory", "./backups")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  backup
    .command("restore")
    .description("Restore from a backup")
    .requiredOption("-i, --input <path>", "Backup file to restore")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
