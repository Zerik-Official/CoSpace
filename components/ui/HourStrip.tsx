import type { ReactNode } from "react";

import type { AvailabilityInterval } from "@/lib/domain/types";
import { venueClock } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { buildHourBlocks, hourBlockClasses } from "@/components/ui/hour-blocks";

/** Props accepted by the occupancy strip. */
export interface HourStripProps {
  venueDate: string;
  busyIntervals: AvailabilityInterval[];
  ariaLabel: string;
  freeLabel: string;
  busyLabel: string;
  orientation?: "row" | "column";
  className?: string;
}

/**
 * Draws the fourteen bookable hours of a venue day, marking the ones already
 * taken. It is the visual spine of the product: the same strip appears in the
 * catalog, in the space detail and in the booking form.
 *
 * @param props - Venue day, occupancy, accessible labels and layout direction.
 * @returns The rendered occupancy strip.
 */
export function HourStrip({
  venueDate,
  busyIntervals,
  ariaLabel,
  freeLabel,
  busyLabel,
  orientation = "row",
  className,
}: HourStripProps): ReactNode {
  const blocks = buildHourBlocks(venueDate, busyIntervals, venueClock());
  const isColumn = orientation === "column";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        role="img"
        aria-label={ariaLabel}
        className={cn("flex gap-[3px]", isColumn ? "flex-col" : "flex-row")}
      >
        {blocks.map((block, index) => (
          <span
            key={block.hour}
            title={`${String(block.hour).padStart(2, "0")}:00 - ${String(block.hour + 1).padStart(2, "0")}:00`}
            className={cn(
              "hour-block border",
              isColumn ? "h-5 w-full" : "h-6 flex-1 rounded-[2px]",
              hourBlockClasses(block.state),
            )}
            style={{ animationDelay: `${index * 26}ms` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[0.7rem] tabular-nums text-ink-soft">
        <span>07:00</span>
        <span className="sr-only">
          {freeLabel} / {busyLabel}
        </span>
        <span>21:00</span>
      </div>
    </div>
  );
}
