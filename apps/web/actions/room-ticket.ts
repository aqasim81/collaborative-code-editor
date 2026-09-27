"use server";

import { after } from "next/server";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { env } from "@/lib/env";
import { NOT_SIGNED_IN, type Result } from "@/lib/result";
import { INVALID_ROOM_ID, ROOM_NOT_FOUND, roomIdSchema } from "@/lib/room-input";
import { findRoomForMember, markRoomActive } from "@/lib/rooms";
import { type RoomTicket, signRoomTicket } from "@/lib/ws-ticket";

export type RoomTicketResult = Result<RoomTicket>;

/**
 * Issues a short-lived ticket for joining a room on the WS server. Membership is checked here, so the
 * WS server never needs the database (Invariants 1 and 2).
 */
export async function getRoomTicket(roomId: unknown): Promise<RoomTicketResult> {
  const parsed = roomIdSchema.safeParse(roomId);
  if (!parsed.success) {
    return { success: false, error: INVALID_ROOM_ID };
  }

  const user = toSessionUser(await auth());
  if (!user) {
    return { success: false, error: NOT_SIGNED_IN };
  }

  const room = await findRoomForMember(parsed.data, user.id);
  if (!room) {
    return { success: false, error: ROOM_NOT_FOUND };
  }

  // Every connected client fetches a ticket at connect and before expiry, which is what makes
  // `updatedAt` track activity. Recorded after the response, so it never delays or costs a ticket.
  after(() => markRoomActive(room.id));

  const data = await signRoomTicket(
    { userId: user.id, name: user.name, image: user.image, roomId: room.id },
    env.WS_TICKET_SECRET,
  );
  return { success: true, data };
}
