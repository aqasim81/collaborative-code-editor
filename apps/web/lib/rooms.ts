import type { Room } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Returns the room only when the user is a member of it (Invariant 2). A room that
 * doesn't exist and a room the user can't access look the same to the caller.
 */
export function findRoomForMember(roomId: string, userId: string): Promise<Room | null> {
  return prisma.room.findFirst({
    where: { id: roomId, members: { some: { userId } } },
  });
}
