"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { LuArrowRight } from "react-icons/lu";
import { LockIcon } from "lucide-animated";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { useSession } from "@/components/session/SessionProvider";
import { apiRequest } from "@/lib/api/client";
import { getApiErrorMessage, isApiErrorEnvelope } from "@/lib/api/envelope";
import type { SessionUser } from "@/lib/domain/types";

/** Mode the form is rendered in. */
export type CredentialsMode = "login" | "register";

/** Props accepted by the credentials form. */
export interface CredentialsFormProps {
  mode: CredentialsMode;
}

/**
 * Reads the page a visitor wanted to reach before signing in.
 *
 * @returns A same-origin path, or the dashboard as the default destination.
 */
function nextDestination(): string {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  const requested = new URLSearchParams(window.location.search).get("next");

  if (!requested || !requested.startsWith("/") || requested.startsWith("//")) {
    return "/dashboard";
  }

  return requested;
}

/**
 * Renders the sign in and sign up form. Both modes share the same layout and
 * error handling; registration only adds the display name field.
 *
 * @param props - Mode the form runs in.
 * @returns The rendered form.
 */
export function CredentialsForm({ mode }: CredentialsFormProps): ReactNode {
  const t = useTranslations("Auth");
  const { reload } = useSession();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isRegister = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const envelope = await apiRequest<{ user: SessionUser }>(
      isRegister ? "/api/auth/register" : "/api/auth/login",
      {
        method: "POST",
        body: {
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          ...(isRegister ? { fullName: String(formData.get("fullName") ?? "") } : {}),
        },
      },
    );

    if (isApiErrorEnvelope(envelope)) {
      setIsSubmitting(false);
      setErrorMessage(getApiErrorMessage(envelope, (key, params) => t(key as never, params as never)));
      return;
    }

    await reload();
    router.replace(nextDestination());
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4" noValidate>
      {isRegister ? (
        <TextField
          name="fullName"
          label={t("fullNameLabel")}
          placeholder={t("fullNamePlaceholder")}
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
        />
      ) : null}

      <TextField
        name="email"
        type="email"
        label={t("emailLabel")}
        placeholder={t("emailPlaceholder")}
        autoComplete="email"
        required
      />

      <TextField
        name="password"
        type="password"
        label={t("passwordLabel")}
        placeholder={t("passwordPlaceholder")}
        hint={isRegister ? t("passwordHint") : undefined}
        autoComplete={isRegister ? "new-password" : "current-password"}
        required
      />

      {errorMessage ? <Alert tone="error">{errorMessage}</Alert> : null}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? isRegister
            ? t("registerSubmitting")
            : t("loginSubmitting")
          : isRegister
            ? t("registerSubmit")
            : t("loginSubmit")}
        <LuArrowRight className="size-4" aria-hidden />
      </Button>

      <p className="flex items-center gap-2 text-[0.85rem] text-ink-soft">
        <LockIcon size={16} animateOnHover />
        {isRegister ? t("hasAccount") : t("noAccount")}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-pine hover:underline"
        >
          {isRegister ? t("goToLogin") : t("goToRegister")}
        </Link>
      </p>
    </form>
  );
}
