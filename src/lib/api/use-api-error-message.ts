"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api/envelope";

/** Resolves the localized message carried by a failed API response. */
export type ApiErrorResolver = (envelope: ApiEnvelope<unknown>) => string;

/**
 * Builds a resolver that translates every API error with the shared error
 * catalog instead of the namespace of the component that renders it.
 *
 * @returns A stable resolver for failed API envelopes.
 */
export function useApiErrorMessage(): ApiErrorResolver {
  const translate = useTranslations();

  return useCallback(
    (envelope: ApiEnvelope<unknown>): string =>
      getApiErrorMessage(envelope, (key, params) => translate(key as never, params as never)),
    [translate],
  );
}
