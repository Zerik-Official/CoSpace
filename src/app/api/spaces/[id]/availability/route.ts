import { application } from "@/server/container";
import { readResourceId, validateSearchParams, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";
import { availabilityQuerySchema } from "@/server/validation/schemas";

/**
 * Returns the occupancy of one space for one venue day.
 *
 * @param request - Request carrying the optional venue day.
 * @param context - Route context carrying the space identifier.
 * @returns The busy intervals of the space on that day.
 * @throws AppError with code NOT_FOUND when the space is missing or deactivated.
 */
export const GET = withApiErrors<{ id: string }>(
  "GET /api/spaces/[id]/availability",
  async (request, context) => {
    const spaceId = await readResourceId(context);
    const { date } = validateSearchParams(request, availabilityQuerySchema);
    const container = application();
    const venueDate = date ?? container.clock.toDayKey(new Date());
    const availability = await container.spaces.findAvailability(spaceId, venueDate);

    return jsonData(availability);
  },
);
