import type { ReactNode } from "react";
import { LuArrowRight, LuBuilding2, LuClock, LuLayoutGrid, LuMapPin } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

import { ActionLink } from "@/components/ui/ActionLink";
import { VenueRhythm } from "@/components/home/VenueRhythm";
import { LocalTimeBadge } from "@/components/common/LocalTimeBadge";
import { SpaceType } from "@/lib/domain/enums";
import { RESERVATION_RULES } from "@/lib/domain/rules";
import { spaceTypeIcon } from "@/components/spaces/SpaceTypeMeta";

const SPACE_TYPE_MESSAGE_KEYS: Record<SpaceType, string> = {
  [SpaceType.DESK]: "desk",
  [SpaceType.MEETING_ROOM]: "meetingRoom",
  [SpaceType.CABIN]: "cabin",
};

const PROCESS_STEPS = ["howStepOne", "howStepTwo", "howStepThree"] as const;

/** Props accepted by the home page. */
interface HomePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Renders the home page. It only publishes static content, which is what makes
 * this route statically generated at build time.
 *
 * @param props - Route props carrying the locale segment.
 * @returns The rendered home page.
 */
export default async function HomePage({ params }: HomePageProps): Promise<ReactNode> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "Home" });
  const tTypes = await getTranslations({ locale, namespace: "SpaceTypes" });

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid w-full max-w-[1180px] gap-12 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-center">
          <div className="flex flex-col gap-6">
            <p className="flex items-center gap-2 text-[0.82rem] font-medium text-pine">
              <LuMapPin className="size-4 text-pine" aria-hidden />
              {t("statsHoursLabel")}
            </p>
            <h1 className="max-w-[22ch] font-display text-[2.35rem] leading-[1.08] tracking-[-0.03em] text-ink md:text-[3.1rem]">
              {t("heroTitle")}
            </h1>
            <p className="max-w-[58ch] text-[1.02rem] leading-relaxed text-ink-soft">
              {t("heroBody")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <ActionLink href="/spaces">
                {t("heroPrimary")}
                <LuArrowRight className="size-4" aria-hidden />
              </ActionLink>
              <ActionLink href="/register" variant="secondary">
                {t("heroSecondary")}
              </ActionLink>
            </div>
            <LocalTimeBadge />
          </div>

          <VenueRhythm />
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-5 py-12 sm:px-8">
        <dl className="grid gap-8 border-t border-line pt-8 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-2 text-[0.8rem] font-medium text-ink-soft">
              <LuLayoutGrid className="size-4 text-pine" aria-hidden />
              {t("statsTypesLabel")}
            </dt>
            <dd className="font-display text-[2.1rem] font-semibold tabular-nums text-ink">
              {t("statsTypesValue")}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-2 text-[0.8rem] font-medium text-ink-soft">
              <LuClock className="size-4 text-pine" aria-hidden />
              {t("statsHoursLabel")}
            </dt>
            <dd className="font-display text-[2.1rem] font-semibold tabular-nums text-ink">
              {t("statsHoursValue")}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="flex items-center gap-2 text-[0.8rem] font-medium text-ink-soft">
              <LuBuilding2 className="size-4 text-pine" aria-hidden />
              {t("scheduleOpen")} - {t("scheduleClose")}
            </dt>
            <dd className="font-display text-[2.1rem] font-semibold tabular-nums text-ink">
              {RESERVATION_RULES.openingHour}:00
            </dd>
          </div>
        </dl>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 px-5 py-14 sm:px-8">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[1.85rem] leading-tight text-ink">{t("typesTitle")}</h2>
            <p className="max-w-[62ch] text-[0.95rem] text-ink-soft">{t("typesBody")}</p>
          </div>

          <ul className="grid gap-6 md:grid-cols-3">
            {Object.values(SpaceType).map((type) => (
              <li key={type} className="flex flex-col gap-3 border-t-2 border-pine pt-4">
                <span className="text-pine">{spaceTypeIcon(type, "size-5")}</span>
                <h3 className="font-display text-[1.2rem] text-ink">
                  {t(`${SPACE_TYPE_MESSAGE_KEYS[type]}Title`)}
                </h3>
                <p className="text-[0.88rem] text-ink-soft">{t(`${SPACE_TYPE_MESSAGE_KEYS[type]}Body`)}</p>
                <span className="mt-auto text-[0.78rem] text-ink-soft">{tTypes(type)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1180px] px-5 py-14 sm:px-8">
        <h2 className="font-display text-[1.85rem] leading-tight text-ink">{t("howTitle")}</h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {PROCESS_STEPS.map((step, index) => (
            <li key={step} className="flex flex-col gap-2.5">
              <span className="font-display text-[1.6rem] font-semibold tabular-nums text-pine">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-[1.1rem] text-ink">{t(`${step}Title`)}</h3>
              <p className="max-w-[40ch] text-[0.88rem] text-ink-soft">{t(`${step}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line bg-pine text-white">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-5 py-14 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-[1.75rem] leading-tight">{t("ctaTitle")}</h2>
            <p className="max-w-[52ch] text-[0.92rem] text-white/80">{t("ctaBody")}</p>
          </div>
          <ActionLink href="/spaces" variant="secondary" className="self-start md:self-auto">
            {t("heroPrimary")}
          </ActionLink>
        </div>
      </section>
    </>
  );
}
