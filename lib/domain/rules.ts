/**
 * Business rules of the CoSpace booking engine. They are intentionally constants
 * instead of environment variables: the rules are part of the product contract
 * and must behave identically in every environment.
 */
export const RESERVATION_RULES = {
  minHours: 1,
  maxHours: 4,
  openingHour: 7,
  closingHour: 21,
  maxAdvanceDays: 30,
  maxFutureReservations: 3,
  cancellationNoticeHours: 2,
  catalogPreviewDays: 7,
} as const;

/** Start hours, in venue local time, that a reservation may begin at. */
export const BOOKABLE_START_HOURS: readonly number[] = Array.from(
  { length: RESERVATION_RULES.closingHour - RESERVATION_RULES.openingHour },
  (_value, index) => RESERVATION_RULES.openingHour + index,
);

/** Stable cookie names shared by the route handlers, proxy and server services. */
export const AUTH_COOKIES = {
  accessToken: "cospace_access_token",
  refreshToken: "cospace_refresh_token",
} as const;

/** Header a client may send to make reservation creation idempotent. */
export const IDEMPOTENCY_HEADER = "idempotency-key";
