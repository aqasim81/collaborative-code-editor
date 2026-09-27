import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  createRoomWithOwner: vi.fn(),
  listRoomsForMember: vi.fn(),
  findMemberRole: vi.fn(),
  deleteOwnedRoom: vi.fn(),
  after: vi.fn(),
  sweepRoomPurges: vi.fn(),
  maybeSweepRoomPurges: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/server", () => ({ after: mocks.after }));
vi.mock("@/lib/room-purge", () => ({
  sweepRoomPurges: mocks.sweepRoomPurges,
  maybeSweepRoomPurges: mocks.maybeSweepRoomPurges,
}));
vi.mock("@/lib/rooms", () => ({
  createRoomWithOwner: mocks.createRoomWithOwner,
  listRoomsForMember: mocks.listRoomsForMember,
  findMemberRole: mocks.findMemberRole,
  deleteOwnedRoom: mocks.deleteOwnedRoom,
}));

import { createRoom, deleteRoom, listRooms } from "@/actions/room";

const session = { user: { id: "u1", name: "Ada", image: null }, expires: "2099-01-01" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue(session);
});

describe("createRoom", () => {
  it("creates a room owned by the signed-in user and refreshes the dashboard", async () => {
    mocks.createRoomWithOwner.mockResolvedValue({ id: "r9" });

    await expect(createRoom({ name: " Pairing ", language: "python" })).resolves.toEqual({
      success: true,
      data: { id: "r9" },
    });
    expect(mocks.createRoomWithOwner).toHaveBeenCalledWith({
      name: "Pairing",
      language: "python",
      userId: "u1",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it.each([
    [{ name: "", language: "go" }, "Enter a room name"],
    [{ name: "x".repeat(81), language: "go" }, "Room names are at most 80 characters"],
    [{ name: "Room", language: "cobol" }, "Pick a supported language"],
    [null, "Invalid room"],
  ])("refuses %j before checking the session", async (input, error) => {
    await expect(createRoom(input)).resolves.toEqual({ success: false, error });
    expect(mocks.auth).not.toHaveBeenCalled();
    expect(mocks.createRoomWithOwner).not.toHaveBeenCalled();
  });

  it("refuses a signed-out visitor", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(createRoom({ name: "Room", language: "go" })).resolves.toEqual({
      success: false,
      error: "Not signed in",
    });
    expect(mocks.createRoomWithOwner).not.toHaveBeenCalled();
  });

  it("turns a database error into a generic message", async () => {
    mocks.createRoomWithOwner.mockRejectedValue(new Error("connection refused"));

    await expect(createRoom({ name: "Room", language: "go" })).resolves.toEqual({
      success: false,
      error: "Could not create the room. Try again.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("listRooms (Invariant 2)", () => {
  it("lists the signed-in user's rooms only", async () => {
    const rooms = [{ id: "r1" }];
    mocks.listRoomsForMember.mockResolvedValue(rooms);

    await expect(listRooms()).resolves.toEqual({ success: true, data: rooms });
    expect(mocks.listRoomsForMember).toHaveBeenCalledWith("u1");
  });

  it("retries due room purges after the response, throttled (#48)", async () => {
    mocks.listRoomsForMember.mockResolvedValue([]);

    await listRooms();
    expect(mocks.after).toHaveBeenCalledTimes(1);
    await mocks.after.mock.calls[0]?.[0]();
    expect(mocks.maybeSweepRoomPurges).toHaveBeenCalledTimes(1);
  });

  it("refuses a signed-out visitor", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(listRooms()).resolves.toEqual({ success: false, error: "Not signed in" });
    expect(mocks.listRoomsForMember).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("turns a database error into a generic message", async () => {
    mocks.listRoomsForMember.mockRejectedValue(new Error("timeout"));

    await expect(listRooms()).resolves.toEqual({
      success: false,
      error: "Could not load your rooms. Try again.",
    });
  });
});

describe("deleteRoom (Invariant 2)", () => {
  it("lets the owner delete the room and refreshes the dashboard", async () => {
    mocks.deleteOwnedRoom.mockResolvedValue(1);

    await expect(deleteRoom("r1")).resolves.toEqual({ success: true, data: { id: "r1" } });
    expect(mocks.deleteOwnedRoom).toHaveBeenCalledWith("r1", "u1");
    expect(mocks.findMemberRole).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("purges the room's document after the response, whatever the purge does (#48)", async () => {
    mocks.deleteOwnedRoom.mockResolvedValue(1);
    mocks.sweepRoomPurges.mockRejectedValue(new Error("WS server down"));

    await expect(deleteRoom("r1")).resolves.toEqual({ success: true, data: { id: "r1" } });
    expect(mocks.after).toHaveBeenCalledTimes(1);
    expect(mocks.sweepRoomPurges).not.toHaveBeenCalled();
    await expect(mocks.after.mock.calls[0]?.[0]()).rejects.toThrow("WS server down");
    expect(mocks.sweepRoomPurges).toHaveBeenCalledTimes(1);
  });

  it("tells an editor that only the owner can delete (the scoped delete removed nothing)", async () => {
    mocks.deleteOwnedRoom.mockResolvedValue(0);
    mocks.findMemberRole.mockResolvedValue("EDITOR");

    await expect(deleteRoom("r1")).resolves.toEqual({
      success: false,
      error: "Only the room's owner can delete it",
    });
    expect(mocks.findMemberRole).toHaveBeenCalledWith("r1", "u1");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("answers a non-member, a missing room and a lost race as not found", async () => {
    mocks.deleteOwnedRoom.mockResolvedValue(0);
    mocks.findMemberRole.mockResolvedValue(null);

    await expect(deleteRoom("r1")).resolves.toEqual({ success: false, error: "Room not found" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([undefined, "", 42, "x".repeat(65)])("rejects the room id %j", async (roomId) => {
    await expect(deleteRoom(roomId)).resolves.toEqual({
      success: false,
      error: "Invalid room id",
    });
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("refuses a signed-out visitor", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(deleteRoom("r1")).resolves.toEqual({ success: false, error: "Not signed in" });
    expect(mocks.deleteOwnedRoom).not.toHaveBeenCalled();
  });

  it("turns a database error into a generic message", async () => {
    mocks.deleteOwnedRoom.mockRejectedValue(new Error("timeout"));

    await expect(deleteRoom("r1")).resolves.toEqual({
      success: false,
      error: "Could not delete the room. Try again.",
    });
  });
});
