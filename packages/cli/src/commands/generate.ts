import type { Command } from "commander";

export function generateCommands(program: Command): void {
  const generate = program.command("generate").description("Scaffold new components");

  generate
    .command("plugin <name>")
    .description("Scaffold a new plugin")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  generate
    .command("content-type <name>")
    .description("Scaffold a new content type definition")
    .option("-f, --fields <fields>", "Field definitions (key:type,key:type)")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  generate
    .command("block <name>")
    .description("Scaffold a new block")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  generate
    .command("theme <name>")
    .description("Scaffold a new theme")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
