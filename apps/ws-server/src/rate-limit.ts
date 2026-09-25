export interface RateLimitOptions {
  /** Burst size. */
  capacity: number;
  refillPerSecond: number;
}

export interface RateLimiter {
  /** Takes one token; false when the bucket is empty. */
  tryConsume(): boolean;
}

export const DEFAULT_RATE_LIMIT: RateLimitOptions = { capacity: 100, refillPerSecond: 50 };

/** Token bucket, one per connection (Invariant 1: every inbound message is rate-limited). */
export function createRateLimiter(
  { capacity, refillPerSecond }: RateLimitOptions,
  now: () => number = Date.now,
): RateLimiter {
  let tokens = capacity;
  let last = now();
  return {
    tryConsume() {
      const current = now();
      tokens = Math.min(capacity, tokens + ((current - last) / 1000) * refillPerSecond);
      last = current;
      if (tokens < 1) {
        return false;
      }
      tokens -= 1;
      return true;
    },
  };
}
