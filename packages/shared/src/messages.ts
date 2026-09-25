/** JSON text messages a client may send to the WS server. Binary frames are reserved for Yjs sync. */
export type ClientMessage = { type: "ping" };

/** JSON text messages the WS server sends to a client. */
export type ServerMessage = { type: "pong" } | { type: "error"; message: string };
