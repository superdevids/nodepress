import type { Command } from "commander";

export function cronCommands(program: Command): void {
  const cron = program.command("cron").description("Scheduled task management");

  cron
    .command("list")
    .description("List scheduled cron jobs")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  cron
    .command("run <slug>")
    .description("Run a specific cron job")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
