import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/lib/env";

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
  it("accepts a complete environment and defaults NODE_ENV", () => {
    const result = parseEnv(validEnv);
    expect(result).toEqual({ success: true, data: { ...validEnv, NODE_ENV: "development" } });
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
