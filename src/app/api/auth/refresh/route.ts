import { AppError, ErrorCode } from "@/server/errors";
import { readSession } from "@/server/http/guards";
import { withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Renews an expired access token from a valid refresh token, rotating both. The
 * client never needs to sign in again while the refresh token stays alive.
 *
 * @param request - Request carrying the authentication cookies.
 * @returns The authenticated principal, with the rotated cookies already set.
 * @throws AppError with code INVALID_REFRESH_TOKEN when the session cannot be renewed.
 */
export const POST = withApiErrors("POST /api/auth/refresh", async (request) => {
  const session = await readSession(request);

  if (!session.user) {
    throw new AppError(
      ErrorCode.INVALID_REFRESH_TOKEN,
      {},
      "The refresh token is missing, revoked or expired",
    );
  }

  return jsonData({ user: session.user }, 200, session.renewedCookies);
});
