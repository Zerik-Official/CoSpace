import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";

/**
 * Builds the translation configuration of a request: the locale it renders in,
 * the message catalog and the time zone used by `next-intl` formatters.
 */
export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = locale ?? (await rootParams.locale());
  const activeLocale = hasLocale(routing.locales, resolvedLocale)
    ? resolvedLocale
    : routing.defaultLocale;

  return {
    locale: activeLocale,
    timeZone: process.env.NEXT_PUBLIC_VENUE_TIMEZONE ?? "America/Bogota",
    messages: (await import(`../messages/${activeLocale}.json`)).default,
  };
});
