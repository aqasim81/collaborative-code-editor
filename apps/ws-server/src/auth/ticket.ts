import {
  ROOM_TICKET_AUDIENCE,
  ROOM_TICKET_TTL_SECONDS,
  type RoomTicketClaims,
} from "@collab-editor/shared";
import { jwtVerify } from "jose";
import { z } from "zod";
import type { Result } from "../result";

const claimsSchema = z.object({
  sub: z.string().min(1),
  aud: z.literal(ROOM_TICKET_AUDIENCE),
  name: z.string(),
  // Shown to everyone in the room as an image source, so only https URLs. Tickets from before avatars
  // were added carry none.
  image: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://"), "avatar must be an https URL")
    .nullable()
    .default(null),
  roomId: z.string().min(1),
  iat: z.number(),
  exp: z.number(),
});

/**
 * Verifies a room ticket issued by the web app (Invariants 1 and 2): HS256 signature, room-ticket audience, not expired,
 * no longer-lived than the ticket TTL, and issued for exactly this room.
 */
export async function verifyRoomTicket(
  token: string,
  roomId: string,
  secret: string,
): Promise<Result<RoomTicketClaims>> {
  let payload: unknown;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      audience: ROOM_TICKET_AUDIENCE,
      requiredClaims: ["sub", "iat", "exp"],
    }));
  } catch (error) {
    return { success: false, error: `invalid ticket: ${(error as Error).message}` };
  }

  const claims = claimsSchema.safeParse(payload);
  if (!claims.success) {
    return { success: false, error: "invalid ticket claims" };
  }
  if (claims.data.exp - claims.data.iat > ROOM_TICKET_TTL_SECONDS) {
    return { success: false, error: "ticket lifetime too long" };
  }
  if (claims.data.roomId !== roomId) {
    return { success: false, error: "ticket is for another room" };
  }
  return { success: true, data: claims.data };
}
