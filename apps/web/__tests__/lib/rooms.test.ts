import { describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: { room: { findFirst } } }));

import { findRoomForMember } from "@/lib/rooms";

describe("findRoomForMember (Invariant 2)", () => {
  it("only matches the room when the user is a member", async () => {
    const room = { id: "r1", name: "Room", language: "go", creatorId: "u1" };
    findFirst.mockResolvedValueOnce(room);

    await expect(findRoomForMember("r1", "u2")).resolves.toBe(room);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "r1", members: { some: { userId: "u2" } } },
    });
  });

  it("returns null when there is no membership row", async () => {
    findFirst.mockResolvedValueOnce(null);

    await expect(findRoomForMember("r1", "stranger")).resolves.toBeNull();
  });
});
