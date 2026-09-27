import { LOG_LEVELS as SHARED_LOG_LEVELS } from "@collab-editor/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOG_LEVELS, parseEnv, wsServerHttpUrl } from "@/lib/env";

const validEnv = {
  DATABASE_URL: "postgresql://collab:collab@localhost:5434/collab_editor",
  AUTH_SECRET: "a".repeat(32),
  AUTH_GITHUB_ID: "github-id",
  AUTH_GITHUB_SECRET: "github-secret",
  WS_TICKET_SECRET: "t".repeat(32),
  NEXT_PUBLIC_WS_URL: "ws://localhost:8080",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

function expectError(source: Record<string, string | undefined>, fragment: string) {
  const result = parseEnv(source);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toContain(fragment);
  }
}

describe("parseEnv", () => {
  it("accepts a complete environment and defaults NODE_ENV and LOG_LEVEL", () => {
    const result = parseEnv(validEnv);
    expect(result).toEqual({
      success: true,
      data: { ...validEnv, NODE_ENV: "development", LOG_LEVEL: "info" },
    });
  });

  it("accepts an optional AUTH_URL and wss URLs", () => {
    const result = parseEnv({
      ...validEnv,
      AUTH_URL: "https://editor.example.com",
      NEXT_PUBLIC_WS_URL: "wss://ws.example.com",
      NODE_ENV: "production",
    });
    expect(result.success).toBe(true);
  });

  it.each([
    "DATABASE_URL",
    "AUTH_SECRET",
    "AUTH_GITHUB_ID",
    "AUTH_GITHUB_SECRET",
    "WS_TICKET_SECRET",
    "NEXT_PUBLIC_WS_URL",
    "NEXT_PUBLIC_SITE_URL",
  ])("reports %s when it is missing", (key) => {
    expectError({ ...validEnv, [key]: undefined }, key);
  });

  it("treats an empty string as missing", () => {
    expectError({ ...validEnv, AUTH_GITHUB_SECRET: "" }, "AUTH_GITHUB_SECRET");
  });

  it("lists every invalid variable at once", () => {
    const result = parseEnv({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("DATABASE_URL");
      expect(result.error).toContain("NEXT_PUBLIC_SITE_URL");
    }
  });

  it("rejects a non-postgres DATABASE_URL", () => {
    expectError({ ...validEnv, DATABASE_URL: "mysql://localhost/db" }, "postgresql://");
  });

  it("rejects a short AUTH_SECRET", () => {
    expectError({ ...validEnv, AUTH_SECRET: "too-short" }, "at least 32 characters");
  });

  it("rejects a short WS_TICKET_SECRET", () => {
    expectError({ ...validEnv, WS_TICKET_SECRET: "short" }, "WS_TICKET_SECRET");
  });

  it("rejects an http NEXT_PUBLIC_WS_URL", () => {
    expectError({ ...validEnv, NEXT_PUBLIC_WS_URL: "http://localhost:8080" }, "ws://");
  });

  it("rejects a malformed NEXT_PUBLIC_SITE_URL", () => {
    expectError({ ...validEnv, NEXT_PUBLIC_SITE_URL: "localhost" }, "NEXT_PUBLIC_SITE_URL");
  });
});

describe("env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws at import when a required variable is missing", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    vi.resetModules();
    await expect(import("@/lib/env")).rejects.toThrow("AUTH_SECRET");
  });

  it("exposes the parsed values when the environment is valid", async () => {
    vi.resetModules();
    const { env } = await import("@/lib/env");
    expect(env.NEXT_PUBLIC_WS_URL).toBe("ws://localhost:8080");
  });
});

describe("WS_SERVER_URL (#48)", () => {
  it("is optional and accepts http(s) and ws(s) URLs", () => {
    for (const url of [
      "http://ws:8080",
      "https://ws.example.com",
      "ws://ws:8080",
      "wss://ws.example.com",
    ]) {
      expect(parseEnv({ ...validEnv, WS_SERVER_URL: url })).toMatchObject({
        success: true,
        data: { WS_SERVER_URL: url },
      });
    }
    expect(parseEnv({ ...validEnv, WS_SERVER_URL: "" })).toMatchObject({ success: true });
  });

  it("refuses another scheme", () => {
    expectError({ ...validEnv, WS_SERVER_URL: "ftp://ws:8080" }, "WS_SERVER_URL");
  });
});

describe("LOG_LEVEL (#51)", () => {
  it("has the same levels as the WS server", () => {
    expect(LOG_LEVELS).toEqual(SHARED_LOG_LEVELS);
  });

  it.each(LOG_LEVELS)("accepts %s", (level) => {
    const result = parseEnv({ ...validEnv, LOG_LEVEL: level });
    expect(result.success && result.data.LOG_LEVEL).toBe(level);
  });

  it("refuses an unknown level", () => {
    expectError({ ...validEnv, LOG_LEVEL: "verbose" }, "LOG_LEVEL");
  });
});

describe("wsServerHttpUrl", () => {
  it.each([
    [undefined, "ws://localhost:8080", "http://localhost:8080"],
    [undefined, "wss://ws.example.com", "https://ws.example.com"],
    ["http://ws-internal:8080", "wss://ws.example.com", "http://ws-internal:8080"],
    ["wss://ws-internal", "ws://localhost:8080", "https://ws-internal"],
  ])("WS_SERVER_URL %s, NEXT_PUBLIC_WS_URL %s → %s", (explicit, publicUrl, expected) => {
    expect(
      wsServerHttpUrl({
        ...(explicit === undefined ? {} : { WS_SERVER_URL: explicit }),
        NEXT_PUBLIC_WS_URL: publicUrl,
      }),
    ).toBe(expected);
  });
});
