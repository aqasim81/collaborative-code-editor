export type WsMessage =
  | { type: "join"; roomId: string }
  | { type: "leave"; roomId: string }
  | { type: "error"; message: string };
