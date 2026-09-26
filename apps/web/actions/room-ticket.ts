"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { env } from "@/lib/env";
import { findRoomForMember } from "@/lib/rooms";
import { type RoomTicket, signRoomTicket } from "@/lib/ws-ticket";

export type RoomTicketResult =
  | { success: true; data: RoomTicket }
  | { success: false; error: string };

const roomIdSchema = z.string().min(1).max(64);

/**
 * Issues a short-lived ticket for joining a room on the WS server. Membership is checked here, so the
 * WS server never needs the database (Invariants 1 and 2).
 */
export async function getRoomTicket(roomId: unknown): Promise<RoomTicketResult> {
  const parsed = roomIdSchema.safeParse(roomId);
  if (!parsed.success) {
    return { success: false, error: "Invalid room id" };
  }

  const user = toSessionUser(await auth());
  if (!user) {
    return { success: false, error: "Not signed in" };
  }

  // A missing room and a room the user can't access look the same.
  const room = await findRoomForMember(parsed.data, user.id);
  if (!room) {
    return { success: false, error: "Room not found" };
  }

  const data = await signRoomTicket(
    { userId: user.id, name: user.name, image: user.image, roomId: room.id },
    env.WS_TICKET_SECRET,
  );
  return { success: true, data };
}
