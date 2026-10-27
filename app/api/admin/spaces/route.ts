import { application } from "@/server/container";
import { requireAdmin } from "@/server/http/guards";
import { validateJsonBody, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";
import { createSpacePayloadSchema } from "@/server/validation/schemas";

/**
 * Lists every space of the catalog, including the deactivated ones.
 *
 * @param request - Incoming request carrying the administrator session.
 * @returns The spaces with the count of bookings blocking deactivation.
 */
export const GET = withApiErrors("GET /api/admin/spaces", async (request) => {
  await requireAdmin(request);
  const spaces = await application().spaces.listForAdministration();

  return jsonData({ spaces });
});

/**
 * Creates a new space in the catalog.
 *
 * @param request - Request carrying the administrator session and the payload.
 * @returns The created space.
 */
export const POST = withApiErrors("POST /api/admin/spaces", async (request) => {
  await requireAdmin(request);
  const payload = await validateJsonBody(request, createSpacePayloadSchema);
  const space = await application().spaces.create(payload);

  return jsonData({ space }, 201);
});
