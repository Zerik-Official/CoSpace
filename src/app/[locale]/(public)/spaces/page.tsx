import type { ReactNode } from "react";
import { connection } from "next/server";
import { LuSearch } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

import { SpaceCard } from "@/components/spaces/SpaceCard";
import { Button } from "@/components/ui/Button";
import { SelectField } from "@/components/ui/Field";
import { application } from "@/server/container";
import { SpaceType } from "@/lib/domain/enums";
import { RESERVATION_RULES } from "@/lib/domain/rules";
import { catalogQuerySchema, type CatalogQuery } from "@/server/validation/schemas";
import { formatVenueDate } from "@/lib/utils/format";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";

export const instant = false;

/** Props accepted by the catalog page. */
interface CatalogPageProps {
  params: Promise<{ locale: string }>;
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
 * Renders the public catalog. The page reads the catalog through the services on
 * every request, which is what makes this route server side rendered.
 *
 * @param props - Route props carrying the locale and the active filters.
 * @returns The rendered catalog page.
 */
export default async function CatalogPage({
  params,
  searchParams,
}: CatalogPageProps): Promise<ReactNode> {
  const { locale } = await params;
  await connection();

  const t = await getTranslations({ locale, namespace: "Catalog" });
  const tTypes = await getTranslations({ locale, namespace: "SpaceTypes" });
  const rawQuery = await searchParams;

  const parsedQuery = catalogQuerySchema.safeParse({
    type: singleValue(rawQuery.type),
    date: singleValue(rawQuery.date),
    minCapacity: singleValue(rawQuery.minCapacity),
  });
  const query: CatalogQuery = parsedQuery.success ? parsedQuery.data : {};

  const container = application();
  const catalog = await container.spaces.listCatalog(query);
  const venueDays = container.clock.upcomingDayKeys(new Date(), RESERVATION_RULES.catalogPreviewDays);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-10 sm:px-8 md:py-14">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[2.1rem] leading-tight text-ink">{t("title")}</h1>
        <p className="max-w-[62ch] text-[0.95rem] text-ink-soft">{t("description")}</p>
      </header>

      <form
        method="get"
        className="grid items-end gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"
      >
        <SelectField
          name="type"
          label={t("filterType")}
          defaultValue={query.type ?? ""}
          options={[
            { value: "", label: t("filterAnyType") },
            ...Object.values(SpaceType).map((type) => ({ value: type, label: tTypes(type) })),
          ]}
        />
        <SelectField
          name="minCapacity"
          label={t("filterCapacity")}
          defaultValue={query.minCapacity ? String(query.minCapacity) : ""}
          options={[
            { value: "", label: t("filterAnyCapacity") },
            ...[1, 2, 4, 6, 8].map((capacity) => ({
              value: String(capacity),
              label: t("capacityFor", { count: capacity }),
            })),
          ]}
        />
        <input type="hidden" name="date" value={catalog.venueDate} />
        <Button type="submit" variant="secondary">
          <LuSearch className="size-4" aria-hidden />
          {t("applyFilters")}
        </Button>
        <Link
          href="/spaces"
          className="flex h-11 items-center justify-center rounded-[var(--radius-card)] border border-transparent px-4 text-[0.9rem] font-medium text-pine hover:bg-pine-soft"
        >
          {t("clearFilters")}
        </Link>
      </form>

      <div className="flex flex-col gap-3">
        <p className="text-[0.8rem] font-medium text-ink-soft">{t("dayLabel")}</p>
        <div className="flex flex-wrap gap-2">
          {venueDays.map((day) => {
            const isActive = day === catalog.venueDate;
            const dayQuery = new URLSearchParams();
            if (query.type) {
              dayQuery.set("type", query.type);
            }
            if (query.minCapacity) {
              dayQuery.set("minCapacity", String(query.minCapacity));
            }
            dayQuery.set("date", day);

            return (
              <Link
                key={day}
                href={`/spaces?${dayQuery.toString()}`}
                className={cn(
                  "rounded-[var(--radius-card)] border px-3 py-1.5 text-[0.82rem] font-medium",
                  isActive
                    ? "border-pine bg-pine text-white"
                    : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
                )}
              >
                {formatVenueDate(`${day}T12:00:00.000Z`, locale)}
              </Link>
            );
          })}
        </div>
      </div>

      <p className="text-[0.88rem] font-medium text-ink">
        {t("resultsCount", { count: catalog.spaces.length })}
      </p>

      {catalog.spaces.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface p-8 text-[0.9rem] text-ink-soft">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {catalog.spaces.map((entry) => (
            <li key={entry.id}>
              <SpaceCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
