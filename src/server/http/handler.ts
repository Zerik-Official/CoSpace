import type { NextRequest } from "next/server";
import { z, type ZodType } from "zod";

import { AppError, ErrorCode } from "@/server/errors";
import { jsonError, validationErrorFrom } from "@/server/http/responses";

/** Dynamic segment values resolved by Next.js for a route handler. */
export type RouteContext<TParams extends Record<string, string> = Record<string, string>> = {
  params: Promise<TParams>;
};

/** Signature every route handler of the application implements. */
export type RouteHandler<TParams extends Record<string, string> = Record<string, string>> = (
  request: NextRequest,
  context: RouteContext<TParams>,
) => Promise<Response>;

/**
 * Detects a framework control flow error, such as a prerender bail out, a
 * redirect or a not found signal. Those must travel untouched, otherwise the
 * route loses the behaviour Next.js is asking for.
 *
 * @param error - Thrown value, unknown on purpose.
 * @returns True when the value is a framework control flow signal.
 */
function isFrameworkControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  const { digest } = error as { digest: unknown };

  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/**
 * Wraps a route handler so every thrown value becomes a consistent error
 * envelope with the right HTTP status.
 *
 * @param route - Route label used in logs.
 * @param handler - Route handler implementation.
 * @returns A handler that converts application failures into error responses.
 */
export function withApiErrors<TParams extends Record<string, string>>(
  route: string,
  handler: RouteHandler<TParams>,
): RouteHandler<TParams> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (isFrameworkControlFlowError(error)) {
        throw error;
      }

      return jsonError(error, route);
    }
  };
}

/**
 * Reads and validates a JSON request body.
 *
 * @param request - Incoming request.
 * @param schema - Zod schema the body must satisfy.
 * @returns The parsed and typed body.
 * @throws AppError with code VALIDATION_ERROR when the body is malformed.
 */
export async function validateJsonBody<TBody>(
  request: NextRequest,
  schema: ZodType<TBody>,
): Promise<TBody> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      { fields: "body" },
      "Request body is not valid JSON",
    );
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw validationErrorFrom(parsed.error);
  }

  return parsed.data;
}

/**
 * Reads and validates the search parameters of a request.
 *
 * @param request - Incoming request.
 * @param schema - Zod schema the search parameters must satisfy.
 * @returns The parsed and typed search parameters.
 * @throws AppError with code VALIDATION_ERROR when a parameter is invalid.
 */
export function validateSearchParams<TQuery>(
  request: NextRequest,
  schema: ZodType<TQuery>,
): TQuery {
  const rawQuery = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(rawQuery);

  if (!parsed.success) {
    throw validationErrorFrom(parsed.error);
  }

  return parsed.data;
}

/**
 * Reads the `id` path parameter and rejects values that cannot be a resource
 * identifier, so a malformed URL never reaches the database.
 *
 * @param context - Route context carrying the dynamic segment.
 * @returns The validated resource identifier.
 * @throws AppError with code NOT_FOUND when the identifier is malformed.
 */
export async function readResourceId<TParams extends { id: string }>(
  context: RouteContext<TParams>,
): Promise<string> {
  const { id } = await context.params;
  const parsed = z.uuid().safeParse(id);

  if (!parsed.success) {
    throw new AppError(ErrorCode.NOT_FOUND, {}, "Malformed resource identifier");
  }

  return parsed.data;
}

/**
 * Resolves the client address used to scope anonymous rate limits.
 *
 * @param request - Incoming request.
 * @returns Forwarded client address, falling back to a stable placeholder.
 */
export function clientAddress(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown-client"
  );
}
