import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "@/lib/redirect";

const site = "http://localhost:3000";

describe("safeCallbackPath", () => {
  it.each([
    ["/room/abc", "/room/abc"],
    ["/dashboard?tab=recent#top", "/dashboard?tab=recent#top"],
    ["http://localhost:3000/room/abc", "/room/abc"],
  ])("keeps same-origin target %s", (value, expected) => {
    expect(safeCallbackPath(value, site)).toBe(expected);
  });

  it.each([
    ["an external URL", "https://evil.example.com/steal"],
    ["a protocol-relative URL", "//evil.example.com"],
    ["a same-origin URL with a protocol-relative path", "http://localhost:3000//evil.example.com"],
    ["a dot segment that normalises to a protocol-relative path", "/.//evil.example.com"],
    ["a backslash host trick", "/\\evil.example.com"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a different port on the same host", "http://localhost:4000/room"],
    ["an empty string", ""],
    ["whitespace", "   "],
    ["a non-string value", null],
    ["an over-long value", `/${"a".repeat(3000)}`],
  ])("falls back to /dashboard for %s", (_label, value) => {
    expect(safeCallbackPath(value, site)).toBe("/dashboard");
  });

  it("falls back when the value cannot be parsed as a URL", () => {
    expect(safeCallbackPath("http://[invalid", site)).toBe("/dashboard");
  });
});
