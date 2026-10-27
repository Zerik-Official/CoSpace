import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { CredentialsForm } from "@/components/auth/CredentialsForm";

/** Props accepted by the registration page. */
interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Renders the registration page.
 *
 * @param props - Route props carrying the locale segment.
 * @returns The rendered registration page.
 */
export default async function RegisterPage({ params }: RegisterPageProps): Promise<ReactNode> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "Auth" });
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[1.7rem] leading-tight text-ink">{t("registerTitle")}</h1>
        <p className="text-[0.9rem] text-ink-soft">{t("registerDescription")}</p>
      </header>
      <CredentialsForm mode="register" turnstileSiteKey={turnstileSiteKey} />
    </div>
  );
}
