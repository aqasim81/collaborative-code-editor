// @vitest-environment node
// jose needs the Node realm's Uint8Array; jsdom provides its own.
import { jwtVerify } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, findRoomForMemberMock, markRoomActiveMock, afterMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findRoomForMemberMock: vi.fn(),
  markRoomActiveMock: vi.fn(),
  afterMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/server", () => ({ after: afterMock }));
vi.mock("@/lib/rooms", () => ({
  findRoomForMember: findRoomForMemberMock,
  markRoomActive: markRoomActiveMock,
}));

import { getRoomTicket } from "@/actions/room-ticket";
import { env } from "@/lib/env";

const session = { user: { id: "u1", name: "Ada", image: null }, expires: "2099-01-01" };
const room = { id: "r1", name: "Room", language: "go", creatorId: "u1" };

describe("getRoomTicket", () => {
  beforeEach(() => {
    authMock.mockReset();
    findRoomForMemberMock.mockReset();
    markRoomActiveMock.mockReset();
    afterMock.mockReset();
  });

  it("issues a ticket for a member of the room", async () => {
    authMock.mockResolvedValue(session);
    findRoomForMemberMock.mockResolvedValue(room);

    const result = await getRoomTicket("r1");

    expect(findRoomForMemberMock).toHaveBeenCalledWith("r1", "u1");
    expect(result.success).toBe(true);
    if (result.success) {
      const { payload } = await jwtVerify(
        result.data.ticket,
        new TextEncoder().encode(env.WS_TICKET_SECRET),
      );
      expect(payload).toMatchObject({ sub: "u1", name: "Ada", image: null, roomId: "r1" });
    }
  });

  it("refuses a user who is not a member (Invariant 2)", async () => {
    authMock.mockResolvedValue(session);
    findRoomForMemberMock.mockResolvedValue(null);

    await expect(getRoomTicket("r1")).resolves.toEqual({
      success: false,
      error: "Room not found",
    });
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("records room activity after the response, not before issuing the ticket", async () => {
    authMock.mockResolvedValue(session);
    findRoomForMemberMock.mockResolvedValue(room);

    const result = await getRoomTicket("r1");

    expect(result.success).toBe(true);
    expect(markRoomActiveMock).not.toHaveBeenCalled();
    expect(afterMock).toHaveBeenCalledTimes(1);
    afterMock.mock.calls[0]?.[0]();
    expect(markRoomActiveMock).toHaveBeenCalledWith("r1");
  });

  it("refuses a signed-out visitor without touching the database", async () => {
    authMock.mockResolvedValue(null);

    await expect(getRoomTicket("r1")).resolves.toEqual({ success: false, error: "Not signed in" });
    expect(findRoomForMemberMock).not.toHaveBeenCalled();
  });

  it.each([undefined, "", 42, "x".repeat(65)])("rejects the room id %j", async (roomId) => {
    await expect(getRoomTicket(roomId)).resolves.toEqual({
      success: false,
      error: "Invalid room id",
    });
    expect(authMock).not.toHaveBeenCalled();
  });
});
