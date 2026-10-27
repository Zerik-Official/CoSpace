import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCode } from "@/lib/domain/errors";
import { Logger } from "@/server/logger";
import { TurnstileVerifier } from "@/server/security/turnstile-verifier";
import { loginPayloadSchema, registerPayloadSchema } from "@/server/validation/schemas";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function verificationResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const credentials = {
  email: "ana@example.com",
  password: "Secret123",
};

describe("TurnstileVerifier", () => {
  beforeEach(() => {
    vi.spyOn(Logger, "log").mockImplementation(() => undefined);
    vi.spyOn(Logger, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects a missing token without calling Cloudflare", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const verifier = new TurnstileVerifier("secret-key");

    await expect(verifier.verify("   ")).rejects.toMatchObject({
      code: ErrorCode.CAPTCHA_FAILED,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a token Cloudflare marks as valid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(verificationResponse({ success: true }));
    vi.stubGlobal("fetch", fetchMock);
    const verifier = new TurnstileVerifier("secret-key");

    await expect(verifier.verify("valid-token", "203.0.113.10")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as URLSearchParams;

    expect(url).toBe(SITEVERIFY_URL);
    expect(init.method).toBe("POST");
    expect(body.get("secret")).toBe("secret-key");
    expect(body.get("response")).toBe("valid-token");
    expect(body.get("remoteip")).toBe("203.0.113.10");
  });

  it("rejects a token Cloudflare marks as invalid", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      verificationResponse({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const verifier = new TurnstileVerifier("secret-key");

    await expect(verifier.verify("used-token")).rejects.toMatchObject({
      code: ErrorCode.CAPTCHA_FAILED,
    });
  });

  it("fails closed when Cloudflare cannot be reached", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const verifier = new TurnstileVerifier("secret-key");

    await expect(verifier.verify("token")).rejects.toMatchObject({
      code: ErrorCode.CAPTCHA_FAILED,
    });
  });

  it("fails closed on an unexpected verification status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(verificationResponse({ success: true }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const verifier = new TurnstileVerifier("secret-key");

    await expect(verifier.verify("token")).rejects.toMatchObject({
      code: ErrorCode.CAPTCHA_FAILED,
    });
  });
});

describe("Authentication payloads", () => {
  it("require a Turnstile token on login", () => {
    expect(loginPayloadSchema.safeParse(credentials).success).toBe(false);
    expect(
      loginPayloadSchema.safeParse({ ...credentials, turnstileToken: "token" }).success,
    ).toBe(true);
  });

  it("require a Turnstile token on registration", () => {
    const payload = { ...credentials, fullName: "Ana Gomez" };

    expect(registerPayloadSchema.safeParse(payload).success).toBe(false);
    expect(
      registerPayloadSchema.safeParse({ ...payload, turnstileToken: "token" }).success,
    ).toBe(true);
  });
});
