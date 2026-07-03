import type { Command } from "commander";

export function userCommands(program: Command): void {
  const user = program.command("user").description("User management commands");

  user
    .command("create")
    .description("Create a new user")
    .requiredOption("-e, --email <email>", "User email")
    .requiredOption("-n, --name <name>", "User display name")
    .option("-p, --password <password>", "User password")
    .option("-r, --role <role>", "User role", "subscriber")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  user
    .command("list")
    .description("List all users")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  user
    .command("delete")
    .description("Delete a user")
    .requiredOption("-e, --email <email>", "User email")
    .action(async () => {
      throw new Error("Not implemented yet");
    });

  user
    .command("set-role")
    .description("Set a user's role")
    .requiredOption("-e, --email <email>", "User email")
    .requiredOption("-r, --role <role>", "New role")
    .action(async () => {
      throw new Error("Not implemented yet");
    });
}
