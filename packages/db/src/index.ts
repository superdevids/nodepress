/**
 * @nodepress/db
 *
 * Database client and Prisma interface for NodePress.
 * Provides the PrismaClient singleton and seed utilities.
 */

import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

export type PrismaClient = PrismaClient;

let prisma: PrismaClient | null = null;

/**
 * Get or create the PrismaClient singleton.
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }
  return prisma;
}

/**
 * Gracefully disconnect the PrismaClient.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Create a fresh PrismaClient instance for testing.
 */
export function createTestClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL ?? "postgresql://nodepress:nodepress@localhost:5432/nodepress_test",
      },
    },
  });
}

export default getPrismaClient;
