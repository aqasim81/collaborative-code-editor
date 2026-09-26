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
