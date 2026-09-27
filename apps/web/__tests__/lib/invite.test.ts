import { describe, expect, it } from "vitest";
import {
  generateInviteToken,
  INVITE_TOKEN_BYTES,
  inviteTokenSchema,
  inviteUrl,
} from "@/lib/invite";

describe("generateInviteToken", () => {
  it("encodes 32 random bytes as 43 base64url characters the schema accepts", () => {
    const token = generateInviteToken();

    expect(token).toHaveLength(43);
    expect(Buffer.from(token, "base64url")).toHaveLength(INVITE_TOKEN_BYTES);
    expect(inviteTokenSchema.safeParse(token).success).toBe(true);
  });

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 1000 }, generateInviteToken));

    expect(tokens.size).toBe(1000);
  });
});

describe("inviteTokenSchema", () => {
  const valid = "A".repeat(42);

  it.each([
    ["too short", valid],
    ["too long", `${valid}AB`],
    ["standard base64 +", `${valid}+`],
    ["standard base64 /", `${valid}/`],
    ["padding", `${valid}=`],
    ["a path", `../${"A".repeat(40)}`],
  ])("rejects %s", (_label, token) => {
    expect(inviteTokenSchema.safeParse(token).success).toBe(false);
  });

  it.each([undefined, null, 43, {}])("rejects the non-string %p", (value) => {
    expect(inviteTokenSchema.safeParse(value).success).toBe(false);
  });

  it("accepts every base64url character", () => {
    expect(inviteTokenSchema.safeParse(`${"aZ09".repeat(10)}-_x`).success).toBe(true);
  });
});

describe("invite links", () => {
  const token = generateInviteToken();

  it("builds an absolute URL on the site's origin, ignoring any path on the site URL", () => {
    expect(inviteUrl(token, "https://editor.example.com")).toBe(
      `https://editor.example.com/join/${token}`,
    );
    expect(inviteUrl(token, "http://localhost:3000/dashboard")).toBe(
      `http://localhost:3000/join/${token}`,
    );
  });
});
