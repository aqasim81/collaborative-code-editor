import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  room: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  },
  roomMember: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
  roomPurge: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { inviteTokenSchema } from "@/lib/invite";
import {
  addEditorMember,
  createRoomWithOwner,
  deleteOwnedRoom,
  findMemberRole,
  findMembership,
  findRoomByInviteToken,
  findRoomForMember,
  listRoomsForMember,
  markRoomActive,
  ROOM_ACTIVITY_RESOLUTION_MS,
  rotateInviteToken,
} from "@/lib/rooms";

const room = { id: "r1", name: "Room", language: "go", creatorId: "u1" };

beforeEach(() => {
  vi.clearAllMocks();
  // Run interactive transactions against the same mock client.
  prismaMock.$transaction.mockImplementation((run: (tx: typeof prismaMock) => unknown) =>
    run(prismaMock),
  );
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

describe("findMembership (Invariant 2)", () => {
  it("returns the user's own membership row with its room", async () => {
    const membership = { role: "OWNER", room };
    prismaMock.roomMember.findUnique.mockResolvedValueOnce(membership);

    await expect(findMembership("r1", "u1")).resolves.toBe(membership);
    expect(prismaMock.roomMember.findUnique).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: "r1", userId: "u1" } },
      select: { role: true, room: true },
    });
  });

  it("returns null for a non-member", async () => {
    prismaMock.roomMember.findUnique.mockResolvedValueOnce(null);

    await expect(findMembership("r1", "stranger")).resolves.toBeNull();
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
  it("creates the room, its invite token and its OWNER membership in one write", async () => {
    prismaMock.room.create.mockResolvedValueOnce({ id: "r9" });

    await expect(
      createRoomWithOwner({ name: "Pairing", language: "python", userId: "u1" }),
    ).resolves.toEqual({ id: "r9" });
    expect(prismaMock.room.create).toHaveBeenCalledWith({
      data: {
        name: "Pairing",
        language: "python",
        creatorId: "u1",
        inviteToken: expect.any(String),
        members: { create: { userId: "u1", role: "OWNER" } },
      },
      select: { id: true },
    });
    const { inviteToken } = prismaMock.room.create.mock.calls[0]?.[0]?.data ?? {};
    expect(inviteTokenSchema.safeParse(inviteToken).success).toBe(true);
  });

  it("gives every room its own token", async () => {
    prismaMock.room.create.mockResolvedValue({ id: "r9" });

    await createRoomWithOwner({ name: "A", language: "go", userId: "u1" });
    await createRoomWithOwner({ name: "B", language: "go", userId: "u1" });

    const [first, second] = prismaMock.room.create.mock.calls.map(
      ([args]) => args.data.inviteToken,
    );
    expect(first).not.toBe(second);
  });
});

describe("findRoomByInviteToken", () => {
  it("looks the room up by its unique token and selects only what the invite page shows", async () => {
    const found = { id: "r1", name: "Room", creator: { name: "Ada" } };
    prismaMock.room.findUnique.mockResolvedValueOnce(found);

    await expect(findRoomByInviteToken("tok")).resolves.toBe(found);
    expect(prismaMock.room.findUnique).toHaveBeenCalledWith({
      where: { inviteToken: "tok" },
      select: { id: true, name: true, creator: { select: { name: true } } },
    });
  });

  it("returns null for an unknown token", async () => {
    prismaMock.room.findUnique.mockResolvedValueOnce(null);

    await expect(findRoomByInviteToken("nope")).resolves.toBeNull();
  });
});

describe("addEditorMember", () => {
  it("creates an EDITOR membership and leaves an existing one (even an OWNER's) untouched", async () => {
    prismaMock.roomMember.upsert.mockResolvedValueOnce({});

    await addEditorMember("r1", "u2");
    expect(prismaMock.roomMember.upsert).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: "r1", userId: "u2" } },
      update: {},
      create: { roomId: "r1", userId: "u2", role: "EDITOR" },
    });
  });
});

describe("rotateInviteToken", () => {
  it("replaces the token only on a room the user owns and returns the new one", async () => {
    prismaMock.room.updateMany.mockResolvedValueOnce({ count: 1 });

    const token = await rotateInviteToken("r1", "u1");

    expect(inviteTokenSchema.safeParse(token).success).toBe(true);
    expect(prismaMock.room.updateMany).toHaveBeenCalledWith({
      where: { id: "r1", members: { some: { userId: "u1", role: "OWNER" } } },
      data: { inviteToken: token },
    });
  });

  it("returns null when the user doesn't own the room", async () => {
    prismaMock.room.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(rotateInviteToken("r1", "u2")).resolves.toBeNull();
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

  it("queues the room's document purge in the same transaction (#48)", async () => {
    prismaMock.room.deleteMany.mockResolvedValueOnce({ count: 1 });

    await deleteOwnedRoom("r1", "u1");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.roomPurge.create).toHaveBeenCalledWith({
      data: { roomId: "r1", userId: "u1" },
    });
  });

  it("returns 0 and queues nothing when nothing matched", async () => {
    prismaMock.room.deleteMany.mockResolvedValueOnce({ count: 0 });

    await expect(deleteOwnedRoom("r1", "u2")).resolves.toBe(0);
    expect(prismaMock.roomPurge.create).not.toHaveBeenCalled();
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
