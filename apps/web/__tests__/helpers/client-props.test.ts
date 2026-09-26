import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { env } from "@/lib/env";
import { findServerValues, serverOnlyEnvValues } from "./client-props";

describe("client props guard (Invariant 6)", () => {
  it("lists only non-public env values", () => {
    const keys = serverOnlyEnvValues().map(([key]) => key);

    expect(keys).toContain("WS_TICKET_SECRET");
    expect(keys).toContain("AUTH_SECRET");
    expect(keys.some((key) => key.startsWith("NEXT_PUBLIC_"))).toBe(false);
    expect(keys).not.toContain("NODE_ENV");
  });

  it("finds a server-only value nested in objects, arrays, elements and longer strings", () => {
    expect(findServerValues({ a: { b: [env.WS_TICKET_SECRET] } })).toEqual(["WS_TICKET_SECRET"]);
    expect(findServerValues({ url: `${env.DATABASE_URL}?schema=x` })).toEqual(["DATABASE_URL"]);
    expect(
      findServerValues({ children: createElement("span", { title: env.AUTH_SECRET }) }),
    ).toEqual(["AUTH_SECRET"]);
  });

  it("finds extra server-only values a test names", () => {
    const extra: [string, string][] = [["inviteToken", "invite-placeholder"]];

    expect(findServerValues({ link: "/join/invite-placeholder" }, extra)).toEqual(["inviteToken"]);
    expect(findServerValues({ link: "/room/r1" }, extra)).toEqual([]);
  });

  it("allows public values and non-string props", () => {
    expect(
      findServerValues({
        serverUrl: env.NEXT_PUBLIC_WS_URL,
        count: 3,
        onChange: () => env.WS_TICKET_SECRET,
        empty: null,
      }),
    ).toEqual([]);
  });
});
