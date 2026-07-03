import type { Command } from "commander";

export function dbCommands(program: Command): void {
  const db = program.command("db").description("Database management commands");

  db
    .command("migrate")
    .description("Run database migrations")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  db
    .command("push")
    .description("Push schema changes to database")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  db
    .command("seed")
    .description("Seed the database with sample data")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  db
    .command("reset")
    .description("Reset the database")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  db
    .command("studio")
    .description("Open Prisma Studio")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
