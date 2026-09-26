import { TICKET_EXPIRED_CLOSE_CODE } from "@collab-editor/shared";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type { RoomTicketResult } from "@/actions/room-ticket";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/** Name of the shared text every client binds its editor to. */
export const SHARED_TEXT_NAME = "codemirror";

/** A ticket this close to expiry is replaced before the next connection attempt. */
export const TICKET_REFRESH_MARGIN_SECONDS = 30;

export interface ConnectRoomOptions {
  serverUrl: string;
  roomId: string;
  fetchTicket: (roomId: string) => Promise<RoomTicketResult>;
  onStatus?: (status: ConnectionStatus) => void;
  /** Called when no ticket can be obtained; the connection then stays down. */
  onError?: (message: string) => void;
  /** Unix seconds; injectable for tests. */
  now?: () => number;
  WebSocketPolyfill?: typeof WebSocket;
}

export interface RoomConnection {
  doc: Y.Doc;
  text: Y.Text;
  provider: WebsocketProvider;
  destroy(): void;
}

/**
 * Connects a new Y.Doc to a room on the WS server. The server only accepts short-lived room tickets
 * (Invariant 1), so a fresh one is fetched before the first connection, after the server closes a
 * socket because its ticket expired, and before any other reconnect that would present a ticket about
 * to expire. The Y.Doc outlives every socket, so edits made in between resync on the next connection.
 */
export function connectRoom({
  serverUrl,
  roomId,
  fetchTicket,
  onStatus,
  onError,
  now = () => Math.floor(Date.now() / 1000),
  WebSocketPolyfill,
}: ConnectRoomOptions): RoomConnection {
  const doc = new Y.Doc();
  const provider = new WebsocketProvider(serverUrl, roomId, doc, {
    connect: false,
    // Every edit goes through the server, where it is validated and persisted.
    disableBc: true,
    ...(WebSocketPolyfill ? { WebSocketPolyfill } : {}),
  });
  let expiresAt = 0;
  let destroyed = false;

  async function connectWithFreshTicket(): Promise<void> {
    let result: RoomTicketResult;
    try {
      result = await fetchTicket(roomId);
    } catch {
      // A server action can throw in the browser (network drop, redeploy); report it rather than stall.
      result = { success: false, error: "Could not get a room ticket" };
    }
    if (destroyed) {
      return;
    }
    if (!result.success) {
      onError?.(result.error);
      return;
    }
    expiresAt = result.data.expiresAt;
    provider.params = { ticket: result.data.ticket };
    provider.connect();
  }

  provider.on("status", ({ status }: { status: ConnectionStatus }) => onStatus?.(status));
  provider.on("connection-close", (event: CloseEvent | null) => {
    // The server's clock decides expiry, so its close code wins over the expiry this client last saw.
    const expired =
      event?.code === TICKET_EXPIRED_CLOSE_CODE ||
      expiresAt - now() <= TICKET_REFRESH_MARGIN_SECONDS;
    if (destroyed || !provider.shouldConnect || !expired) {
      return;
    }
    // Stop the provider's own reconnect with the stale ticket; reconnect once a new one arrives.
    provider.shouldConnect = false;
    void connectWithFreshTicket();
  });

  void connectWithFreshTicket();

  return {
    doc,
    text: doc.getText(SHARED_TEXT_NAME),
    provider,
    destroy() {
      destroyed = true;
      provider.destroy();
      doc.destroy();
    },
  };
}
