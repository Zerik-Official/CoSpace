import { BOOKABLE_START_HOURS } from "@/lib/domain/rules";
import type { AvailabilityInterval } from "@/lib/domain/types";
import type { VenueClock } from "@/lib/domain/venue-clock";

/** State of a single bookable hour of the venue. */
export type HourBlockState = "free" | "busy" | "selected";

/** One bookable hour of a venue day. */
export interface HourBlock {
  hour: number;
  startAt: string;
  endAt: string;
  state: HourBlockState;
}

const STATE_CLASSES: Record<HourBlockState, string> = {
  free: "border-line bg-pine-soft",
  busy: "border-ochre bg-ochre/80 hatch-busy",
  selected: "border-pine bg-pine",
};

/**
 * Reads the class names of an hour block, shared by the read only strip and by
 * the interactive booking grid so both stay visually identical.
 *
 * @param state - State the block is rendered in.
 * @returns Tailwind classes for the block.
 */
export function hourBlockClasses(state: HourBlockState): string {
  return STATE_CLASSES[state];
}

/**
 * Splits a venue day into its bookable hours and marks which of them are taken.
 *
 * @param venueDate - Venue day key in YYYY-MM-DD form.
 * @param busyIntervals - Confirmed reservations overlapping the day.
 * @param clock - Venue clock used to resolve each hour into an instant.
 * @returns One block per bookable hour, in ascending order.
 */
export function buildHourBlocks(
  venueDate: string,
  busyIntervals: AvailabilityInterval[],
  clock: VenueClock,
): HourBlock[] {
  const busy = busyIntervals.map((interval) => ({
    start: Date.parse(interval.startAt),
    end: Date.parse(interval.endAt),
  }));

  return BOOKABLE_START_HOURS.map((hour) => {
    const startAt = clock.fromDayKeyAndHour(venueDate, hour);
    const endAt = clock.fromDayKeyAndHour(venueDate, hour + 1);
    const isBusy = busy.some(
      (interval) => startAt.getTime() < interval.end && interval.start < endAt.getTime(),
    );

    return {
      hour,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      state: isBusy ? "busy" : "free",
    };
  });
}
