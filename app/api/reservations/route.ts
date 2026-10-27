import { IDEMPOTENCY_HEADER } from "@/lib/domain/rules";
import { application } from "@/server/container";
import { requireUser } from "@/server/http/guards";
import {
  validateJsonBody,
  validateSearchParams,
  withApiErrors,
} from "@/server/http/handler";
import { jsonData } from "@/server/http/responses";
import {
  createReservationPayloadSchema,
  reservationQuerySchema,
} from "@/server/validation/schemas";

/**
 * Lists the bookings owned by the caller. Bookings of other users are never
 * reachable through this endpoint.
 *
 * @param request - Request carrying the session and the listing scope.
 * @returns The bookings of the caller.
 */
export const GET = withApiErrors("GET /api/reservations", async (request) => {
  const { user, renewedCookies } = await requireUser(request);
  const query = validateSearchParams(request, reservationQuerySchema);
  const reservations = await application().reservations.listOwn(user, query);

  return jsonData({ reservations }, 200, renewedCookies);
});

/**
 * Books a space for the caller. The server computes the price, and an
 * `Idempotency-Key` header makes a retried creation return the same booking.
 *
 * @param request - Request carrying the session, the payload and the optional key.
 * @returns The created booking.
 */
export const POST = withApiErrors("POST /api/reservations", async (request) => {
  const { user, renewedCookies } = await requireUser(request);
  const payload = await validateJsonBody(request, createReservationPayloadSchema);
  const idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER) ?? undefined;
  const reservation = await application().reservations.create(user, payload, idempotencyKey);

  return jsonData({ reservation }, 201, renewedCookies);
});
