import type { NextRequest } from "next/server";

import { AUTH_COOKIES } from "@/lib/domain/rules";
import { UserRole } from "@/lib/domain/enums";
import type { SessionUser } from "@/lib/domain/types";
import { application } from "@/server/container";
import { AppError, ErrorCode } from "@/server/errors";
import type { CookieDescriptor } from "@/server/http/cookies";
import type { SessionSnapshot } from "@/server/services/session.service";

/** Authenticated principal plus the cookies that must be refreshed downstream. */
export interface AuthenticatedRequest {
  user: SessionUser;
  renewedCookies: CookieDescriptor[];
}

/**
 * Resolves the session carried by the cookies of a request, renewing the access
 * token through the refresh token when it has expired.
 *
 * @param request - Incoming request.
 * @returns The resolved session, anonymous when no valid credential is present.
 */
export async function readSession(request: NextRequest): Promise<SessionSnapshot> {
  return application().sessions.resolve(
    request.cookies.get(AUTH_COOKIES.accessToken)?.value,
    request.cookies.get(AUTH_COOKIES.refreshToken)?.value,
  );
}

/**
 * Requires an authenticated principal. Route handlers never rely on the proxy
 * alone: they validate the session by themselves.
 *
 * @param request - Incoming request.
 * @returns The authenticated principal and the cookies to rewrite.
 * @throws AppError with code UNAUTHENTICATED when there is no valid session.
 */
export async function requireUser(request: NextRequest): Promise<AuthenticatedRequest> {
  const session = await readSession(request);

  if (!session.user) {
    throw new AppError(ErrorCode.UNAUTHENTICATED, {}, "No valid session was found");
  }

  return { user: session.user, renewedCookies: session.renewedCookies };
}

/**
 * Requires an authenticated principal holding the administrator role.
 *
 * @param request - Incoming request.
 * @returns The authenticated administrator and the cookies to rewrite.
 * @throws AppError with code FORBIDDEN when the role is not the administrator one.
 */
export async function requireAdmin(request: NextRequest): Promise<AuthenticatedRequest> {
  const authenticated = await requireUser(request);

  if (authenticated.user.role !== UserRole.ADMIN) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      {},
      "The operation requires the administrator role",
    );
  }

  return authenticated;
}
