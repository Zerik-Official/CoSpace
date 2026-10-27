import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";

import { CredentialsForm } from "@/components/auth/CredentialsForm";

/** Props accepted by the login page. */
interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Renders the sign in page.
 *
 * @param props - Route props carrying the locale segment.
 * @returns The rendered login page.
 */
export default async function LoginPage({ params }: LoginPageProps): Promise<ReactNode> {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "Auth" });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[1.7rem] leading-tight text-ink">{t("loginTitle")}</h1>
        <p className="text-[0.9rem] text-ink-soft">{t("loginDescription")}</p>
      </header>
      <CredentialsForm mode="login" />
    </div>
  );
}
