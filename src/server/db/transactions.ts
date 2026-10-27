import { Prisma, type PrismaClient } from "@/server/db/generated/client";

import { isSerializationError } from "@/server/db/errors";
import { Logger, LogTag } from "@/server/logger";

const MAX_TRANSACTION_ATTEMPTS = 3;

/**
 * Runs a unit of work inside a SERIALIZABLE transaction, retrying the
 * serialization conflicts PostgreSQL reports for concurrent writes.
 *
 * @param prisma - Prisma client owning the connection pool.
 * @param operation - Work to run with the transaction-scoped client.
 * @param label - Label used in the logs of each retry.
 * @param exhaustedError - Error factory used when every attempt conflicts.
 * @returns The value produced by the operation.
 */
export async function runSerializableTransaction<TResult>(
  prisma: PrismaClient,
  operation: (transaction: Prisma.TransactionClient) => Promise<TResult>,
  label: string,
  exhaustedError: () => Error,
): Promise<TResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isSerializationError(error)) {
        throw error;
      }

      lastError = error;
      Logger.log("WARN", LogTag.DATABASE, "Retrying serializable transaction", {
        label,
        attempt,
      });
    }
  }

  Logger.error(LogTag.DATABASE, "Serializable transaction exhausted its retries", lastError, {
    label,
  });

  throw exhaustedError();
}
