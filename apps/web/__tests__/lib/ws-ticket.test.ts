// @vitest-environment node
// jose needs the Node realm's Uint8Array; jsdom provides its own.
import { ROOM_TICKET_AUDIENCE, ROOM_TICKET_TTL_SECONDS } from "@collab-editor/shared";
import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { signRoomTicket } from "@/lib/ws-ticket";

const secret = "s".repeat(32);
const key = new TextEncoder().encode(secret);

describe("signRoomTicket", () => {
  it("signs an HS256 ticket bound to the user and room", async () => {
    const now = Math.floor(Date.now() / 1000);
    const { ticket, expiresAt } = await signRoomTicket(
      { userId: "u1", name: "Ada", roomId: "r1" },
      secret,
      now,
    );

    const { payload, protectedHeader } = await jwtVerify(ticket, key, { algorithms: ["HS256"] });
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({
      sub: "u1",
      aud: ROOM_TICKET_AUDIENCE,
      name: "Ada",
      roomId: "r1",
      iat: now,
    });
    expect(payload.exp).toBe(now + ROOM_TICKET_TTL_SECONDS);
    expect(expiresAt).toBe(now + ROOM_TICKET_TTL_SECONDS);
  });

  it("lives at most five minutes", () => {
    expect(ROOM_TICKET_TTL_SECONDS).toBeLessThanOrEqual(300);
  });

  it("cannot be verified with another secret", async () => {
    const { ticket } = await signRoomTicket({ userId: "u1", name: "Ada", roomId: "r1" }, secret);

    await expect(jwtVerify(ticket, new TextEncoder().encode("x".repeat(32)))).rejects.toThrow();
  });
});
