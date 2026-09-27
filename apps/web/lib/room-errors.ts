// Why a room can't be joined, and what the user is told. No imports, so client code can use it.

/** A refusal the room stays down on: shown with a way forward, never retried. */
export type RoomJoinErrorCode = "invalid_room" | "unauthenticated" | "not_found" | "deleted";

interface RoomErrorCopy {
  title: string;
  body: string;
  action: "dashboard" | "sign-in";
}

// `not_found` covers both a missing room and a non-member, in one message that tells them apart for
// nobody (Invariant 2).
export const ROOM_ERROR_COPY: Record<RoomJoinErrorCode, RoomErrorCopy> = {
  invalid_room: {
    title: "This room link isn't valid",
    body: "Check the link, or open one of your rooms from the dashboard.",
    action: "dashboard",
  },
  not_found: {
    title: "You can't join this room",
    body: "It doesn't exist or you don't have access. Ask its owner for an invite link.",
    action: "dashboard",
  },
  unauthenticated: {
    title: "You've been signed out",
    body: "Sign in again to rejoin this room.",
    action: "sign-in",
  },
  deleted: {
    title: "This room was deleted",
    body: "Its owner deleted it, so it can no longer be edited.",
    action: "dashboard",
  },
};

/** Shown while the WS server can't be reached: the room keeps retrying by itself. */
export const SERVER_UNREACHABLE_COPY = {
  title: "Can't reach the collaboration server",
  body: "Your edits stay in this tab and sync when it's back. Retrying automatically.",
} as const;
