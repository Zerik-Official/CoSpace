import { AUTH_COOKIES } from "@/lib/domain/rules";
import { application } from "@/server/container";
import { withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Revokes the refresh token of the caller and expires the session cookies.
 *
 * @param request - Request carrying the authentication cookies.
 * @returns A confirmation payload with the cleared cookies.
 */
export const POST = withApiErrors("POST /api/auth/logout", async (request) => {
  const cookies = await application().sessions.end(
    request.cookies.get(AUTH_COOKIES.refreshToken)?.value,
  );

  return jsonData({ loggedOut: true }, 200, cookies);
});
