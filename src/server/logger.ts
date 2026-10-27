/** Severity levels of the structured logger. */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/** Business area a log line belongs to. */
export enum LogTag {
  HTTP = "HTTP",
  AUTH = "AUTH",
  SPACE = "SPACE",
  RESERVATION = "RESERVATION",
  DATABASE = "DATABASE",
}

/** Extra context attached to a log line. */
export type LogMeta = Record<string, string | number | boolean | null | undefined>;

/**
 * Minimal structured logger. Messages are always written in English and never
 * carry user facing text: the UI translates stable error codes instead.
 */
export class Logger {
  /**
   * Writes a single structured log line.
   *
   * @param level - Severity of the entry.
   * @param tag - Business area the entry belongs to.
   * @param message - English description of what happened.
   * @param meta - Optional structured context.
   */
  static log(level: LogLevel, tag: LogTag, message: string, meta?: LogMeta): void {
    const entry = {
      level,
      tag,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (level === "ERROR") {
      console.error(JSON.stringify(entry));
      return;
    }

    if (level === "WARN") {
      console.warn(JSON.stringify(entry));
      return;
    }

    console.log(JSON.stringify(entry));
  }

  /**
   * Writes a failure, keeping the original stack trace aside the structured line.
   *
   * @param tag - Business area the failure belongs to.
   * @param message - English description of the failure.
   * @param error - Thrown value, unknown on purpose.
   * @param meta - Optional structured context.
   */
  static error(tag: LogTag, message: string, error: unknown, meta?: LogMeta): void {
    Logger.log("ERROR", tag, message, {
      ...meta,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
