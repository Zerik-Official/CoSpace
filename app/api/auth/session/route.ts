import { readSession } from "@/server/http/guards";
import { withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Reports the principal behind the request cookies, renewing the access token
 * when it has expired. Anonymous callers receive a null principal instead of an
 * error, so the interface can render the public state without branching on 401.
 *
 * @param request - Request carrying the authentication cookies.
 * @returns The current principal, or null when there is no valid session.
 */
export const GET = withApiErrors("GET /api/auth/session", async (request) => {
  const session = await readSession(request);

  return jsonData({ user: session.user }, 200, session.renewedCookies);
});
