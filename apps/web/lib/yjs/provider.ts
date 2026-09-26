import {
  PRESENCE_ID_TAKEN_CLOSE_CODE,
  presenceUser,
  roomTicketProtocols,
  type SessionUser,
  SHARED_TEXT_NAME,
  TICKET_EXPIRED_CLOSE_CODE,
} from "@collab-editor/shared";
import type { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type { RoomTicketResult } from "@/actions/room-ticket";
import { setLocalUser } from "./awareness";

/** What the socket is doing, as y-websocket reports it. */
type SocketStatus = "connecting" | "connected" | "disconnected";

/** What the user is told: yellow while (re)connecting, red once retries keep failing. */
export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

/** Failed attempts in a row after which the room counts as disconnected rather than reconnecting. */
export const FAILED_ATTEMPTS_BEFORE_DISCONNECTED = 3;

export function toConnectionStatus(
  socket: SocketStatus,
  everConnected: boolean,
  failedAttempts: number,
): ConnectionStatus {
  if (socket === "connected") {
    return "connected";
  }
  if (failedAttempts >= FAILED_ATTEMPTS_BEFORE_DISCONNECTED) {
    return "disconnected";
  }
  // A dropped socket or a ticket refresh (every few minutes) reconnects at once: not worth a red light.
  return everConnected ? "reconnecting" : "connecting";
}

/** A ticket this close to expiry is replaced before the next connection attempt. */
export const TICKET_REFRESH_MARGIN_SECONDS = 30;

export interface ConnectRoomOptions {
  serverUrl: string;
  roomId: string;
  /** Who is connecting; others see the WS server's copy of it, taken from the ticket. */
  user: SessionUser;
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
  /** Presence only (cursors, who is here): never stored (Invariant 5). */
  awareness: Awareness;
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
  user,
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
  setLocalUser(provider.awareness, user);
  let expiresAt = 0;
  let destroyed = false;
  let everConnected = false;

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
    // The ticket goes in Sec-WebSocket-Protocol, never the URL (proxies log URLs); y-websocket passes
    // `protocols` to every socket it opens, including its own reconnects.
    provider.protocols = roomTicketProtocols(result.data.ticket);
    provider.connect();
  }

  provider.on("status", ({ status }: { status: SocketStatus }) => {
    if (status === "connected") {
      everConnected = true;
      // The server and the other clients may already hold this client's state at its current clock (it
      // was here before this socket), and would ignore it: re-announce it with a newer one.
      const state = provider.awareness.getLocalState();
      if (state !== null) {
        provider.awareness.setLocalState(state);
      }
    }
    onStatus?.(toConnectionStatus(status, everConnected, provider.wsUnsuccessfulReconnects));
  });
  /**
   * Moves this client to a new random client id, keeping its presence. Yjs does the same to a document
   * whose id collides; content already written under the old id is unaffected.
   */
  function takeNewClientId(): void {
    const { awareness } = provider;
    // Not the current local state: the server may have relayed the squatter's state for this id first.
    const state = { user: presenceUser(user), cursor: null };
    awareness.states.delete(awareness.clientID);
    awareness.meta.delete(awareness.clientID);
    const id = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    doc.clientID = id;
    awareness.clientID = id;
    // Twice: a new id starts at clock 0, which the server would not apply over nothing.
    awareness.setLocalState(state);
    awareness.setLocalState(state);
  }

  provider.on("connection-close", (event: CloseEvent | null) => {
    if (event?.code === PRESENCE_ID_TAKEN_CLOSE_CODE) {
      // Before y-websocket's own reconnect, which announces whatever id the client has then.
      takeNewClientId();
    }
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
    awareness: provider.awareness,
    destroy() {
      destroyed = true;
      provider.destroy();
      doc.destroy();
    },
  };
}
