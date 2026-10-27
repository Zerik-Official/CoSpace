"use client";

import { useCallback, useState, type ReactNode } from "react";
import { LuArrowRight } from "react-icons/lu";
import { LockIcon } from "lucide-animated";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { useSession } from "@/components/session/SessionProvider";
import { apiRequest } from "@/lib/api/client";
import { isApiErrorEnvelope } from "@/lib/api/envelope";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { ErrorCode } from "@/lib/domain/errors";
import type { SessionUser } from "@/lib/domain/types";
import { routing } from "@/i18n/routing";

/** Mode the form is rendered in. */
export type CredentialsMode = "login" | "register";

/** Props accepted by the credentials form. */
export interface CredentialsFormProps {
  mode: CredentialsMode;
  turnstileSiteKey: string;
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

  const segments = requested.split("/").filter(Boolean);
  const firstSegment = segments[0];

  if (
    firstSegment &&
    (routing.locales as readonly string[]).includes(firstSegment)
  ) {
    const withoutLocale = `/${segments.slice(1).join("/")}`;

    return withoutLocale === "/" ? "/dashboard" : withoutLocale;
  }

  return requested;
}

/**
 * Renders the sign in and sign up form. Both modes share the same layout and
 * error handling; registration only adds the display name field.
 *
 * @param props - Mode the form runs in and the public Turnstile site key.
 * @returns The rendered form.
 */
export function CredentialsForm({ mode, turnstileSiteKey }: CredentialsFormProps): ReactNode {
  const t = useTranslations("Auth");
  const resolveApiError = useApiErrorMessage();
  const { reload } = useSession();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0);

  const isRegister = mode === "register";

  const handleTurnstileVerify = useCallback((token: string): void => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback((): void => {
    setTurnstileToken(null);
  }, []);

  const handleTurnstileError = useCallback((): void => {
    setTurnstileToken(null);
  }, []);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage(null);

    if (!turnstileToken) {
      setErrorMessage(t("turnstileRequired"));
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const envelope = await apiRequest<{ user: SessionUser }>(
      isRegister ? "/api/auth/register" : "/api/auth/login",
      {
        method: "POST",
        body: {
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          turnstileToken,
          ...(isRegister ? { fullName: String(formData.get("fullName") ?? "") } : {}),
        },
      },
    );

    if (isApiErrorEnvelope(envelope)) {
      setIsSubmitting(false);
      if (envelope.error.code !== ErrorCode.VALIDATION_ERROR) {
        setTurnstileToken(null);
        setTurnstileResetSignal((signal) => signal + 1);
      }
      setErrorMessage(resolveApiError(envelope));
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

      <TurnstileWidget
        siteKey={turnstileSiteKey}
        resetSignal={turnstileResetSignal}
        onVerify={handleTurnstileVerify}
        onExpire={handleTurnstileExpire}
        onError={handleTurnstileError}
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

      <div className="flex items-center gap-2 text-[0.85rem] text-ink-soft">
        <LockIcon size={16} animateOnHover />
        <p>
          {isRegister ? t("hasAccount") : t("noAccount")}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-pine hover:underline"
          >
            {isRegister ? t("goToLogin") : t("goToRegister")}
          </Link>
        </p>
      </div>
    </form>
  );
}
