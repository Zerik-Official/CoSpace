import { application } from "@/server/container";
import { requireAdmin } from "@/server/http/guards";
import { readResourceId, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Discards an uploaded image that is not referenced by any space. The form calls
 * it when the upload succeeded but saving the space failed.
 *
 * @param request - Request carrying the administrator session.
 * @param context - Route context carrying the image identifier.
 * @returns A confirmation that the discard request was processed.
 */
export const DELETE = withApiErrors<{ id: string }>(
  "DELETE /api/admin/spaces/images/[id]",
  async (request, context) => {
    await requireAdmin(request);
    const imageId = await readResourceId(context);

    await application().spaceImages.discard(imageId);

    return jsonData({ discarded: true });
  },
);
