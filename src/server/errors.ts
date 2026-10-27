import { ERROR_HTTP_STATUS, ErrorCode, type ErrorParams } from "@/lib/domain/errors";

export { ERROR_HTTP_STATUS, ErrorCode, errorMessageKey } from "@/lib/domain/errors";
export type { ErrorParams } from "@/lib/domain/errors";

/**
 * Recoverable failure carrying a stable code, an HTTP status and interpolation
 * values. Services throw it and the HTTP layer turns it into a response envelope.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly params: ErrorParams;

  /**
   * @param code - Stable error code exposed to clients.
   * @param params - Interpolation values for the localized message.
   * @param message - Developer facing description used in logs.
   */
  constructor(code: ErrorCode, params: ErrorParams = {}, message?: string) {
    super(message ?? code);
    this.name = "AppError";
    this.code = code;
    this.status = ERROR_HTTP_STATUS[code];
    this.params = params;
  }

  /**
   * Narrows an unknown value to an AppError.
   *
   * @param error - Value thrown by a service or a library.
   * @returns True when the value is an application error.
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }
}
