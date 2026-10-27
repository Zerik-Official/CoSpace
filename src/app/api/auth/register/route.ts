import { application } from "@/server/container";
import { clientAddress, validateJsonBody, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";
import { registerPayloadSchema } from "@/server/validation/schemas";

/**
 * Registers a new user with the default role and opens an authenticated session.
 *
 * @param request - Request carrying the registration payload.
 * @returns The created principal, with the session cookies already set.
 */
export const POST = withApiErrors("POST /api/auth/register", async (request) => {
  const payload = await validateJsonBody(request, registerPayloadSchema);
  const session = await application().auth.register(payload, clientAddress(request));

  return jsonData({ user: session.user }, 201, session.cookies);
});
