/** Lifetime of a room ticket. The WS server rejects tickets that claim a longer one. */
export const ROOM_TICKET_TTL_SECONDS = 300;

/** `aud` claim that marks a JWT as a room ticket, so no other token signed with the secret passes. */
export const ROOM_TICKET_AUDIENCE = "collab-editor:ws-room";

/**
 * Claims of the short-lived HS256 ticket the web app issues after checking room membership.
 * The WS server verifies it on upgrade (Invariants 1 and 2) without touching the database.
 */
export interface RoomTicketClaims {
  /** User id. */
  sub: string;
  aud: string;
  name: string;
  roomId: string;
  iat: number;
  exp: number;
}
