import type { ApiEnvelope, ApiErrorEnvelope } from "@/lib/api/envelope";
import { ErrorCode, errorMessageKey } from "@/lib/domain/errors";

/** Options accepted by the browser fetch helper. */
export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

function networkFailure(): ApiErrorEnvelope {
  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      messageKey: errorMessageKey(ErrorCode.INTERNAL_ERROR),
    },
  };
}

/**
 * Calls a route handler of this application and always resolves to an envelope,
 * so callers never have to guard against a thrown fetch or a non JSON body.
 *
 * @param path - Route handler path, always relative to the current origin.
 * @param options - Method, body and headers of the request.
 * @returns The parsed envelope, or a synthetic internal error envelope.
 */
export async function apiRequest<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiEnvelope<TData>> {
  try {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
      headers: {
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    return (await response.json()) as ApiEnvelope<TData>;
  } catch {
    return networkFailure();
  }
}
