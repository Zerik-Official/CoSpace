import type { ReactNode } from "react";
import { LuClock, LuMapPin } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

import { LocalTimeBadge } from "@/components/common/LocalTimeBadge";
import { Wordmark } from "@/components/layout/Wordmark";

/**
 * Renders the footer of the public pages with the venue address, its opening
 * hours and the visitor's local clock.
 *
 * @returns The rendered footer.
 */
export async function SiteFooter(): Promise<ReactNode> {
  const t = await getTranslations("Footer");

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3">
          <Wordmark className="text-ink" />
          <p className="max-w-[22rem] text-[0.88rem] text-ink-soft">{t("tagline")}</p>
        </div>

        <div className="flex flex-col gap-2 text-[0.85rem] text-ink-soft">
          <p className="flex items-center gap-2">
            <LuMapPin className="size-4 text-pine" aria-hidden />
            {t("address")}
          </p>
          <p className="flex items-center gap-2">
            <LuClock className="size-4 text-pine" aria-hidden />
            {t("hours")}
          </p>
          <LocalTimeBadge />
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-4 text-[0.78rem] text-ink-soft sm:px-8">
          {t("rights")}
        </div>
      </div>
    </footer>
  );
}
