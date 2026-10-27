import type { ErrorCode } from "@/server/errors";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";
const SERIALIZATION_FAILURE = "P2034";
/**
 * Reads the Prisma error code carried by a thrown value.
 *
 * @param error - Value thrown by the Prisma client.
 * @returns The driver error code, or null when the value is not a Prisma error.
 */
function prismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code: unknown }).code;

  return typeof code === "string" ? code : null;
}

/**
 * Detects a unique constraint violation, used to translate race conditions into
 * domain errors such as a duplicated email or a repeated idempotency key.
 *
 * @param error - Value thrown by the Prisma client.
 * @param constraint - Optional constraint name the violation must belong to.
 * @returns True when the failure is a unique constraint violation.
 */
export function isUniqueConstraintError(error: unknown, constraint?: string): boolean {
  if (prismaErrorCode(error) !== UNIQUE_CONSTRAINT_VIOLATION) {
    return false;
  }

  if (!constraint) {
    return true;
  }

  const meta = (error as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;
  const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");

  return targetText.includes(constraint);
}

/**
 * Detects a serialization failure raised by a SERIALIZABLE transaction, which is
 * safe to retry because the operation had no side effects.
 *
 * @param error - Value thrown by the Prisma client.
 * @returns True when the failure is a serialization or deadlock error.
 */
export function isSerializationError(error: unknown): boolean {
  return prismaErrorCode(error) === SERIALIZATION_FAILURE;
}

