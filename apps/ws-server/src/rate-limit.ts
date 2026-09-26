export interface RateLimitOptions {
  /** Burst size. */
  capacity: number;
  refillPerSecond: number;
}

export interface RateLimiter {
  /** Takes `cost` tokens (default 1); false, taking nothing, when fewer than `cost` are left. */
  tryConsume(cost?: number): boolean;
}

/** Messages per connection. */
export const DEFAULT_RATE_LIMIT: RateLimitOptions = { capacity: 100, refillPerSecond: 50 };

const MIB = 1024 * 1024;
/** The largest inbound frame the server accepts (`ws` maxPayload); a 10K-line first sync can exceed 1 MiB. */
export const DEFAULT_MAX_PAYLOAD_BYTES = 8 * MIB;
/**
 * Inbound bytes per connection. The burst is two maximum-size frames, so a fresh connection can upload its
 * whole document in the first sync (a 10K-line file is 1-2 MiB, far under one frame) and keep editing
 * straight after. The refill of 1 MiB/s is orders of magnitude above typing or pasting (tens of bytes per
 * keystroke) yet caps a flooding member at ~1 MiB/s instead of ~400 MiB/s (50 frames/s x 8 MiB).
 */
export const DEFAULT_BYTE_RATE_LIMIT: RateLimitOptions = {
  capacity: 2 * DEFAULT_MAX_PAYLOAD_BYTES,
  refillPerSecond: MIB,
};

/**
 * Token bucket, one per connection and budget (Invariant 1: every inbound message is rate-limited, by
 * count and by size).
 */
export function createRateLimiter(
  { capacity, refillPerSecond }: RateLimitOptions,
  now: () => number = Date.now,
): RateLimiter {
  let tokens = capacity;
  let last = now();
  return {
    tryConsume(cost = 1) {
      const current = now();
      tokens = Math.min(capacity, tokens + ((current - last) / 1000) * refillPerSecond);
      last = current;
      if (tokens < cost) {
        return false;
      }
      tokens -= cost;
      return true;
    },
  };
}
