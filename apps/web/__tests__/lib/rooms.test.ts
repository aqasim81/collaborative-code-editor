import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  room: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  roomMember: { findUnique: vi.fn(), findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  createRoomWithOwner,
  deleteOwnedRoom,
  findMemberRole,
  findRoomForMember,
  listRoomsForMember,
  markRoomActive,
  ROOM_ACTIVITY_RESOLUTION_MS,
} from "@/lib/rooms";

const room = { id: "r1", name: "Room", language: "go", creatorId: "u1" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("findRoomForMember (Invariant 2)", () => {
  it("only matches the room when the user is a member", async () => {
    prismaMock.room.findFirst.mockResolvedValueOnce(room);

    await expect(findRoomForMember("r1", "u2")).resolves.toBe(room);
    expect(prismaMock.room.findFirst).toHaveBeenCalledWith({
      where: { id: "r1", members: { some: { userId: "u2" } } },
    });
  });

  it("returns null when there is no membership row", async () => {
    prismaMock.room.findFirst.mockResolvedValueOnce(null);

    await expect(findRoomForMember("r1", "stranger")).resolves.toBeNull();
  });
});

describe("findMemberRole", () => {
  it("looks up the user's own membership row", async () => {
    prismaMock.roomMember.findUnique.mockResolvedValueOnce({ role: "EDITOR" });

    await expect(findMemberRole("r1", "u2")).resolves.toBe("EDITOR");
    expect(prismaMock.roomMember.findUnique).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: "r1", userId: "u2" } },
      select: { role: true },
    });
  });

  it("returns null for a non-member", async () => {
    prismaMock.roomMember.findUnique.mockResolvedValueOnce(null);

    await expect(findMemberRole("r1", "stranger")).resolves.toBeNull();
  });
});

describe("listRoomsForMember (Invariant 2)", () => {
  it("queries only the user's memberships, most recently active first", async () => {
    prismaMock.roomMember.findMany.mockResolvedValueOnce([]);

    await listRoomsForMember("u1");

    const query = prismaMock.roomMember.findMany.mock.calls[0]?.[0];
    expect(query.where).toEqual({ userId: "u1" });
    expect(query.orderBy).toEqual([
      { room: { updatedAt: "desc" } },
      { room: { createdAt: "desc" } },
    ]);
    // Display fields only: no column added to Room later reaches the client by accident.
    expect(query.select.room.select).toEqual({
      id: true,
      name: true,
      language: true,
      createdAt: true,
      updatedAt: true,
    });
  });

  it("maps rows to summaries in query order, normalising the language", async () => {
    const createdAt = new Date("2026-01-01");
    const updatedAt = new Date("2026-02-01");
    prismaMock.roomMember.findMany.mockResolvedValueOnce([
      { role: "OWNER", room: { id: "r2", name: "B", language: "rust", createdAt, updatedAt } },
      {
        role: "EDITOR",
        room: { id: "r1", name: "A", language: "brainfuck", createdAt, updatedAt },
      },
    ]);

    await expect(listRoomsForMember("u1")).resolves.toEqual([
      { id: "r2", name: "B", language: "rust", role: "OWNER", createdAt, updatedAt },
      { id: "r1", name: "A", language: "javascript", role: "EDITOR", createdAt, updatedAt },
    ]);
  });
});

describe("createRoomWithOwner", () => {
  it("creates the room and its OWNER membership in one write", async () => {
    prismaMock.room.create.mockResolvedValueOnce({ id: "r9" });

    await expect(
      createRoomWithOwner({ name: "Pairing", language: "python", userId: "u1" }),
    ).resolves.toEqual({ id: "r9" });
    expect(prismaMock.room.create).toHaveBeenCalledWith({
      data: {
        name: "Pairing",
        language: "python",
        creatorId: "u1",
        members: { create: { userId: "u1", role: "OWNER" } },
      },
      select: { id: true },
    });
  });
});

describe("deleteOwnedRoom", () => {
  it("only deletes a room the user owns and returns the count", async () => {
    prismaMock.room.deleteMany.mockResolvedValueOnce({ count: 1 });

    await expect(deleteOwnedRoom("r1", "u1")).resolves.toBe(1);
    expect(prismaMock.room.deleteMany).toHaveBeenCalledWith({
      where: { id: "r1", members: { some: { userId: "u1", role: "OWNER" } } },
    });
  });

  it("returns 0 when nothing matched", async () => {
    prismaMock.room.deleteMany.mockResolvedValueOnce({ count: 0 });

    await expect(deleteOwnedRoom("r1", "u2")).resolves.toBe(0);
  });
});

describe("markRoomActive", () => {
  it("bumps updatedAt only if it is older than the activity resolution", async () => {
    const now = new Date("2026-03-01T12:00:00Z");
    prismaMock.room.updateMany.mockResolvedValueOnce({ count: 1 });

    await markRoomActive("r1", now);

    expect(prismaMock.room.updateMany).toHaveBeenCalledWith({
      where: {
        id: "r1",
        updatedAt: { lt: new Date(now.getTime() - ROOM_ACTIVITY_RESOLUTION_MS) },
      },
      data: { updatedAt: now },
    });
  });
});
