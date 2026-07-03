import type { Command } from "commander";

export function themeCommands(program: Command): void {
  const theme = program.command("theme").description("Theme management commands");

  theme
    .command("list")
    .description("List installed themes")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  theme
    .command("activate")
    .description("Activate a theme")
    .requiredOption("-s, --slug <slug>", "Theme slug")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
