/** Payload of every failed API response. */
export interface ApiErrorPayload {
  code: string;
  messageKey: string;
  params?: Record<string, string | number>;
}

/** Envelope of every successful API response. */
export interface ApiSuccessEnvelope<TData> {
  data: TData;
}

/** Envelope of every failed API response. */
export interface ApiErrorEnvelope {
  error: ApiErrorPayload;
}

/** Union of both response shapes. */
export type ApiEnvelope<TData> = ApiSuccessEnvelope<TData> | ApiErrorEnvelope;

/** Translator capable of resolving an i18n key with interpolation values. */
export type MessageTranslator = (
  messageKey: string,
  params?: Record<string, string | number>,
) => string;

/**
 * Narrows an API envelope to its error branch.
 *
 * @param envelope - Envelope returned by any route handler.
 * @returns True when the envelope carries an error payload.
 */
export function isApiErrorEnvelope<TData>(
  envelope: ApiEnvelope<TData>,
): envelope is ApiErrorEnvelope {
  return "error" in envelope;
}

/**
 * Reads the i18n key carried by a failed API response.
 *
 * @param envelope - Envelope returned by any route handler.
 * @returns The message key, or null for successful responses.
 */
export function getApiErrorKey(envelope: ApiEnvelope<unknown>): string | null {
  return isApiErrorEnvelope(envelope) ? envelope.error.messageKey : null;
}

/**
 * Resolves the interpolated message of a failed API response.
 *
 * @param envelope - Envelope returned by any route handler.
 * @param translate - Translator provided by the i18n layer.
 * @returns Localized message, or an empty string for successful responses.
 */
export function getApiErrorMessage(
  envelope: ApiEnvelope<unknown>,
  translate: MessageTranslator,
): string {
  if (!isApiErrorEnvelope(envelope)) {
    return "";
  }

  return translate(envelope.error.messageKey, envelope.error.params);
}
