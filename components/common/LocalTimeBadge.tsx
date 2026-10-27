"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * Shows the visitor's own wall clock. The first render always matches the server
 * markup because the value starts as null; the browser fills it in right after
 * hydration, which is the reason the component exists.
 *
 * @returns The rendered clock, or a size-matched placeholder before hydration.
 */
export function LocalTimeBadge(): ReactNode {
  const [localTime, setLocalTime] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations("LocalTime");

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });

    const tick = (): void => setLocalTime(formatter.format(new Date()));
    tick();

    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [locale]);

  return (
    <p className="text-[0.78rem] text-ink-soft">
      <span className="font-medium text-ink">{t("label")}</span>{" "}
      <span className="tabular-nums">{localTime ?? "--:--:--"}</span>
    </p>
  );
}
