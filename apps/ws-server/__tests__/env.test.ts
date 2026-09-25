import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env";

const secret = "s".repeat(32);

describe("parseEnv", () => {
  it("applies defaults when only the secret is set", () => {
    expect(parseEnv({ WS_TICKET_SECRET: secret })).toEqual({
      success: true,
      data: {
        WS_SERVER_PORT: 8080,
        WS_TICKET_SECRET: secret,
        ROOM_GRACE_PERIOD_MS: 30_000,
        LOG_LEVEL: "info",
        NODE_ENV: "development",
      },
    });
  });

  it("coerces numeric values from strings", () => {
    const result = parseEnv({
      WS_TICKET_SECRET: secret,
      WS_SERVER_PORT: "9001",
      ROOM_GRACE_PERIOD_MS: "500",
    });
    expect(result.success && result.data.WS_SERVER_PORT).toBe(9001);
    expect(result.success && result.data.ROOM_GRACE_PERIOD_MS).toBe(500);
  });

  it.each([
    [{}, "WS_TICKET_SECRET"],
    [{ WS_TICKET_SECRET: "" }, "WS_TICKET_SECRET"],
    [{ WS_TICKET_SECRET: "short" }, "at least 32 characters"],
    [{ WS_TICKET_SECRET: secret, WS_SERVER_PORT: "70000" }, "WS_SERVER_PORT"],
    [{ WS_TICKET_SECRET: secret, WS_SERVER_PORT: "abc" }, "WS_SERVER_PORT"],
    [{ WS_TICKET_SECRET: secret, LOG_LEVEL: "loud" }, "LOG_LEVEL"],
  ])("rejects %j", (source, fragment) => {
    const result = parseEnv(source);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(fragment);
    }
  });
});
