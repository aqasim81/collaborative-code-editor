import { PURGE_TICKET_AUDIENCE, ROOM_TICKET_AUDIENCE } from "@collab-editor/shared";
import { SignJWT } from "jose";

export const TEST_SECRET = "test-ticket-secret-test-ticket-secret-00";

export interface TicketOverrides {
  sub?: string;
  name?: string;
  image?: string | null;
  roomId?: string;
  iat?: number;
  exp?: number;
  secret?: string;
  alg?: "HS256" | "HS512";
  audience?: string;
}

/** Signs `claims` like the web app, applying the overrides shared by both ticket kinds. */
function sign(
  claims: Record<string, unknown>,
  overrides: TicketOverrides,
  defaults: { audience: string; ttlSeconds: number },
): Promise<string> {
  const iat = overrides.iat ?? Math.floor(Date.now() / 1000);
  return new SignJWT({ ...claims, roomId: overrides.roomId ?? "room-1" })
    .setProtectedHeader({ alg: overrides.alg ?? "HS256" })
    .setSubject(overrides.sub ?? "user-1")
    .setAudience(overrides.audience ?? defaults.audience)
    .setIssuedAt(iat)
    .setExpirationTime(overrides.exp ?? iat + defaults.ttlSeconds)
    .sign(new TextEncoder().encode(overrides.secret ?? TEST_SECRET));
}

/** Signs a room ticket the way the web app does, with optional overrides for negative cases. */
export function signTicket(overrides: TicketOverrides = {}): Promise<string> {
  return sign(
    {
      name: overrides.name ?? "Ada",
      image: overrides.image === undefined ? null : overrides.image,
    },
    overrides,
    { audience: ROOM_TICKET_AUDIENCE, ttlSeconds: 300 },
  );
}

export type PurgeTicketOverrides = Omit<TicketOverrides, "name" | "image">;

/** Signs a purge ticket the way the web app does after deleting a room. */
export function signPurgeTicket(overrides: PurgeTicketOverrides = {}): Promise<string> {
  return sign({}, overrides, { audience: PURGE_TICKET_AUDIENCE, ttlSeconds: 60 });
}
