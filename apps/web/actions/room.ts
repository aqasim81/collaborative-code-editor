"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { NOT_SIGNED_IN, type Result } from "@/lib/result";
import { createRoomSchema, INVALID_ROOM_ID, ROOM_NOT_FOUND, roomIdSchema } from "@/lib/room-input";
import { maybeSweepRoomPurges, sweepRoomPurges } from "@/lib/room-purge";
import {
  createRoomWithOwner,
  deleteOwnedRoom,
  findMemberRole,
  listRoomsForMember,
  type RoomSummary,
} from "@/lib/rooms";
import { DASHBOARD_PATH } from "@/lib/routes";

/** Creates a room owned by the signed-in user. */
export async function createRoom(input: unknown): Promise<Result<{ id: string }>> {
  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid room" };
  }

  const user = toSessionUser(await auth());
  if (!user) {
    return { success: false, error: NOT_SIGNED_IN };
  }

  try {
    const room = await createRoomWithOwner({ ...parsed.data, userId: user.id });
    revalidatePath(DASHBOARD_PATH);
    return { success: true, data: room };
  } catch {
    return { success: false, error: "Could not create the room. Try again." };
  }
}

/**
 * Rooms the signed-in user is a member of, most recently active first (Invariant 2). Dashboard loads
 * also retry due room purges (#48), at most once a minute.
 */
export async function listRooms(): Promise<Result<RoomSummary[]>> {
  const user = toSessionUser(await auth());
  if (!user) {
    return { success: false, error: NOT_SIGNED_IN };
  }

  after(() => maybeSweepRoomPurges());
  try {
    return { success: true, data: await listRoomsForMember(user.id) };
  } catch {
    return { success: false, error: "Could not load your rooms. Try again." };
  }
}

/**
 * Deletes a room the signed-in user owns. A non-member gets the same answer as for a missing room;
 * an editor is told that only the owner can delete it. After the response, the room's WS-server
 * document is purged through the outbox (#48); the answer never depends on it.
 */
export async function deleteRoom(roomId: unknown): Promise<Result<{ id: string }>> {
  const parsed = roomIdSchema.safeParse(roomId);
  if (!parsed.success) {
    return { success: false, error: INVALID_ROOM_ID };
  }

  const user = toSessionUser(await auth());
  if (!user) {
    return { success: false, error: NOT_SIGNED_IN };
  }

  try {
    // The delete itself is scoped to ownership; the role is only looked up to explain a refusal.
    if ((await deleteOwnedRoom(parsed.data, user.id)) === 0) {
      const role = await findMemberRole(parsed.data, user.id);
      return {
        success: false,
        error: role === null ? ROOM_NOT_FOUND : "Only the room's owner can delete it",
      };
    }
    after(() => sweepRoomPurges());
    revalidatePath(DASHBOARD_PATH);
    return { success: true, data: { id: parsed.data } };
  } catch {
    return { success: false, error: "Could not delete the room. Try again." };
  }
}
