import type { ReactNode } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

import { DashboardPanel } from "@/components/reservations/DashboardPanel";

export const instant = false;

/** Props accepted by the dashboard page. */
interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Renders the reservations dashboard. The page itself only prepares an empty
 * per-request shell; the reservations are fetched and rendered in the browser,
 * which is the client side rendering strategy of this route.
 *
 * @param props - Route props carrying the locale segment.
 * @returns The rendered dashboard page.
 */
export default async function DashboardPage({
  params,
}: DashboardPageProps): Promise<ReactNode> {
  const { locale } = await params;
  await connection();

  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[2.1rem] leading-tight text-ink">{t("title")}</h1>
        <p className="max-w-[62ch] text-[0.95rem] text-ink-soft">{t("description")}</p>
      </header>
      <DashboardPanel />
    </>
  );
}
