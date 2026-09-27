import { describe, expect, it } from "vitest";
import { invitePath, roomPath, signInErrorPath, signInRedirect } from "@/lib/routes";

describe("routes", () => {
  it("builds a room's path", () => {
    expect(roomPath("r1")).toBe("/room/r1");
  });

  it("puts an invite token under /join", () => {
    expect(invitePath("tok")).toBe("/join/tok");
  });

  it("encodes the callback path of a sign-in redirect", () => {
    expect(signInRedirect("/room/r1")).toBe("/sign-in?callbackUrl=%2Froom%2Fr1");
  });

  it("sends a failed sign-in back to the sign-in page with its type and destination", () => {
    expect(signInErrorPath("AccessDenied")).toBe("/sign-in?error=AccessDenied");
    expect(signInErrorPath("A&B", "/join/tok")).toBe(
      "/sign-in?error=A%26B&callbackUrl=%2Fjoin%2Ftok",
    );
  });
});
