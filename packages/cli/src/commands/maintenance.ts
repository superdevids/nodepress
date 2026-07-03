import type { Command } from "commander";

export function maintenanceCommands(program: Command): void {
  const maintenance = program.command("maintenance").description("Maintenance mode commands");

  maintenance
    .command("enable")
    .description("Enable maintenance mode")
    .option("--secret <secret>", "Secret bypass token")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  maintenance
    .command("disable")
    .description("Disable maintenance mode")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
