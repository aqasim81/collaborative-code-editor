// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("logger (#51)", () => {
  it("is a pino logger named web at the LOG_LEVEL from env", async () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const { logger } = await import("@/lib/logger");

    expect(logger.level).toBe("warn");
    expect(logger.bindings()).toMatchObject({ name: "web" });
  });
});
