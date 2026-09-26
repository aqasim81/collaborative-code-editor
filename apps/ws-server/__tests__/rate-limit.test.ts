import { describe, expect, it } from "vitest";
import { createKeyedRateLimiter, createRateLimiter, upgradeRateLimitKey } from "../src/rate-limit";

describe("rate limiter", () => {
  it("allows a burst up to capacity, then refuses", () => {
    const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 1 }, () => 0);

    expect([1, 2, 3, 4].map(() => limiter.tryConsume())).toEqual([true, true, true, false]);
  });

  it("refills over time without exceeding capacity", () => {
    let now = 0;
    const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 2 }, () => now);
    limiter.tryConsume();
    limiter.tryConsume();
    expect(limiter.tryConsume()).toBe(false);

    now = 500; // one token back
    expect(limiter.tryConsume()).toBe(true);
    expect(limiter.tryConsume()).toBe(false);

    now = 60_000; // capped at capacity
    expect([1, 2, 3].map(() => limiter.tryConsume())).toEqual([true, true, false]);
  });

  it("charges a cost, so a bucket can count bytes", () => {
    let now = 0;
    const limiter = createRateLimiter({ capacity: 1_000, refillPerSecond: 100 }, () => now);

    expect(limiter.tryConsume(600)).toBe(true);
    expect(limiter.tryConsume(600)).toBe(false); // 400 left
    expect(limiter.tryConsume(400)).toBe(true);

    now = 2_000; // 200 back
    expect(limiter.tryConsume(201)).toBe(false);
    expect(limiter.tryConsume(200)).toBe(true);
  });

  it("refuses a single cost larger than the whole bucket", () => {
    const limiter = createRateLimiter({ capacity: 10, refillPerSecond: 10 }, () => 0);

    expect(limiter.tryConsume(11)).toBe(false);
    expect(limiter.tryConsume(10)).toBe(true);
  });
});

describe("keyed rate limiter", () => {
  it("keeps a separate bucket per key", () => {
    const limiter = createKeyedRateLimiter({ capacity: 1, refillPerSecond: 1 }, 100, () => 0);

    expect(limiter.tryConsume("a")).toBe(true);
    expect(limiter.tryConsume("a")).toBe(false);
    expect(limiter.tryConsume("b")).toBe(true);
  });

  it("drops fully refilled buckets when the table is full", () => {
    let now = 0;
    const limiter = createKeyedRateLimiter({ capacity: 1, refillPerSecond: 1 }, 2, () => now);
    limiter.tryConsume("a");
    limiter.tryConsume("b");
    expect(limiter.size()).toBe(2);

    now = 5_000; // both refilled: forgetting them changes nothing
    expect(limiter.tryConsume("c")).toBe(true);
    expect(limiter.size()).toBe(1);
  });

  it("evicts a bucket when the table is full of active keys", () => {
    const limiter = createKeyedRateLimiter({ capacity: 1, refillPerSecond: 1 }, 2, () => 0);
    limiter.tryConsume("a");
    limiter.tryConsume("b");

    expect(limiter.tryConsume("c")).toBe(true);
    expect(limiter.size()).toBe(2);
    expect(limiter.tryConsume("b")).toBe(false); // still tracked
    expect(limiter.tryConsume("a")).toBe(true); // was evicted, starts full
  });

  it("evicts the least recently used bucket, so a busy key keeps its state", () => {
    const limiter = createKeyedRateLimiter({ capacity: 1, refillPerSecond: 1 }, 2, () => 0);
    limiter.tryConsume("a");
    limiter.tryConsume("b");
    limiter.tryConsume("a"); // refused, but a is now the most recent

    expect(limiter.tryConsume("c")).toBe(true); // evicts b
    expect(limiter.tryConsume("a")).toBe(false); // still tracked and empty
  });
});

describe("upgrade rate-limit key", () => {
  it("keys IPv4 by address, including IPv4-mapped IPv6", () => {
    expect(upgradeRateLimitKey("203.0.113.7")).toBe("203.0.113.7");
    expect(upgradeRateLimitKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("keys IPv6 by its /64, since one host usually controls the whole prefix", () => {
    expect(upgradeRateLimitKey("2001:db8:1:2:aaaa::1")).toBe("2001:db8:1:2::/64");
    expect(upgradeRateLimitKey("2001:db8:1:2:bbbb:cccc:dddd:eeee")).toBe("2001:db8:1:2::/64");
    expect(upgradeRateLimitKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(upgradeRateLimitKey("::1")).toBe("0:0:0:0::/64");
    expect(upgradeRateLimitKey("fe80::1%lo0")).toBe("fe80:0:0:0::/64");
  });

  it("shares one bucket for an unknown address", () => {
    expect(upgradeRateLimitKey(undefined)).toBe("unknown");
  });
});
