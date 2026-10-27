import { AppError, ErrorCode } from "@/server/errors";

/** Outcome of a rate limit check. */
export interface RateLimitState {
  remaining: number;
  resetInSeconds: number;
}

interface RateLimitBucket {
  hits: number[];
}

/**
 * Fixed window rate limiter kept in process memory. It protects the login
 * endpoint from credential stuffing; a single instance is enough for the
 * deployment target, and the state resets with the process.
 */
export class RateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  /**
   * @param maxAttempts - Attempts allowed inside one window.
   * @param windowSeconds - Length of the window in seconds.
   * @param now - Source of the current time in milliseconds, replaceable in tests.
   */
  constructor(
    private readonly maxAttempts: number,
    private readonly windowSeconds: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Records one attempt and rejects the caller when the window is exhausted.
   *
   * @param key - Scope of the limit, usually the client address plus the email.
   * @throws AppError with code RATE_LIMITED once the window is exhausted.
   */
  consume(key: string): void {
    const state = this.inspect(key);
    if (state.remaining <= 0) {
      throw new AppError(
        ErrorCode.RATE_LIMITED,
        { retryAfterSeconds: state.resetInSeconds, maxAttempts: this.maxAttempts },
        "Too many attempts inside the rate limit window",
      );
    }

    const bucket = this.buckets.get(key) ?? { hits: [] };
    bucket.hits.push(this.now());
    this.buckets.set(key, bucket);
  }

  /**
   * Forgets the attempts recorded for a key, used after a successful login.
   *
   * @param key - Scope of the limit.
   */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /**
   * Reads the current state of a key without recording an attempt.
   *
   * @param key - Scope of the limit.
   * @returns Remaining attempts and seconds until the window slides.
   */
  inspect(key: string): RateLimitState {
    const currentTime = this.now();
    const windowMilliseconds = this.windowSeconds * 1000;
    const bucket = this.buckets.get(key);
    const hits = (bucket?.hits ?? []).filter(
      (timestamp) => currentTime - timestamp < windowMilliseconds,
    );

    this.buckets.set(key, { hits });

    const oldestHit = hits[0];
    const resetInSeconds =
      oldestHit === undefined
        ? this.windowSeconds
        : Math.max(1, Math.ceil((oldestHit + windowMilliseconds - currentTime) / 1000));

    return { remaining: Math.max(0, this.maxAttempts - hits.length), resetInSeconds };
  }
}
