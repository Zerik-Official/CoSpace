import { application } from "@/server/container";
import { requireAdmin } from "@/server/http/guards";
import { withApiErrors } from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";

/**
 * Lists the confirmed bookings still ahead of the venue, so an administrator can
 * exercise the cancellation rule on behalf of any user.
 *
 * @param request - Incoming request carrying the administrator session.
 * @returns The upcoming bookings including their owner.
 */
export const GET = withApiErrors("GET /api/admin/reservations", async (request) => {
  const { user } = await requireAdmin(request);
  const reservations = await application().reservations.listUpcomingForAdministration(user);

  return jsonData({ reservations });
});
