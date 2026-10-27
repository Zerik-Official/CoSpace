import { NextResponse } from "next/server";
import type { ZodError } from "zod";

import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "@/lib/api/envelope";
import { AppError, ErrorCode, errorMessageKey } from "@/server/errors";
import type { CookieDescriptor } from "@/server/http/cookies";
import { Logger, LogTag } from "@/server/logger";

/** Cookie name carrying the seconds a client must wait after a 429. */
const RETRY_AFTER_HEADER = "retry-after";

/**
 * Builds a successful response envelope.
 *
 * @param data - Payload returned by the route handler.
 * @param status - HTTP status code, 200 by default.
 * @param cookies - Cookies to set on the response.
 * @returns A JSON response following the API envelope.
 */
export function jsonData<TData>(
  data: TData,
  status = 200,
  cookies: CookieDescriptor[] = [],
): NextResponse<ApiSuccessEnvelope<TData>> {
  const response = NextResponse.json<ApiSuccessEnvelope<TData>>({ data }, { status });

  return applyCookies(response, cookies);
}

/**
 * Writes cookie descriptors onto a response.
 *
 * @param response - Response being built.
 * @param cookies - Cookie descriptors to apply.
 * @returns The same response instance for chaining.
 */
export function applyCookies<TResponse extends NextResponse>(
  response: TResponse,
  cookies: CookieDescriptor[],
): TResponse {
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

/**
 * Turns a Zod failure into a validation application error.
 *
 * @param error - Zod error produced while parsing user input.
 * @returns An application error listing the offending fields.
 */
export function validationErrorFrom(error: ZodError): AppError {
  const fields = error.issues
    .map((issue) => issue.path.join(".") || "body")
    .filter((field, index, all) => all.indexOf(field) === index)
    .join(", ");

  return new AppError(ErrorCode.VALIDATION_ERROR, { fields }, `Invalid input: ${fields}`);
}

/**
 * Converts any thrown value into a consistent error response.
 *
 * @param error - Thrown value, unknown on purpose.
 * @param route - Route label used in the log line.
 * @returns A JSON response following the error envelope.
 */
export function jsonError(error: unknown, route: string): NextResponse<ApiErrorEnvelope> {
  if (error instanceof AppError) {
    const level = error.status >= 500 ? "ERROR" : "WARN";
    Logger.log(level, LogTag.HTTP, "Request rejected", {
      route,
      code: error.code,
      status: error.status,
    });

    const response = NextResponse.json<ApiErrorEnvelope>(
      {
        error: {
          code: error.code,
          messageKey: errorMessageKey(error.code),
          params: error.params,
        },
      },
      { status: error.status },
    );

    const retryAfterSeconds = error.params.retryAfterSeconds;
    if (typeof retryAfterSeconds === "number") {
      response.headers.set(RETRY_AFTER_HEADER, String(retryAfterSeconds));
    }

    return response;
  }

  Logger.error(LogTag.HTTP, "Unhandled failure while serving a request", error, { route });

  return NextResponse.json<ApiErrorEnvelope>(
    {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        messageKey: errorMessageKey(ErrorCode.INTERNAL_ERROR),
      },
    },
    { status: 500 },
  );
}
