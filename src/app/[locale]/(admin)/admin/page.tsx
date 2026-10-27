import type { ReactNode } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

import { AdminPanel } from "@/components/admin/AdminPanel";

export const instant = false;

/** Props accepted by the administration page. */
interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Renders the administrator page. The catalog and the reservations ahead are
 * fetched in the browser through the administrator endpoints, while the proxy
 * and those endpoints check the session and the role on their own.
 *
 * @param props - Route props carrying the locale segment.
 * @returns The rendered administration page.
 */
export default async function AdminPage({ params }: AdminPageProps): Promise<ReactNode> {
  const { locale } = await params;
  await connection();

  const t = await getTranslations({ locale, namespace: "Admin" });

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[2.1rem] leading-tight text-ink">{t("title")}</h1>
        <p className="max-w-[62ch] text-[0.95rem] text-ink-soft">{t("description")}</p>
      </header>
      <AdminPanel />
    </>
  );
}
