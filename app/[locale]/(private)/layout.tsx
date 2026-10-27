import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { NavShell } from "@/components/layout/NavShell";

/**
 * Renders the shell of the authenticated member area: a dark navigation bar with
 * the account menu, where the administrator entry only appears for that role.
 *
 * @param props - Content of the matched private route.
 * @returns The rendered private layout.
 */
export default async function PrivateLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const t = await getTranslations("Nav");

  return (
    <>
      <NavShell
        tone="pine"
        links={[
          { href: "/spaces", label: t("catalog") },
          { href: "/dashboard", label: t("dashboard") },
        ]}
      />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-5 py-10 sm:px-8 md:py-14">
        {children}
      </main>
    </>
  );
}
