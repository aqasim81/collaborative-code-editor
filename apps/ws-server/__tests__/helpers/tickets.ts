import { ROOM_TICKET_AUDIENCE } from "@collab-editor/shared";
import { SignJWT } from "jose";

export const TEST_SECRET = "test-ticket-secret-test-ticket-secret-00";

interface TicketOverrides {
  sub?: string;
  name?: string;
  roomId?: string;
  iat?: number;
  exp?: number;
  secret?: string;
  alg?: "HS256" | "HS512";
  audience?: string;
}

/** Signs a ticket the way the web app does, with optional overrides for negative cases. */
export function signTicket(overrides: TicketOverrides = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const iat = overrides.iat ?? now;
  return new SignJWT({ name: overrides.name ?? "Ada", roomId: overrides.roomId ?? "room-1" })
    .setProtectedHeader({ alg: overrides.alg ?? "HS256" })
    .setSubject(overrides.sub ?? "user-1")
    .setAudience(overrides.audience ?? ROOM_TICKET_AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(overrides.exp ?? iat + 300)
    .sign(new TextEncoder().encode(overrides.secret ?? TEST_SECRET));
}
