export const RATE_LIMITER = Symbol('RATE_LIMITER');

export interface RateLimitResult {
  count: number;
  limit: number;
  remaining: number;
  resetAt: number; // epoch seconds
}

export interface IRateLimiter {
  /**
   * Increments the counter for the given key within the current window.
   * Returns null if the rate limiter is unavailable (e.g. Redis down) — caller should fail open.
   */
  checkAndIncrement(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult | null>;
}
