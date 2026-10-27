import { AppError, ErrorCode } from "@/server/errors";
import { Logger, LogTag } from "@/server/logger";

const VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFICATION_TIMEOUT_MS = 5000;
const UNKNOWN_CLIENT = "unknown-client";

/**
 * Collects the error codes Cloudflare reports for a rejected token.
 *
 * @param payload - Decoded response from the verification endpoint.
 * @returns Safe, non-sensitive error codes for the logs.
 */
function readErrorCodes(payload: unknown): string[] {
  if (typeof payload !== "object" || payload === null || !("error-codes" in payload)) {
    return [];
  }

  const codes = (payload as { "error-codes"?: unknown })["error-codes"];

  return Array.isArray(codes)
    ? codes.filter((code): code is string => typeof code === "string")
    : [];
}

/**
 * Verifies Cloudflare Turnstile tokens before authentication or registration.
 * The verifier fails closed: a missing, expired, reused, or unverifiable token is
 * always rejected, so a Cloudflare outage cannot silently disable the challenge.
 */
export class TurnstileVerifier {
  /**
   * @param secretKey - Server-side secret of the Turnstile widget.
   */
  constructor(private readonly secretKey: string) {}

  /**
   * Verifies a token against the Cloudflare siteverify endpoint.
   *
   * @param token - Token produced by the browser widget.
   * @param remoteIp - Optional caller address forwarded to Cloudflare.
   * @throws AppError with code CAPTCHA_FAILED when the token is not valid.
   */
  async verify(token: string, remoteIp?: string): Promise<void> {
    const responseToken = token.trim();

    if (!responseToken) {
      Logger.log("WARN", LogTag.AUTH, "Turnstile token is missing");
      throw new AppError(ErrorCode.CAPTCHA_FAILED, {}, "Turnstile token is missing");
    }

    const body = new URLSearchParams({
      secret: this.secretKey,
      response: responseToken,
    });

    if (remoteIp && remoteIp !== UNKNOWN_CLIENT) {
      body.set("remoteip", remoteIp);
    }

    let response: Response;

    try {
      response = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        body,
        signal: AbortSignal.timeout(VERIFICATION_TIMEOUT_MS),
      });
    } catch (error) {
      Logger.error(LogTag.AUTH, "Turnstile verification request failed", error);
      throw new AppError(
        ErrorCode.CAPTCHA_FAILED,
        {},
        "Turnstile verification could not be completed",
      );
    }

    if (!response.ok) {
      Logger.error(
        LogTag.AUTH,
        "Turnstile verification returned an unexpected status",
        new Error(`HTTP ${response.status}`),
        { status: response.status },
      );
      throw new AppError(ErrorCode.CAPTCHA_FAILED, {}, "Turnstile verification was unavailable");
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error) {
      Logger.error(LogTag.AUTH, "Turnstile verification returned malformed JSON", error);
      throw new AppError(ErrorCode.CAPTCHA_FAILED, {}, "Turnstile verification was malformed");
    }

    const succeeded =
      typeof payload === "object" &&
      payload !== null &&
      "success" in payload &&
      (payload as { success?: unknown }).success === true;

    if (!succeeded) {
      Logger.log("WARN", LogTag.AUTH, "Turnstile verification rejected", {
        errorCodes: readErrorCodes(payload).join(",") || null,
      });
      throw new AppError(ErrorCode.CAPTCHA_FAILED, {}, "Turnstile verification was rejected");
    }
  }
}
