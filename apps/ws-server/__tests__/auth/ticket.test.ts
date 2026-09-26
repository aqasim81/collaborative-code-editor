import { describe, expect, it } from "vitest";
import { verifyRoomTicket } from "../../src/auth/ticket";
import { signTicket, TEST_SECRET } from "../helpers/tickets";

const now = () => Math.floor(Date.now() / 1000);

describe("verifyRoomTicket (Invariants 1 and 2)", () => {
  it("accepts a valid ticket for the room", async () => {
    const result = await verifyRoomTicket(await signTicket(), "room-1", TEST_SECRET);

    expect(result).toMatchObject({
      success: true,
      data: { sub: "user-1", name: "Ada", image: null, roomId: "room-1" },
    });
  });

  it("carries the user's avatar", async () => {
    const image = "https://avatars.githubusercontent.com/u/1?v=4";
    const result = await verifyRoomTicket(await signTicket({ image }), "room-1", TEST_SECRET);

    expect(result).toMatchObject({ success: true, data: { image } });
  });

  it.each([
    "javascript:alert(1)",
    "http://example.com/a.png",
    "not a url",
  ])("rejects an avatar that is not an https URL: %s", async (image) => {
    const result = await verifyRoomTicket(await signTicket({ image }), "room-1", TEST_SECRET);

    expect(result).toEqual({ success: false, error: "invalid ticket claims" });
  });

  it("rejects a ticket for another room", async () => {
    const result = await verifyRoomTicket(await signTicket(), "room-2", TEST_SECRET);

    expect(result).toEqual({ success: false, error: "ticket is for another room" });
  });

  it("rejects an expired ticket", async () => {
    const token = await signTicket({ iat: now() - 400, exp: now() - 100 });

    const result = await verifyRoomTicket(token, "room-1", TEST_SECRET);
    expect(result.success).toBe(false);
  });

  it("rejects a ticket signed with another secret", async () => {
    const token = await signTicket({ secret: "x".repeat(32) });

    expect((await verifyRoomTicket(token, "room-1", TEST_SECRET)).success).toBe(false);
  });

  it("rejects an algorithm other than HS256", async () => {
    const token = await signTicket({ alg: "HS512" });

    expect((await verifyRoomTicket(token, "room-1", TEST_SECRET)).success).toBe(false);
  });

  it("rejects a ticket that lives longer than the TTL", async () => {
    const token = await signTicket({ exp: now() + 3_600 });

    expect(await verifyRoomTicket(token, "room-1", TEST_SECRET)).toEqual({
      success: false,
      error: "ticket lifetime too long",
    });
  });

  it("rejects a ticket without the room claim", async () => {
    const token = await signTicket({ roomId: "" });

    expect(await verifyRoomTicket(token, "room-1", TEST_SECRET)).toEqual({
      success: false,
      error: "invalid ticket claims",
    });
  });

  it("rejects a token signed with the secret but not meant as a room ticket", async () => {
    const token = await signTicket({ audience: "something-else" });

    expect((await verifyRoomTicket(token, "room-1", TEST_SECRET)).success).toBe(false);
  });

  it("rejects garbage", async () => {
    expect((await verifyRoomTicket("not-a-jwt", "room-1", TEST_SECRET)).success).toBe(false);
  });
});
