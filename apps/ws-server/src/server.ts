import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { Duplex } from "node:stream";
import {
  ROOM_TICKET_TTL_SECONDS,
  type RoomTicketClaims,
  type ServerMessage,
  TICKET_EXPIRED_CLOSE_CODE,
} from "@collab-editor/shared";
import { WebSocket, WebSocketServer } from "ws";
import { verifyRoomTicket } from "./auth/ticket";
import { parseClientMessage } from "./handlers/messages";
import type { Logger } from "./logger";
import type { DocumentStore } from "./persistence/document-store";
import {
  createRateLimiter,
  DEFAULT_BYTE_RATE_LIMIT,
  DEFAULT_MAX_PAYLOAD_BYTES,
  DEFAULT_RATE_LIMIT,
  type RateLimitOptions,
} from "./rate-limit";
import type { Result } from "./result";
import { createRoomManager, type RoomManager } from "./rooms/room-manager";
import { parseSyncMessage } from "./sync/protocol";
import {
  createSyncRoom,
  INVALID_MESSAGE_CLOSE_CODE,
  type Peer,
  type SyncRoom,
} from "./sync/sync-room";

export interface ServerOptions {
  port: number;
  host?: string;
  ticketSecret: string;
  roomGracePeriodMs: number;
  logger: Logger;
  /** Where room documents are persisted. The server owns it from here on and closes it on shutdown. */
  store: DocumentStore;
  /** Inbound messages per connection. */
  rateLimit?: RateLimitOptions;
  /** Inbound bytes per connection; its capacity should be at least `maxPayloadBytes`. */
  byteRateLimit?: RateLimitOptions;
  maxPayloadBytes?: number;
  /** How long shutdown waits for a client's close handshake before terminating it. */
  shutdownTimeoutMs?: number;
}

export interface HealthStats {
  status: "ok";
  rooms: number;
  connections: number;
}

export interface RunningServer {
  port: number;
  rooms: RoomManager<Peer, SyncRoom>;
  stats(): HealthStats;
  /**
   * Graceful shutdown: closes every connection (1001), waits for every room's pending writes, closes the
   * document store and stops listening.
   */
  close(): Promise<void>;
}

// Room ids are cuids today; allow the URL-safe alphabet and nothing that needs decoding.
const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 5_000;

/** Parses a request target; null for one a client malformed on purpose (e.g. `http://[`). */
function parseRequestUrl(url: string | undefined): URL | null {
  const target = url ?? "/";
  return URL.canParse(target, "http://localhost") ? new URL(target, "http://localhost") : null;
}

/** Parses `/<roomId>?ticket=<jwt>`, the URL shape y-websocket's provider produces. */
function parseUpgradeUrl(url: string | undefined): { roomId: string; ticket: string } | null {
  const parsed = parseRequestUrl(url);
  if (!parsed) {
    return null;
  }
  const roomId = parsed.pathname.slice(1);
  const ticket = parsed.searchParams.get("ticket");
  if (!ROOM_ID_PATTERN.test(roomId) || !ticket) {
    return null;
  }
  return { roomId, ticket };
}

function rejectUpgrade(socket: Duplex, status: 401 | 503): void {
  const reason = status === 401 ? "Unauthorized" : "Service Unavailable";
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export async function startServer(options: ServerOptions): Promise<Result<RunningServer>> {
  const { logger, ticketSecret, store } = options;
  const rateLimit = options.rateLimit ?? DEFAULT_RATE_LIMIT;
  const byteRateLimit = options.byteRateLimit ?? DEFAULT_BYTE_RATE_LIMIT;
  const maxPayload = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  // A smaller byte budget would refuse every frame between the two sizes, including large first syncs.
  if (byteRateLimit.capacity < maxPayload) {
    return {
      success: false,
      error: `byte budget capacity (${byteRateLimit.capacity}) is below the frame cap (${maxPayload})`,
    };
  }
  const shutdownTimeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
  const rooms: RoomManager<Peer, SyncRoom> = createRoomManager<Peer, SyncRoom>({
    gracePeriodMs: options.roomGracePeriodMs,
    logger,
    createState: (roomId, previous) =>
      createSyncRoom({ roomId, store, logger, previous, onFailure: () => rooms.evict(roomId) }),
    destroyState: (room) => room.destroy(),
  });
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload,
  });
  let closing = false;

  const stats = (): HealthStats => ({
    status: "ok",
    rooms: rooms.roomCount(),
    connections: rooms.connectionCount(),
  });

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const found = req.method === "GET" && parseRequestUrl(req.url)?.pathname === "/health";
    res.writeHead(found ? 200 : 404, { "Content-Type": "application/json" });
    res.end(JSON.stringify(found ? stats() : { error: "not found" }));
  });

  function onConnection(ws: WebSocket, claims: RoomTicketClaims): void {
    const { roomId, sub: userId } = claims;
    const log = logger.child({ roomId, userId });
    const peer: Peer = {
      send(data) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      },
      close: (code, reason) => ws.close(code, reason),
    };
    // Keep this instance: if the room is evicted, a later one with the same id is a different room.
    const room = rooms.join(roomId, peer);
    room.state.addPeer(peer);
    log.info("client joined");

    // A socket lives no longer than its ticket, so a member removed from the room loses access within
    // one ticket lifetime: the client must fetch a fresh ticket to reconnect. `exp` comes from the web
    // app's clock, so the delay is also capped at the ticket TTL in case that clock runs ahead.
    const expiresInMs = Math.min(ROOM_TICKET_TTL_SECONDS * 1000, claims.exp * 1000 - Date.now());
    const expiryTimer = setTimeout(
      () => {
        log.info("ticket expired, closing connection");
        ws.close(TICKET_EXPIRED_CLOSE_CODE, "ticket expired");
      },
      Math.max(0, expiresInMs),
    );

    const limiter = createRateLimiter(rateLimit);
    const byteLimiter = createRateLimiter(byteRateLimit);
    ws.on("message", (raw, isBinary) => {
      // Once a limiter (or anything else) has started closing, frames still in flight are dropped.
      if (ws.readyState !== WebSocket.OPEN) {
        return;
      }
      // binaryType is the default "nodebuffer", so every frame arrives as a Buffer.
      const data = raw as Buffer;
      if (!limiter.tryConsume()) {
        log.warn("rate limit exceeded, closing connection");
        ws.close(1008, "rate limit exceeded");
        return;
      }
      if (!byteLimiter.tryConsume(data.length)) {
        log.warn({ bytes: data.length }, "byte budget exceeded, closing connection");
        ws.close(1008, "byte budget exceeded");
        return;
      }
      if (isBinary) {
        const sync = parseSyncMessage(data);
        if (!sync.success) {
          log.debug({ reason: sync.error }, "sync message rejected");
          ws.close(INVALID_MESSAGE_CLOSE_CODE, "invalid sync message");
          return;
        }
        room.state.handle(peer, sync.data);
        return;
      }
      const message = parseClientMessage(data);
      if (!message.success) {
        log.debug({ reason: message.error }, "message rejected");
        send(ws, { type: "error", message: message.error });
        return;
      }
      if (message.data.type === "ping") {
        send(ws, { type: "pong" });
      }
    });
    ws.on("error", (error) => log.warn({ err: error }, "socket error"));
    ws.on("close", () => {
      clearTimeout(expiryTimer);
      room.state.removePeer(peer);
      rooms.leave(roomId, peer);
      log.info("client left");
    });
  }

  httpServer.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    socket.on("error", (error) => logger.debug({ err: error }, "upgrade socket error"));
    if (closing) {
      rejectUpgrade(socket, 503);
      return;
    }
    const target = parseUpgradeUrl(req.url);
    if (!target) {
      logger.info("upgrade rejected: missing ticket or malformed room id");
      rejectUpgrade(socket, 401);
      return;
    }
    void verifyRoomTicket(target.ticket, target.roomId, ticketSecret).then((verified) => {
      if (!verified.success) {
        logger.info({ roomId: target.roomId, reason: verified.error }, "upgrade rejected");
        rejectUpgrade(socket, 401);
        return;
      }
      // Shutdown may have started while the ticket was being verified.
      if (closing) {
        rejectUpgrade(socket, 503);
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => onConnection(ws, verified.data));
    });
  });

  function closeClient(ws: WebSocket): Promise<void> {
    return new Promise((resolve) => {
      if (ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      const timer = setTimeout(() => ws.terminate(), shutdownTimeoutMs);
      ws.once("close", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.close(1001, "server shutting down");
    });
  }

  async function close(): Promise<void> {
    closing = true;
    await Promise.all([...wss.clients].map(closeClient));
    await rooms.clear();
    await store.close();
    wss.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
      httpServer.closeAllConnections();
    });
  }

  const listening = await new Promise<Result<number>>((resolve) => {
    httpServer.once("error", (error) => resolve({ success: false, error: error.message }));
    httpServer.listen(options.port, options.host, () => {
      resolve({ success: true, data: (httpServer.address() as AddressInfo).port });
    });
  });
  if (!listening.success) {
    return {
      success: false,
      error: `could not listen on port ${options.port}: ${listening.error}`,
    };
  }

  return { success: true, data: { port: listening.data, rooms, stats, close } };
}
