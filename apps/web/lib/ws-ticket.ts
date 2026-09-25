import { ROOM_TICKET_AUDIENCE, ROOM_TICKET_TTL_SECONDS } from "@collab-editor/shared";
import { SignJWT } from "jose";

export interface RoomTicketSubject {
  userId: string;
  name: string;
  roomId: string;
}

export interface RoomTicket {
  ticket: string;
  /** Unix seconds. */
  expiresAt: number;
}

/**
 * Signs the HS256 room ticket the WS server verifies on upgrade. Only call this after checking that
 * the user is a member of the room (Invariant 2): the ticket is what the WS server trusts.
 */
export async function signRoomTicket(
  subject: RoomTicketSubject,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<RoomTicket> {
  const expiresAt = nowSeconds + ROOM_TICKET_TTL_SECONDS;
  const ticket = await new SignJWT({ name: subject.name, roomId: subject.roomId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(subject.userId)
    .setAudience(ROOM_TICKET_AUDIENCE)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(secret));
  return { ticket, expiresAt };
}
