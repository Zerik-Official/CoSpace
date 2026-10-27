import { application } from "@/server/container";
import { clientAddress, validateJsonBody, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";
import { loginPayloadSchema } from "@/server/validation/schemas";

/**
 * Verifies credentials and opens an authenticated session. Attempts are
 * throttled per client address and email to slow down credential stuffing.
 *
 * @param request - Request carrying the login payload.
 * @returns The authenticated principal, with the session cookies already set.
 */
export const POST = withApiErrors("POST /api/auth/login", async (request) => {
  const payload = await validateJsonBody(request, loginPayloadSchema);
  const session = await application().auth.login(payload, clientAddress(request));

  return jsonData({ user: session.user }, 200, session.cookies);
});
