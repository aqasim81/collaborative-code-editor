import {
  PURGE_TICKET_AUDIENCE,
  PURGE_TICKET_TTL_SECONDS,
  ROOM_TICKET_AUDIENCE,
  ROOM_TICKET_TTL_SECONDS,
} from "@collab-editor/shared";
import { SignJWT } from "jose";

export interface RoomTicketSubject {
  userId: string;
  name: string;
  /** Avatar URL; the WS server accepts only https ones, so anything else is left out. */
  image: string | null;
  roomId: string;
}

export interface RoomTicket {
  ticket: string;
  /** Unix seconds. */
  expiresAt: number;
}

/** Signs an HS256 ticket of one kind (audience and lifetime) for the WS server. */
function signTicket(
  claims: Record<string, unknown>,
  { userId, audience, ttlSeconds }: { userId: string; audience: string; ttlSeconds: number },
  secret: string,
  nowSeconds: number,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setAudience(audience)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + ttlSeconds)
    .sign(new TextEncoder().encode(secret));
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
  const image = subject.image?.startsWith("https://") ? subject.image : null;
  const ticket = await signTicket(
    { name: subject.name, image, roomId: subject.roomId },
    { userId: subject.userId, audience: ROOM_TICKET_AUDIENCE, ttlSeconds: ROOM_TICKET_TTL_SECONDS },
    secret,
    nowSeconds,
  );
  return { ticket, expiresAt: nowSeconds + ROOM_TICKET_TTL_SECONDS };
}

/**
 * Signs the HS256 purge ticket the WS server verifies on `DELETE /rooms/<id>`. Only call this for a room
 * that was deleted (Invariant 2): the ticket makes the WS server close the room and drop its document.
 */
export function signPurgeTicket(
  subject: { userId: string; roomId: string },
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  return signTicket(
    { roomId: subject.roomId },
    {
      userId: subject.userId,
      audience: PURGE_TICKET_AUDIENCE,
      ttlSeconds: PURGE_TICKET_TTL_SECONDS,
    },
    secret,
    nowSeconds,
  );
}
