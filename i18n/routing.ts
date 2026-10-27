import { defineRouting } from "next-intl/routing";

/** Locale configuration shared by the proxy, the navigation helpers and the UI. */
export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localePrefix: "always",
});

/** Locale the application can be rendered in. */
export type AppLocale = (typeof routing.locales)[number];

/** Human readable name of every supported locale. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  es: "Espanol",
  en: "English",
};
