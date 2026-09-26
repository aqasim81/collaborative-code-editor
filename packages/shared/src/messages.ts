/** JSON text messages a client may send to the WS server. Binary frames carry the Yjs sync protocol. */
export type ClientMessage = { type: "ping" };

/** JSON text messages the WS server sends to a client. */
export type ServerMessage = { type: "pong" } | { type: "error"; message: string };
