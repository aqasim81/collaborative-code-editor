import {
  PURGE_TICKET_AUDIENCE,
  PURGE_TICKET_TTL_SECONDS,
  type PurgeTicketClaims,
  ROOM_TICKET_AUDIENCE,
  ROOM_TICKET_TTL_SECONDS,
  type RoomTicketClaims,
} from "@collab-editor/shared";
import { jwtVerify } from "jose";
import { z } from "zod";
import type { Result } from "../result";

const baseClaimsSchema = z.object({
  sub: z.string().min(1),
  roomId: z.string().min(1),
  iat: z.number(),
  exp: z.number(),
});

const roomClaimsSchema = baseClaimsSchema.extend({
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
});

const purgeClaimsSchema = baseClaimsSchema.extend({ aud: z.literal(PURGE_TICKET_AUDIENCE) });

interface TicketKind<T> {
  audience: string;
  ttlSeconds: number;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
}

/**
 * HS256 signature, the kind's audience (so one kind of ticket never passes as another), not expired, no
 * longer-lived than the kind's TTL, and issued for exactly this room.
 */
async function verifyTicket<T extends z.infer<typeof baseClaimsSchema>>(
  token: string,
  roomId: string,
  secret: string,
  kind: TicketKind<T>,
): Promise<Result<T>> {
  let payload: unknown;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
      audience: kind.audience,
      requiredClaims: ["sub", "iat", "exp"],
    }));
  } catch (error) {
    return { success: false, error: `invalid ticket: ${(error as Error).message}` };
  }

  const claims = kind.schema.safeParse(payload);
  if (!claims.success) {
    return { success: false, error: "invalid ticket claims" };
  }
  if (claims.data.exp - claims.data.iat > kind.ttlSeconds) {
    return { success: false, error: "ticket lifetime too long" };
  }
  if (claims.data.roomId !== roomId) {
    return { success: false, error: "ticket is for another room" };
  }
  return { success: true, data: claims.data };
}

/** Verifies a room ticket issued by the web app after a membership check (Invariants 1 and 2). */
export function verifyRoomTicket(
  token: string,
  roomId: string,
  secret: string,
): Promise<Result<RoomTicketClaims>> {
  return verifyTicket(token, roomId, secret, {
    audience: ROOM_TICKET_AUDIENCE,
    ttlSeconds: ROOM_TICKET_TTL_SECONDS,
    schema: roomClaimsSchema,
  });
}

/** Verifies a purge ticket the web app signs after deleting the room (Invariants 1 and 2). */
export function verifyPurgeTicket(
  token: string,
  roomId: string,
  secret: string,
): Promise<Result<PurgeTicketClaims>> {
  return verifyTicket(token, roomId, secret, {
    audience: PURGE_TICKET_AUDIENCE,
    ttlSeconds: PURGE_TICKET_TTL_SECONDS,
    schema: purgeClaimsSchema,
  });
}
