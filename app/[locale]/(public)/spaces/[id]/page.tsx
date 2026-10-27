import type { ReactNode } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LuArrowLeft, LuClock, LuUsersRound } from "react-icons/lu";
import { z } from "zod";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { AmenityList } from "@/components/common/AmenityList";
import { BookingPanel } from "@/components/booking/BookingPanel";
import { HourStrip } from "@/components/ui/HourStrip";
import { Badge } from "@/components/ui/Badge";
import { spaceTypeIcon, SPACE_TYPE_MESSAGE_KEYS } from "@/components/spaces/SpaceTypeMeta";
import { application } from "@/server/container";
import { RESERVATION_RULES } from "@/lib/domain/rules";
import { formatCurrency, formatVenueDate } from "@/lib/utils/format";

export const instant = false;

/** Props accepted by the space detail page. */
interface SpaceDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Reads a search parameter that may be repeated.
 *
 * @param value - Raw value read from the query string.
 * @returns The first value, or undefined when the parameter is absent.
 */
function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Renders one space with its availability and its booking panel. Availability is
 * read from the services on every request, which is what makes this route server
 * side rendered.
 *
 * @param props - Route props carrying the locale, the space id and the day.
 * @returns The rendered detail page.
 */
export default async function SpaceDetailPage({
  params,
  searchParams,
}: SpaceDetailPageProps): Promise<ReactNode> {
  const { locale, id } = await params;
  await connection();

  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "SpaceDetail" });
  const tCatalog = await getTranslations({ locale, namespace: "Catalog" });
  const tTypes = await getTranslations({ locale, namespace: "SpaceTypes" });

  const container = application();
  const venueDays = container.clock.upcomingDayKeys(new Date(), RESERVATION_RULES.maxAdvanceDays);
  const requestedDay = singleValue((await searchParams).date);
  const venueDate = requestedDay && venueDays.includes(requestedDay) ? requestedDay : venueDays[0];

  const space = await container.spaces.findPublicDetail(id);
  const availability = await container.spaces.findAvailability(id, venueDate);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-10 sm:px-8 md:py-14">
      <Link
        href="/spaces"
        className="flex items-center gap-2 text-[0.85rem] font-medium text-pine hover:underline"
      >
        <LuArrowLeft className="size-4" aria-hidden />
        {t("backToCatalog")}
      </Link>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="flex flex-col gap-8">
          <div className="relative h-64 w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface sm:h-80">
            <Image
              src={space.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 760px"
              priority
              className="object-cover"
            />
          </div>

          <header className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.85rem] font-semibold tabular-nums text-pine">
                {space.code}
              </span>
              <Badge tone="neutral">
                {spaceTypeIcon(space.type, "size-3.5")}
                {tTypes(SPACE_TYPE_MESSAGE_KEYS[space.type])}
              </Badge>
            </div>
            <h1 className="font-display text-[2.1rem] leading-tight text-ink">{space.name}</h1>
            <p className="max-w-[68ch] text-[0.98rem] leading-relaxed text-ink-soft">
              {space.description}
            </p>
          </header>

          <dl className="grid gap-6 border-y border-line py-6 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 text-[0.78rem] font-medium text-ink-soft">
                <LuUsersRound className="size-4 text-pine" aria-hidden />
                {t("capacity")}
              </dt>
              <dd className="text-[1rem] text-ink">
                {t("capacityValue", { count: space.capacity })}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 text-[0.78rem] font-medium text-ink-soft">
                <LuClock className="size-4 text-pine" aria-hidden />
                {t("pricePerHour")}
              </dt>
              <dd className="text-[1rem] tabular-nums text-ink">
                {formatCurrency(space.pricePerHour, locale)}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[0.78rem] font-medium text-ink-soft">{t("spaceType")}</dt>
              <dd className="text-[1rem] text-ink">{tTypes(SPACE_TYPE_MESSAGE_KEYS[space.type])}</dd>
            </div>
          </dl>

          <section className="flex flex-col gap-3">
            <h2 className="font-display text-[1.25rem] text-ink">{t("amenitiesTitle")}</h2>
            <AmenityList amenities={space.amenities} className="grid gap-2.5 sm:grid-cols-2" />
          </section>

          <section className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-[1.25rem] text-ink">{t("availabilityTitle")}</h2>
              <p className="text-[0.82rem] text-ink-soft">
                {formatVenueDate(`${venueDate}T12:00:00.000Z`, locale)}
              </p>
            </div>
            <p className="text-[0.85rem] text-ink-soft">{t("availabilityHint")}</p>
            <HourStrip
              venueDate={venueDate}
              busyIntervals={availability.busyIntervals}
              ariaLabel={`${space.name}: ${t("availabilityTitle")} ${venueDate}`}
              freeLabel={tCatalog("hourFree")}
              busyLabel={tCatalog("hourBusy")}
            />
          </section>
        </div>

        <div className="lg:sticky lg:top-6">
          <BookingPanel
            space={space}
            venueDate={venueDate}
            busyIntervals={availability.busyIntervals}
            venueDays={venueDays}
          />
        </div>
      </div>
    </div>
  );
}
