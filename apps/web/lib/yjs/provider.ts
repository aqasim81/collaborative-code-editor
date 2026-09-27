import {
  PRESENCE_ID_TAKEN_CLOSE_CODE,
  presenceUser,
  ROOM_DELETED_CLOSE_CODE,
  roomTicketProtocols,
  type SessionUser,
  SHARED_TEXT_NAME,
  TICKET_EXPIRED_CLOSE_CODE,
} from "@collab-editor/shared";
import type { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import type { RoomTicketResult } from "@/actions/room-ticket";
import type { RoomJoinErrorCode } from "@/lib/room-errors";
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

/** Backoff for a ticket fetch that throws: 1 s, doubling, capped at 30 s. */
export const TICKET_RETRY_BASE_MS = 1_000;
export const TICKET_RETRY_MAX_MS = 30_000;

/**
 * Thrown ticket fetches in a row after which a reload is suggested: with the backoff above, one to two and
 * a half minutes of failures, past any blip or redeploy. Some failures repeat on every call (a tab left
 * open across a deploy calls a server action id that no longer exists) and only a reload clears them.
 */
export const TICKET_FAILURES_BEFORE_RELOAD_HINT = 8;

/**
 * Delay before retry number `attempt` (1, 2, 3…). Equal jitter keeps half the backoff and randomises the
 * rest, so tabs that lost the server together don't all come back in the same second.
 */
export function ticketRetryDelayMs(attempt: number, random: () => number = Math.random): number {
  const backoff = Math.min(TICKET_RETRY_MAX_MS, TICKET_RETRY_BASE_MS * 2 ** (attempt - 1));
  return backoff * (0.5 + random() / 2);
}

export interface ConnectRoomOptions {
  serverUrl: string;
  roomId: string;
  /** Who is connecting; others see the WS server's copy of it, taken from the ticket. */
  user: SessionUser;
  fetchTicket: (roomId: string) => Promise<RoomTicketResult>;
  onStatus?: (status: ConnectionStatus) => void;
  /** Called when the ticket is refused or the room was deleted; the connection then stays down. */
  onError?: (code: RoomJoinErrorCode) => void;
  /** Called with `true` once ticket fetches have kept throwing for a while, and with `false` once one returns. */
  onReloadHint?: (show: boolean) => void;
  /** Unix seconds; injectable for tests. */
  now?: () => number;
  /** Wait before retrying a ticket fetch that threw; injectable for tests. */
  retryDelayMs?: (attempt: number) => number;
  WebSocketPolyfill?: typeof WebSocket;
}

export interface RoomConnection {
  doc: Y.Doc;
  text: Y.Text;
  provider: WebsocketProvider;
  /** Presence only (cursors, who is here): never stored (Invariant 5). */
  awareness: Awareness;
  /** Tries again now, with a fresh ticket, instead of waiting for the next backoff. */
  retry(): void;
  destroy(): void;
}

/**
 * Connects a new Y.Doc to a room on the WS server. The server only accepts short-lived room tickets
 * (Invariant 1), so a fresh one is fetched before the first connection, after the server closes a
 * socket because its ticket expired, and before any other reconnect that would present a ticket about
 * to expire. The Y.Doc outlives every socket, so edits made in between resync on the next connection.
 * A ticket fetch that throws (network drop, redeploy, database down) is retried with backoff until it
 * succeeds or the room is left; a refused ticket is reported through `onError` and never retried.
 * After a long run of thrown fetches `onReloadHint` suggests a reload; retrying goes on meanwhile.
 * A close because the room was deleted ends it for good: no reconnect, no ticket fetch, one `onError`.
 * `retry()` skips whatever backoff is pending and tries again at once with a fresh ticket.
 */
export function connectRoom({
  serverUrl,
  roomId,
  user,
  fetchTicket,
  onStatus,
  onError,
  onReloadHint,
  now = () => Math.floor(Date.now() / 1000),
  retryDelayMs = ticketRetryDelayMs,
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
  let ticketFailures = 0;
  let fetchingTicket = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  async function connectWithFreshTicket(): Promise<void> {
    // null: the fetch threw. A server action throws in the browser only for transient trouble (network
    // drop, redeploy, database down); refusals come back as `success: false`.
    let result: RoomTicketResult | null = null;
    fetchingTicket = true;
    try {
      result = await fetchTicket(roomId);
    } catch {}
    fetchingTicket = false;
    if (destroyed) {
      return;
    }
    if (result === null) {
      // No socket exists meanwhile, so nothing else refetches.
      ticketFailures += 1;
      if (ticketFailures === TICKET_FAILURES_BEFORE_RELOAD_HINT) {
        onReloadHint?.(true);
      }
      onStatus?.(toConnectionStatus("disconnected", everConnected, ticketFailures));
      retryTimer = setTimeout(() => void connectWithFreshTicket(), retryDelayMs(ticketFailures));
      return;
    }
    // Any answer ends the failure streak: a refusal is shown through `onError` instead of the hint.
    if (ticketFailures >= TICKET_FAILURES_BEFORE_RELOAD_HINT) {
      onReloadHint?.(false);
    }
    ticketFailures = 0;
    if (!result.success) {
      onError?.(result.code);
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
    if (event?.code === ROOM_DELETED_CLOSE_CODE) {
      // Before y-websocket's own reconnect, which checks `shouldConnect` right after this event. A socket
      // was open, so no ticket fetch or retry is pending, and none will start.
      provider.shouldConnect = false;
      if (!destroyed) {
        onError?.("deleted");
      }
      return;
    }
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
    retry() {
      if (destroyed || provider.wsconnected || fetchingTicket) {
        return;
      }
      clearTimeout(retryTimer);
      // Closes any half-open socket and turns the provider's own reconnect off (its pending timer then does
      // nothing); the fresh ticket below reconnects it.
      provider.disconnect();
      // y-websocket only resets this when a socket opens: without it the new attempt would read as red.
      provider.wsUnsuccessfulReconnects = 0;
      onStatus?.(toConnectionStatus("connecting", everConnected, 0));
      void connectWithFreshTicket();
    },
    destroy() {
      destroyed = true;
      clearTimeout(retryTimer);
      provider.destroy();
      doc.destroy();
    },
  };
}
