import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "@/lib/auth-errors";

describe("signInErrorMessage", () => {
  it("says nothing when there was no error", () => {
    expect(signInErrorMessage(undefined)).toBeNull();
  });

  it.each([
    ["AccessDenied", /cancelled or access was denied/],
    ["Configuration", /server problem/],
    ["OAuthAccountNotLinked", /can't be linked/],
  ])("explains %s", (code, message) => {
    expect(signInErrorMessage(code)).toMatch(message);
  });

  it.each([
    "Callback",
    "",
    "toString",
    "<script>",
  ])("falls back to a generic message for %j", (code) => {
    expect(signInErrorMessage(code)).toBe("Sign-in failed. Please try again.");
  });
});
