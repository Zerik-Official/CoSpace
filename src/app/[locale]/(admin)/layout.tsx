import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { NavShell } from "@/components/layout/NavShell";

/**
 * Renders the shell of the administration panel with its own navigation, shared
 * only by the administrator routes.
 *
 * @param props - Content of the matched administrator route.
 * @returns The rendered administration layout.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const t = await getTranslations("Nav");
  const tAdmin = await getTranslations("Admin");

  return (
    <>
      <NavShell
        tone="pine"
        links={[
          { href: "/admin", label: tAdmin("title") },
          { href: "/spaces", label: t("catalog") },
        ]}
      />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-8 px-5 py-10 sm:px-8 md:py-14">
        {children}
      </main>
    </>
  );
}
