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
  /** Avatar URL, shown to the other people in the room. */
  image: string | null;
  roomId: string;
  iat: number;
  exp: number;
}

/**
 * WebSocket close code the WS server sends when a connection's room ticket expires. Clients treat it as
 * "fetch a fresh ticket and reconnect"; a user no longer in the room is refused that ticket.
 */
export const TICKET_EXPIRED_CLOSE_CODE = 4001;

/**
 * WebSocket close code for a connection whose first presence uses an awareness client id another user
 * holds in the room (a collision, or someone squatting it after a server restart). Clients take a new
 * client id and reconnect.
 */
export const PRESENCE_ID_TAKEN_CLOSE_CODE = 4002;

/**
 * WebSocket subprotocol every room connection offers, and the only one the WS server ever selects, so
 * the handshake response never echoes the ticket.
 */
export const ROOM_PROTOCOL = "collab.v1";

/** Prefix of the subprotocol that carries the room ticket (a JWT is a valid subprotocol token). */
export const TICKET_PROTOCOL_PREFIX = "ticket.";

/**
 * The subprotocols a client offers to join a room: the room protocol and the ticket. The ticket travels
 * in `Sec-WebSocket-Protocol` rather than the URL, which reverse proxies commonly log.
 */
export function roomTicketProtocols(ticket: string): string[] {
  return [ROOM_PROTOCOL, `${TICKET_PROTOCOL_PREFIX}${ticket}`];
}

/**
 * WebSocket close code the WS server sends to every connection of a room that was deleted. The room is
 * gone for good: clients must not reconnect.
 */
export const ROOM_DELETED_CLOSE_CODE = 4003;

/** Lifetime of a purge ticket. The WS server rejects tickets that claim a longer one. */
export const PURGE_TICKET_TTL_SECONDS = 60;

/** `aud` claim that marks a JWT as a purge ticket, so a room ticket can't be used as one (or vice versa). */
export const PURGE_TICKET_AUDIENCE = "collab-editor:ws-admin";

/**
 * Claims of the short-lived HS256 ticket the web app signs after deleting a room, so the WS server
 * purges the room's document. Sent as `Authorization: Bearer` on `DELETE /rooms/<id>`.
 */
export interface PurgeTicketClaims {
  /** The owner who deleted the room, for the log. */
  sub: string;
  aud: string;
  roomId: string;
  iat: number;
  exp: number;
}

/** Prefix of the WS server's HTTP path that purges a room's document (`DELETE /rooms/<id>`). */
export const ROOM_PURGE_PATH_PREFIX = "/rooms/";

/** The WS server's HTTP path that purges a room's document. */
export function roomPurgePath(roomId: string): string {
  return `${ROOM_PURGE_PATH_PREFIX}${roomId}`;
}
