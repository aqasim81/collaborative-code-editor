import { describe, expect, it } from "vitest";
import { invitePath, roomPath, signInRedirect } from "@/lib/routes";

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
});
