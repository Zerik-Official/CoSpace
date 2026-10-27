"use client";

import type { ReactNode } from "react";
import {
  LuBatteryCharging,
  LuCoffee,
  LuLock,
  LuMonitor,
  LuPrinter,
  LuPresentation,
  LuSnowflake,
  LuSun,
  LuVideo,
  LuWifi,
  LuRuler,
  LuCctv,
} from "react-icons/lu";
import { useTranslations } from "next-intl";

import { isAmenityKey } from "@/lib/domain/amenities";

const AMENITY_ICONS: Record<string, ReactNode> = {
  wifi: <LuWifi className="size-4" aria-hidden />,
  powerOutlets: <LuBatteryCharging className="size-4" aria-hidden />,
  standingDesk: <LuRuler className="size-4" aria-hidden />,
  monitor: <LuMonitor className="size-4" aria-hidden />,
  whiteboard: <LuPresentation className="size-4" aria-hidden />,
  videoConference: <LuVideo className="size-4" aria-hidden />,
  naturalLight: <LuSun className="size-4" aria-hidden />,
  airConditioning: <LuSnowflake className="size-4" aria-hidden />,
  soundproofBooth: <LuCctv className="size-4" aria-hidden />,
  lockers: <LuLock className="size-4" aria-hidden />,
  coffee: <LuCoffee className="size-4" aria-hidden />,
  printer: <LuPrinter className="size-4" aria-hidden />,
};

/** Props accepted by the amenity list. */
export interface AmenityListProps {
  amenities: string[];
  className?: string;
}

/**
 * Lists the amenities of a space with an icon and a translated label. Unknown
 * values coming from the database are skipped instead of crashing the view.
 *
 * @param props - Stored amenity keys and layout classes.
 * @returns The rendered amenity list.
 */
export function AmenityList({ amenities, className }: AmenityListProps): ReactNode {
  const t = useTranslations("Amenities");
  const known = amenities.filter(isAmenityKey);

  if (known.length === 0) {
    return null;
  }

  return (
    <ul className={className}>
      {known.map((amenity) => (
        <li key={amenity} className="flex items-center gap-2 text-[0.85rem] text-ink-soft">
          <span className="text-pine">{AMENITY_ICONS[amenity]}</span>
          {t(amenity)}
        </li>
      ))}
    </ul>
  );
}
