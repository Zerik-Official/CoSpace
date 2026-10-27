import { PrismaPg } from "@prisma/adapter-pg";

import { AppConfig } from "@/server/config";
import { PrismaClient } from "@/server/db/generated/client";

type PrismaGlobal = typeof globalThis & { cospacePrisma?: PrismaClient };

const globalForPrisma = globalThis as PrismaGlobal;

/**
 * Owns the single Prisma connection pool of the process. The pool is cached on
 * `globalThis` while developing so hot reloads do not open a new pool per save.
 */
export class DatabaseClient {
  private static instance: PrismaClient | undefined;

  /**
   * Returns the shared Prisma client, creating it on first use.
   *
   * @returns The process-wide Prisma client.
   */
  static shared(): PrismaClient {
    if (DatabaseClient.instance) {
      return DatabaseClient.instance;
    }

    if (globalForPrisma.cospacePrisma) {
      DatabaseClient.instance = globalForPrisma.cospacePrisma;
      return DatabaseClient.instance;
    }

    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: AppConfig.current.databaseUrl }),
    });

    DatabaseClient.instance = client;
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.cospacePrisma = client;
    }

    return client;
  }
}

/** Prisma client shared by every service of the application. */
export const prisma: PrismaClient = DatabaseClient.shared();
