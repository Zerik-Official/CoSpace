"use client";

import type { ChangeEvent, ReactNode } from "react";
import { LuGlobe } from "react-icons/lu";
import { useLocale, useTranslations } from "next-intl";

import { LOCALE_LABELS, routing, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Renders the language selector. Switching keeps the current page and its query
 * string, so filters survive a language change.
 *
 * @returns The rendered selector.
 */
export function LocaleSwitcher(): ReactNode {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LocaleSwitcher");

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextLocale = event.target.value as AppLocale;
    const query = typeof window === "undefined" ? "" : window.location.search;

    router.replace(`${pathname}${query}`, { locale: nextLocale });
  };

  return (
    <label className="flex items-center gap-2 text-[0.82rem]">
      <LuGlobe className="size-4 text-current opacity-70" aria-hidden />
      <span className="sr-only">{t("label")}</span>
      <select
        value={activeLocale}
        onChange={handleChange}
        aria-label={t("label")}
        className="cursor-pointer appearance-none rounded-[var(--radius-card)] border border-current/25 bg-transparent px-2 py-1 text-[0.82rem] focus:outline-none"
      >
        {routing.locales.map((locale) => (
          <option key={locale} value={locale} className="text-ink">
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </label>
  );
}
