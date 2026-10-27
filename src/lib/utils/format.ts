import { VenueClock } from "@/lib/domain/venue-clock";

const VENUE_TIME_ZONE: string = process.env.NEXT_PUBLIC_VENUE_TIMEZONE ?? "America/Bogota";
const VENUE_CURRENCY: string = process.env.NEXT_PUBLIC_VENUE_CURRENCY ?? "COP";

/**
 * Reads the venue time zone shared by server and client formatting.
 *
 * @returns IANA time zone name of the venue.
 */
export function venueTimeZone(): string {
  return VENUE_TIME_ZONE;
}

/**
 * Builds a venue clock bound to the configured time zone. The same helper is
 * used by the services and by the browser, so a schedule never drifts between
 * the two render environments.
 *
 * @returns A venue clock for the configured time zone.
 */
export function venueClock(): VenueClock {
  return new VenueClock(VENUE_TIME_ZONE);
}

/**
 * Reads the currency the venue publishes its prices in.
 *
 * @returns ISO-4217 currency code.
 */
export function venueCurrency(): string {
  return VENUE_CURRENCY;
}

/**
 * Formats an instant as the hour of the venue clock.
 *
 * @param instant - ISO-8601 instant.
 * @param locale - Locale used for the output.
 * @returns Time of day such as "10:00".
 */
export function formatVenueTime(instant: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: venueTimeZone(),
  }).format(new Date(instant));
}

/**
 * Formats an instant as a short date of the venue calendar.
 *
 * @param instant - ISO-8601 instant or venue day key.
 * @param locale - Locale used for the output.
 * @returns Short date such as "mié, 28 oct".
 */
export function formatVenueDate(instant: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: venueTimeZone(),
  }).format(new Date(instant));
}

/**
 * Formats a venue day key as a long date.
 *
 * @param venueDate - Venue day key in YYYY-MM-DD form.
 * @param locale - Locale used for the output.
 * @returns Long date such as "miércoles, 28 de octubre de 2026".
 */
export function formatVenueDateLong(venueDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${venueDate}T12:00:00.000Z`));
}

/**
 * Formats an interval as a time range on the venue clock.
 *
 * @param startAt - ISO-8601 instant the interval starts at.
 * @param endAt - ISO-8601 instant the interval ends at.
 * @param locale - Locale used for the output.
 * @returns Range such as "10:00 - 12:00".
 */
export function formatVenueRange(startAt: string, endAt: string, locale: string): string {
  return `${formatVenueTime(startAt, locale)} - ${formatVenueTime(endAt, locale)}`;
}

/**
 * Formats an amount in the venue currency.
 *
 * @param amount - Amount in major currency units.
 * @param locale - Locale used for the output.
 * @returns Formatted amount such as "$ 25.000".
 */
export function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: venueCurrency(),
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a whole hour count for display.
 *
 * @param hours - Number of whole hours.
 * @param locale - Locale used for the output.
 * @returns Formatted duration such as "2 h".
 */
export function formatHours(hours: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "hour",
    unitDisplay: "short",
  }).format(hours);
}

/**
 * Formats the hour a venue day opens or closes at.
 *
 * @param hour - Hour of the venue clock, 0-23.
 * @returns Zero padded hour such as "07:00".
 */
export function formatClockHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
