import { application } from "@/server/container";
import { readResourceId, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Returns the public detail of a published space.
 *
 * @param request - Incoming request.
 * @param context - Route context carrying the space identifier.
 * @returns The space detail.
 * @throws AppError with code NOT_FOUND when the space is missing or deactivated.
 */
export const GET = withApiErrors<{ id: string }>(
  "GET /api/spaces/[id]",
  async (_request, context) => {
    const spaceId = await readResourceId(context);
    const space = await application().spaces.findPublicDetail(spaceId);

    return jsonData({ space });
  },
);
