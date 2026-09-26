export { SHARED_TEXT_NAME } from "./document";
export type { ClientMessage, ServerMessage } from "./messages";
export { PRESENCE_COLORS, type PresenceUser, presenceUser, userColor } from "./presence";
export type { RoomInfo } from "./room";
export {
  PRESENCE_ID_TAKEN_CLOSE_CODE,
  ROOM_PROTOCOL,
  ROOM_TICKET_AUDIENCE,
  ROOM_TICKET_TTL_SECONDS,
  type RoomTicketClaims,
  roomTicketProtocols,
  TICKET_EXPIRED_CLOSE_CODE,
  TICKET_PROTOCOL_PREFIX,
} from "./ticket";
export type { AuthTokenClaims, SessionUser } from "./user";
