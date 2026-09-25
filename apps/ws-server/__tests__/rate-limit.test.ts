import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/rate-limit";

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
});
