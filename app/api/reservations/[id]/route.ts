import { application } from "@/server/container";
import { requireUser } from "@/server/http/guards";
import { readResourceId, withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Cancels a booking. Only its owner or an administrator may do it, and the
 * record is kept with a cancelled status.
 *
 * @param request - Request carrying the session.
 * @param context - Route context carrying the booking identifier.
 * @returns The cancelled booking.
 */
export const DELETE = withApiErrors<{ id: string }>(
  "DELETE /api/reservations/[id]",
  async (request, context) => {
    const { user, renewedCookies } = await requireUser(request);
    const reservationId = await readResourceId(context);
    const reservation = await application().reservations.cancel(user, reservationId);

    return jsonData({ reservation }, 200, renewedCookies);
  },
);
