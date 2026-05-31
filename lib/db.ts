import { PrismaClient } from "@prisma/client";

/**
 * Single Prisma client instance (avoids exhausting DB connections in dev
 * due to Next.js hot-reload). See docs/AGENTS.md §6 — centralized data access.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
