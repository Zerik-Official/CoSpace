import type { ReactNode } from "react";
import { LuLayoutGrid } from "react-icons/lu";
import { getTranslations } from "next-intl/server";

import { ActionLink } from "@/components/ui/ActionLink";

/**
 * Renders the not found view shown by the public routes, for example when a
 * space identifier does not exist or has been deactivated.
 *
 * @returns The rendered not found view.
 */
export default async function PublicNotFound(): Promise<ReactNode> {
  const t = await getTranslations("Common");

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col items-start gap-5 px-5 py-24 sm:px-8">
      <LuLayoutGrid className="size-7 text-pine" aria-hidden />
      <h1 className="font-display text-[2rem] leading-tight text-ink">{t("notFoundTitle")}</h1>
      <p className="max-w-[46ch] text-[0.95rem] text-ink-soft">{t("notFoundDescription")}</p>
      <ActionLink href="/spaces" variant="secondary">
        {t("backToCatalog")}
      </ActionLink>
    </div>
  );
}
