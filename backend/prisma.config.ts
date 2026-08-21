import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI (generate / db push) must use a direct Postgres URL.
 * Never point this at a Prisma Accelerate URL (prisma://...).
 *
 * Local: prefer DIRECT_DATABASE_URL, fall back to DATABASE_URL.
 * Railway: set DATABASE_URL (and optionally DIRECT_DATABASE_URL) to the
 * Postgres plugin connection string.
 */
function resolveCliDatabaseUrl(): string | undefined {
  const direct = process.env.DIRECT_DATABASE_URL?.trim();
  if (direct) return direct;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return undefined;

  if (
    databaseUrl.startsWith("prisma://") ||
    databaseUrl.startsWith("prisma+postgres://")
  ) {
    throw new Error(
      "DATABASE_URL looks like a Prisma Accelerate URL. Set DIRECT_DATABASE_URL (or DATABASE_URL) to a direct postgresql:// connection string for prisma db push / generate.",
    );
  }

  return databaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: resolveCliDatabaseUrl(),
  },
});
