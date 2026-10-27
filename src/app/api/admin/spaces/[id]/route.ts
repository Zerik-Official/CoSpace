import { application } from "@/server/container";
import { requireAdmin } from "@/server/http/guards";
import { readResourceId, validateJsonBody, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";
import { updateSpacePayloadSchema } from "@/server/validation/schemas";

/**
 * Updates the editable fields of a space.
 *
 * @param request - Request carrying the administrator session and the payload.
 * @param context - Route context carrying the space identifier.
 * @returns The updated space.
 */
export const PATCH = withApiErrors<{ id: string }>(
  "PATCH /api/admin/spaces/[id]",
  async (request, context) => {
    await requireAdmin(request);
    const spaceId = await readResourceId(context);
    const payload = await validateJsonBody(request, updateSpacePayloadSchema);
    const space = await application().spaces.update(spaceId, payload);

    return jsonData({ space });
  },
);

/**
 * Deactivates a space. The record is preserved; a space with confirmed bookings
 * ahead cannot be deactivated.
 *
 * @param request - Request carrying the administrator session.
 * @param context - Route context carrying the space identifier.
 * @returns The deactivated space.
 */
export const DELETE = withApiErrors<{ id: string }>(
  "DELETE /api/admin/spaces/[id]",
  async (request, context) => {
    await requireAdmin(request);
    const spaceId = await readResourceId(context);
    const space = await application().spaces.deactivate(spaceId);

    return jsonData({ space });
  },
);
