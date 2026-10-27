import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { BOOKABLE_START_HOURS, RESERVATION_RULES } from "@/lib/domain/rules";
import { formatClockHour } from "@/lib/utils/format";

const OCCUPANCY_BY_HOUR: readonly number[] = [
  18, 42, 68, 86, 92, 61, 47, 74, 88, 81, 63, 39, 24, 12,
];

const PEAK_OCCUPANCY = Math.max(...OCCUPANCY_BY_HOUR);

/**
 * Draws the hourly rhythm of the venue: fourteen bars, one per bookable hour,
 * with the busiest hour picked out. It is the most characteristic artefact of a
 * coworking venue, so it opens the home page instead of a generic headline block.
 *
 * @returns The rendered rhythm chart.
 */
export async function VenueRhythm(): Promise<ReactNode> {
  const t = await getTranslations("Home");

  return (
    <figure className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-display text-[1.02rem] font-semibold text-ink">
          {t("scheduleLabel")}
        </span>
        <span className="text-[0.72rem] text-ink-soft">07:00 - 21:00</span>
      </figcaption>

      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label={t("scheduleCaption")}>
        {BOOKABLE_START_HOURS.map((hour, index) => {
          const occupancy = OCCUPANCY_BY_HOUR[index];
          const isPeak = occupancy === PEAK_OCCUPANCY;

          return (
            <span
              key={hour}
              title={`${formatClockHour(hour)} - ${occupancy}%`}
              className="hour-block flex-1 rounded-t-[2px] border border-b-0 border-line"
              style={{
                height: `${occupancy}%`,
                backgroundColor: isPeak ? "var(--color-ochre)" : "var(--color-pine)",
                opacity: isPeak ? 1 : 0.55 + occupancy / 260,
                animationDelay: `${index * 30}ms`,
              }}
            />
          );
        })}
      </div>

      <div className="flex justify-between border-t border-line pt-2 text-[0.7rem] tabular-nums text-ink-soft">
        <span>
          {t("scheduleOpen")} {formatClockHour(RESERVATION_RULES.openingHour)}
        </span>
        <span>
          {t("scheduleClose")} {formatClockHour(RESERVATION_RULES.closingHour)}
        </span>
      </div>

      <figcaption className="text-[0.8rem] leading-relaxed text-ink-soft">
        {t("scheduleCaption")}
      </figcaption>
    </figure>
  );
}
