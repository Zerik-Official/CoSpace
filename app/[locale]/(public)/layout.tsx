import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { NavShell } from "@/components/layout/NavShell";
import { SiteFooter } from "@/components/layout/SiteFooter";

/**
 * Renders the public shell: navigation bar, page content and footer. It wraps the
 * home page, the catalog and the space detail.
 *
 * @param props - Content of the matched public route.
 * @returns The rendered public layout.
 */
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const t = await getTranslations("Nav");

  return (
    <>
      <NavShell links={[{ href: "/spaces", label: t("catalog") }]} />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
