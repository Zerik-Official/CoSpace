"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import { useLocale, useTranslations } from "next-intl";

import { Alert } from "@/components/ui/Alert";

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileRenderOptions {
  sitekey: string;
  theme: "auto" | "light" | "dark";
  size: "normal" | "compact" | "flexible";
  language: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Props accepted by the Turnstile widget. */
export interface TurnstileWidgetProps {
  siteKey: string;
  resetSignal: number;
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
}

/**
 * Renders the Cloudflare Turnstile challenge and keeps its token in sync with the
 * form. The widget can be reset after a failed submission because a token can
 * only be verified once.
 *
 * @param props - Public site key, reset signal and token callbacks.
 * @returns The rendered challenge, or a configuration alert.
 */
export function TurnstileWidget({
  siteKey,
  resetSignal,
  onVerify,
  onExpire,
  onError,
}: TurnstileWidgetProps): ReactNode {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const handleVerify = useCallback(
    (token: string): void => {
      setUnavailable(false);
      onVerify(token);
    },
    [onVerify],
  );

  const handleExpire = useCallback((): void => {
    onExpire();
  }, [onExpire]);

  const handleFailure = useCallback((): void => {
    setUnavailable(true);
    onError();
  }, [onError]);

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current || !window.turnstile) {
      return;
    }

    let widgetId: string;

    try {
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "auto",
        size: "flexible",
        language: locale === "es" ? "es" : "en",
        callback: handleVerify,
        "expired-callback": handleExpire,
        "error-callback": handleFailure,
      });
      widgetIdRef.current = widgetId;
    } catch {
      queueMicrotask(handleFailure);
      return;
    }

    return () => {
      window.turnstile?.remove(widgetId);
      if (widgetIdRef.current === widgetId) {
        widgetIdRef.current = null;
      }
    };
  }, [scriptReady, siteKey, locale, handleVerify, handleExpire, handleFailure]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current) {
      window.turnstile?.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  if (!siteKey) {
    return <Alert tone="error">{t("turnstileError")}</Alert>;
  }

  return (
    <div className="flex flex-col gap-2">
      <Script
        id="cloudflare-turnstile-script"
        src={TURNSTILE_SCRIPT}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={handleFailure}
      />
      <div
        ref={containerRef}
        className="min-h-[65px]"
        role="group"
        aria-label={t("turnstileLabel")}
      />
      {unavailable ? <Alert tone="error">{t("turnstileError")}</Alert> : null}
    </div>
  );
}
