import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Wall clock reading of an instant on the venue calendar. */
export interface VenueDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

/**
 * Translates between absolute instants and the venue wall clock. Every time
 * based rule and every schedule the interface draws goes through this class, so
 * the venue time zone is applied consistently on the server and in the browser.
 */
export class VenueClock {
  /**
   * @param timeZone - IANA name of the time zone the venue operates in.
   */
  constructor(private readonly timeZone: string) {}

  /** IANA name of the configured venue time zone. */
  get zone(): string {
    return this.timeZone;
  }

  /**
   * Reads the venue wall clock for an instant.
   *
   * @param instant - Absolute instant to translate.
   * @returns The date and time components on the venue calendar.
   */
  toParts(instant: Date): VenueDateTimeParts {
    const wallClock = toZonedTime(instant, this.timeZone);

    return {
      year: wallClock.getFullYear(),
      month: wallClock.getMonth() + 1,
      day: wallClock.getDate(),
      hour: wallClock.getHours(),
      minute: wallClock.getMinutes(),
      second: wallClock.getSeconds(),
      millisecond: wallClock.getMilliseconds(),
    };
  }

  /**
   * Reads the venue day an instant belongs to.
   *
   * @param instant - Absolute instant to translate.
   * @returns Day key in YYYY-MM-DD form on the venue calendar.
   */
  toDayKey(instant: Date): string {
    return formatInTimeZone(instant, this.timeZone, "yyyy-MM-dd");
  }

  /**
   * Reads the hour of the venue clock an instant falls on.
   *
   * @param instant - Absolute instant to translate.
   * @returns Hour of the venue clock, 0-23.
   */
  toHour(instant: Date): number {
    return Number(formatInTimeZone(instant, this.timeZone, "H"));
  }

  /**
   * Converts a venue wall clock reading into an absolute instant.
   *
   * @param dayKey - Day key in YYYY-MM-DD form.
   * @param hour - Hour of the venue clock, 0-23.
   * @returns The instant that reads as the requested hour at the venue.
   */
  fromDayKeyAndHour(dayKey: string, hour: number): Date {
    const paddedHour = String(hour).padStart(2, "0");

    return fromZonedTime(`${dayKey}T${paddedHour}:00:00`, this.timeZone);
  }

  /**
   * Shifts a venue day key by a number of days.
   *
   * @param dayKey - Day key in YYYY-MM-DD form.
   * @param amount - Days to add, negative values move backwards.
   * @returns The shifted day key.
   */
  shiftDayKey(dayKey: string, amount: number): string {
    const reference = new Date(`${dayKey}T12:00:00.000Z`);
    reference.setUTCDate(reference.getUTCDate() + amount);

    return reference.toISOString().slice(0, 10);
  }

  /**
   * Lists consecutive venue days starting from a reference instant.
   *
   * @param from - Instant the window starts at.
   * @param days - Number of days to list, the day of `from` included.
   * @returns Day keys in ascending order.
   */
  upcomingDayKeys(from: Date, days: number): string[] {
    const firstDayKey = this.toDayKey(from);

    return Array.from({ length: days }, (_value, index) =>
      this.shiftDayKey(firstDayKey, index),
    );
  }

  /**
   * Checks whether an instant sits exactly on an hour of the venue clock.
   *
   * @param instant - Absolute instant to inspect.
   * @returns True when the venue clock reads a whole hour.
   */
  isWholeHour(instant: Date): boolean {
    const parts = this.toParts(instant);

    return parts.minute === 0 && parts.second === 0 && parts.millisecond === 0;
  }

  /**
   * Counts whole hours between two instants.
   *
   * @param startAt - Absolute instant the interval starts at.
   * @param endAt - Absolute instant the interval ends at.
   * @returns Whole hours the interval spans, rounded down.
   */
  hoursBetween(startAt: Date, endAt: Date): number {
    return Math.floor((endAt.getTime() - startAt.getTime()) / 3_600_000);
  }

  /**
   * Counts whole venue days between two instants.
   *
   * @param from - Absolute instant used as origin.
   * @param to - Absolute instant compared against the origin.
   * @returns Days separating both instants on the venue calendar.
   */
  daysBetween(from: Date, to: Date): number {
    const fromDayKey = this.toDayKey(from);
    const toDayKey = this.toDayKey(to);

    return Math.round(
      (Date.parse(`${toDayKey}T00:00:00.000Z`) - Date.parse(`${fromDayKey}T00:00:00.000Z`)) /
        86_400_000,
    );
  }
}
