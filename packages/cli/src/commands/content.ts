import type { Command } from "commander";

export function contentCommands(program: Command): void {
  const content = program.command("content").description("Content management commands");

  content
    .command("list")
    .description("List content entries")
    .option("-t, --type <type>", "Content type to list")
    .option("--limit <number>", "Number of entries to show", "20")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  content
    .command("create")
    .description("Create a new content entry")
    .requiredOption("-t, --type <type>", "Content type")
    .requiredOption("--title <title>", "Entry title")
    .option("--status <status>", "Entry status", "draft")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  content
    .command("delete")
    .description("Delete a content entry")
    .requiredOption("-t, --type <type>", "Content type")
    .requiredOption("--id <id>", "Entry ID")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
