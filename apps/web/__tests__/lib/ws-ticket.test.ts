// @vitest-environment node
// jose needs the Node realm's Uint8Array; jsdom provides its own.
import {
  PURGE_TICKET_AUDIENCE,
  PURGE_TICKET_TTL_SECONDS,
  ROOM_TICKET_AUDIENCE,
  ROOM_TICKET_TTL_SECONDS,
} from "@collab-editor/shared";
import { jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { signPurgeTicket, signRoomTicket } from "@/lib/ws-ticket";

const secret = "s".repeat(32);
const key = new TextEncoder().encode(secret);

describe("signRoomTicket", () => {
  it("signs an HS256 ticket bound to the user and room", async () => {
    const now = Math.floor(Date.now() / 1000);
    const { ticket, expiresAt } = await signRoomTicket(
      {
        userId: "u1",
        name: "Ada",
        image: "https://avatars.githubusercontent.com/u/1",
        roomId: "r1",
      },
      secret,
      now,
    );

    const { payload, protectedHeader } = await jwtVerify(ticket, key, { algorithms: ["HS256"] });
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({
      sub: "u1",
      aud: ROOM_TICKET_AUDIENCE,
      name: "Ada",
      image: "https://avatars.githubusercontent.com/u/1",
      roomId: "r1",
      iat: now,
    });
    expect(payload.exp).toBe(now + ROOM_TICKET_TTL_SECONDS);
    expect(expiresAt).toBe(now + ROOM_TICKET_TTL_SECONDS);
  });

  it.each([
    null,
    "http://example.com/a.png",
    "javascript:alert(1)",
  ])("leaves out an avatar the WS server would refuse: %s", async (image) => {
    const { ticket } = await signRoomTicket(
      { userId: "u1", name: "Ada", image, roomId: "r1" },
      secret,
    );

    const { payload } = await jwtVerify(ticket, key);
    expect(payload.image).toBeNull();
  });

  it("lives at most five minutes", () => {
    expect(ROOM_TICKET_TTL_SECONDS).toBeLessThanOrEqual(300);
  });

  it("cannot be verified with another secret", async () => {
    const { ticket } = await signRoomTicket(
      { userId: "u1", name: "Ada", image: null, roomId: "r1" },
      secret,
    );

    await expect(jwtVerify(ticket, new TextEncoder().encode("x".repeat(32)))).rejects.toThrow();
  });
});

describe("signPurgeTicket (#48)", () => {
  it("signs a 60 s HS256 ticket with the admin audience, bound to the room and the owner", async () => {
    const now = Math.floor(Date.now() / 1000);
    const ticket = await signPurgeTicket({ userId: "u1", roomId: "r1" }, secret, now);

    const { payload, protectedHeader } = await jwtVerify(ticket, key, {
      algorithms: ["HS256"],
      audience: PURGE_TICKET_AUDIENCE,
    });
    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({ sub: "u1", roomId: "r1", iat: now });
    expect(payload.exp).toBe(now + PURGE_TICKET_TTL_SECONDS);
  });

  it("does not pass as a room ticket, nor a room ticket as a purge ticket", async () => {
    const purge = await signPurgeTicket({ userId: "u1", roomId: "r1" }, secret);
    const { ticket: room } = await signRoomTicket(
      { userId: "u1", name: "Ada", image: null, roomId: "r1" },
      secret,
    );

    await expect(jwtVerify(purge, key, { audience: ROOM_TICKET_AUDIENCE })).rejects.toThrow();
    await expect(jwtVerify(room, key, { audience: PURGE_TICKET_AUDIENCE })).rejects.toThrow();
  });
});
