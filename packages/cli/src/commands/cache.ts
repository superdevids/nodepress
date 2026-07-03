import type { Command } from "commander";

export function cacheCommands(program: Command): void {
  const cache = program.command("cache").description("Cache management commands");

  cache
    .command("clear")
    .description("Clear all cache")
    .option("--tags <tags>", "Specific tags to clear (comma-separated)")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
