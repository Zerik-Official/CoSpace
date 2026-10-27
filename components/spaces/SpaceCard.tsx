"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

import { HourStrip } from "@/components/ui/HourStrip";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { spaceTypeIcon, SPACE_TYPE_MESSAGE_KEYS } from "@/components/spaces/SpaceTypeMeta";
import type { SpaceCatalogEntry } from "@/lib/domain/types";
import { formatCurrency, formatVenueDate } from "@/lib/utils/format";

/** Props accepted by a catalog row. */
export interface SpaceCardProps {
  entry: SpaceCatalogEntry;
}

/**
 * Renders one catalog row: the space identity, its hourly rate and the occupancy
 * of the selected venue day.
 *
 * @param props - Catalog entry to render.
 * @returns The rendered catalog row.
 */
export function SpaceCard({ entry }: SpaceCardProps): ReactNode {
  const t = useTranslations("Catalog");
  const tTypes = useTranslations("SpaceTypes");
  const locale = useLocale();

  return (
    <article className="reveal grid gap-5 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:p-5 md:grid-cols-[8.5rem_minmax(0,1fr)_17rem]">
      <div className="relative h-32 w-full overflow-hidden rounded-[4px] border border-line md:h-full md:min-h-[7.5rem]">
        <Image
          src={entry.imageUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 136px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.8rem] font-semibold tabular-nums text-pine">{entry.code}</span>
          <Badge tone="neutral">
            {spaceTypeIcon(entry.type, "size-3.5")}
            {tTypes(SPACE_TYPE_MESSAGE_KEYS[entry.type])}
          </Badge>
          <Badge tone="neutral">{t("capacityFor", { count: entry.capacity })}</Badge>
        </div>

        <h3 className="font-display text-[1.3rem] leading-tight text-ink">{entry.name}</h3>
        <p className="line-clamp-2 text-[0.88rem] leading-relaxed text-ink-soft">
          {entry.description}
        </p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-1">
          <p className="text-[1.05rem] font-semibold text-ink">
            {formatCurrency(entry.pricePerHour, locale)}
            <span className="text-[0.8rem] font-normal text-ink-soft">
              {" "}
              {t("pricePerHourSuffix")}
            </span>
          </p>
          <ActionLink href={`/spaces/${entry.id}`} size="sm" variant="secondary">
            {t("viewSpace")}
          </ActionLink>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[0.78rem] font-medium text-ink-soft">
          {t("hourStripLabel", { date: formatVenueDate(`${entry.venueDate}T12:00:00.000Z`, locale) })}
        </p>
        <HourStrip
          venueDate={entry.venueDate}
          busyIntervals={entry.busyIntervals}
          ariaLabel={`${entry.name}: ${t("hourStripLabel", { date: formatVenueDate(`${entry.venueDate}T12:00:00.000Z`, locale) })}`}
          freeLabel={t("hourFree")}
          busyLabel={t("hourBusy")}
        />
      </div>
    </article>
  );
}
