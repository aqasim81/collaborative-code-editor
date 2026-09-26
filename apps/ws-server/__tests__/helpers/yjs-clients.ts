import { roomTicketProtocols } from "@collab-editor/shared";
import { WebSocket } from "ws";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { waitFor } from "./sockets";
import { signTicket } from "./tickets";

export interface YClient {
  doc: Y.Doc;
  text: Y.Text;
  provider: WebsocketProvider;
  destroy(): void;
}

/**
 * A browser-equivalent Yjs client: y-websocket's provider over `ws`, with a ticket for the room. Pass a
 * `doc` that already holds content to model a client whose first sync uploads it.
 */
export async function connectYClient(
  port: number,
  roomId = "room-1",
  doc = new Y.Doc(),
): Promise<YClient> {
  const provider = new WebsocketProvider(`ws://127.0.0.1:${port}`, roomId, doc, {
    protocols: roomTicketProtocols(await signTicket({ roomId })),
    WebSocketPolyfill: WebSocket as unknown as typeof globalThis.WebSocket,
    disableBc: true,
  });
  return {
    doc,
    text: doc.getText("codemirror"),
    provider,
    destroy() {
      provider.destroy();
      doc.destroy();
    },
  };
}

export function synced(client: YClient): Promise<void> {
  return waitFor(() => client.provider.synced, 5_000);
}
