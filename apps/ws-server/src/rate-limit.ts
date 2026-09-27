import { normaliseAddress } from "./client-address";

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

interface Bucket {
  tokens: number;
  last: number;
}

/** Tokens in `bucket` at `current`, refilled since its last use and capped at capacity. */
function refilled(
  bucket: Bucket,
  { capacity, refillPerSecond }: RateLimitOptions,
  current: number,
) {
  return Math.min(capacity, bucket.tokens + ((current - bucket.last) / 1000) * refillPerSecond);
}

function consume(
  bucket: Bucket,
  options: RateLimitOptions,
  current: number,
  cost: number,
): boolean {
  bucket.tokens = refilled(bucket, options, current);
  bucket.last = current;
  if (bucket.tokens < cost) {
    return false;
  }
  bucket.tokens -= cost;
  return true;
}

/**
 * Token bucket, one per connection and budget (Invariant 1: every inbound message is rate-limited, by
 * count and by size).
 */
export function createRateLimiter(
  options: RateLimitOptions,
  now: () => number = Date.now,
): RateLimiter {
  const bucket: Bucket = { tokens: options.capacity, last: now() };
  return {
    tryConsume: (cost = 1) => consume(bucket, options, now(), cost),
  };
}

/**
 * Upgrade attempts per client IP. The burst covers a small office behind one NAT reconnecting all its
 * tabs after a server restart; each tab otherwise reconnects about once per ticket lifetime (5 min), far
 * below the refill. A flood from one address gets 429 at ~1 attempt/s instead of one HMAC per attempt.
 */
export const DEFAULT_UPGRADE_RATE_LIMIT: RateLimitOptions = { capacity: 30, refillPerSecond: 1 };

/** Cap on remembered IPs, so a spray of source addresses cannot grow the table without bound. */
export const DEFAULT_UPGRADE_RATE_LIMIT_MAX_KEYS = 10_000;

export interface KeyedRateLimiter {
  /** Takes one token from `key`'s bucket; false when it is empty. */
  tryConsume(key: string): boolean;
  /** Buckets currently remembered. */
  size(): number;
}

/**
 * One token bucket per key (e.g. remote IP). When the table is full, buckets that have refilled
 * completely are dropped (forgetting them changes nothing); if it is still full, the least recently used
 * goes, so a key that keeps trying keeps its (empty) bucket.
 */
export function createKeyedRateLimiter(
  options: RateLimitOptions,
  maxKeys: number,
  now: () => number = Date.now,
): KeyedRateLimiter {
  const buckets = new Map<string, Bucket>();

  function makeRoom(current: number): void {
    for (const [key, bucket] of buckets) {
      if (refilled(bucket, options, current) >= options.capacity) {
        buckets.delete(key);
      }
    }
    const leastRecent = buckets.keys().next();
    if (buckets.size >= maxKeys && !leastRecent.done) {
      buckets.delete(leastRecent.value);
    }
  }

  return {
    tryConsume(key) {
      const current = now();
      let bucket = buckets.get(key);
      if (bucket) {
        // Re-insert so the map's iteration order is least recently used first.
        buckets.delete(key);
      } else {
        if (buckets.size >= maxKeys) {
          makeRoom(current);
        }
        bucket = { tokens: options.capacity, last: current };
      }
      buckets.set(key, bucket);
      return consume(bucket, options, current, 1);
    },
    size: () => buckets.size,
  };
}

/**
 * The eight hextets of an IPv6 address (no zone id); `::` expanded to zeros, leading zeros and case
 * dropped, so one address has one form however a proxy wrote it.
 */
function ipv6Hextets(address: string): string[] {
  const [head = "", tail] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const zeros = Array<string>(Math.max(0, 8 - headParts.length - tailParts.length)).fill("0");
  const hextets = tail === undefined ? headParts : [...headParts, ...zeros, ...tailParts];
  return hextets.map((hextet) => Number.parseInt(hextet, 16).toString(16));
}

/**
 * The upgrade-limit bucket for a client address: IPv4 (also IPv4-mapped IPv6) by address, IPv6
 * by its /64, because one host is usually handed a whole /64 and could otherwise rotate through buckets.
 */
export function upgradeRateLimitKey(address: string | undefined): string {
  if (!address) {
    return "unknown";
  }
  const normalised = normaliseAddress(address);
  if (!normalised.includes(":")) {
    return normalised;
  }
  return `${ipv6Hextets(normalised).slice(0, 4).join(":")}::/64`;
}
