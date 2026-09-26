import { randomBytes } from "node:crypto";
import { connect, createServer } from "node:net";
import {
  ROOM_PROTOCOL,
  roomTicketProtocols,
  TICKET_EXPIRED_CLOSE_CODE,
} from "@collab-editor/shared";
import * as encoding from "lib0/encoding";
import pino from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WebSocket } from "ws";
import * as Y from "yjs";
import { type RunningServer, type ServerOptions, startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { closed, expectUpgradeRejected, nextMessage, openClient, waitFor } from "./helpers/sockets";
import { createMemoryStore } from "./helpers/stores";
import { signTicket, TEST_SECRET } from "./helpers/tickets";

const now = () => Math.floor(Date.now() / 1000);

/** Sends a request line WHATWG URL can't parse; resolves with the raw response. */
function rawRequest(port: number, upgrade: boolean): Promise<string> {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1", () => {
      const headers = upgrade
        ? `Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${randomBytes(16).toString("base64")}\r\n`
        : "";
      socket.write(`GET http://[ HTTP/1.1\r\nHost: x\r\n${headers}\r\n`);
    });
    let data = "";
    socket.on("data", (chunk) => {
      data += chunk.toString();
      socket.destroy();
      resolve(data);
    });
    socket.on("close", () => resolve(data));
  });
}

/** Sends a WebSocket upgrade by hand; resolves with the raw response head. */
function rawUpgrade(port: number, path: string, protocols: string): Promise<string> {
  return new Promise((resolve) => {
    const socket = connect(port, "127.0.0.1", () => {
      socket.write(
        `GET ${path} HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
          `Sec-WebSocket-Version: 13\r\nSec-WebSocket-Key: ${randomBytes(16).toString("base64")}\r\n` +
          `Sec-WebSocket-Protocol: ${protocols}\r\n\r\n`,
      );
    });
    let data = "";
    socket.on("data", (chunk) => {
      data += chunk.toString();
      if (data.includes("\r\n\r\n")) {
        socket.destroy();
        resolve(data);
      }
    });
    socket.on("close", () => resolve(data));
  });
}

/** A valid y-websocket sync update frame carrying roughly `bytes` of document content. */
function syncUpdateFrame(bytes: number, char = "x"): Uint8Array {
  const doc = new Y.Doc();
  doc.getText("codemirror").insert(0, char.repeat(bytes));
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 0); // sync message
  encoding.writeVarUint(encoder, 2); // update
  encoding.writeVarUint8Array(encoder, Y.encodeStateAsUpdate(doc));
  return encoding.toUint8Array(encoder);
}

let server: RunningServer;
let base: string;

async function start(overrides: Partial<ServerOptions> = {}): Promise<RunningServer> {
  const result = await startServer({
    port: 0,
    host: "127.0.0.1",
    ticketSecret: TEST_SECRET,
    roomGracePeriodMs: 30_000,
    logger: silentLogger,
    store: createMemoryStore(),
    ...overrides,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/** Opens a socket to `roomId` with a valid ticket for `ticketRoom` in the subprotocol header. */
async function openRoom(roomId = "room-1", ticketRoom = roomId): Promise<WebSocket> {
  return openClient(
    `${base}/${roomId}`,
    roomTicketProtocols(await signTicket({ roomId: ticketRoom })),
  );
}

describe("ws server", () => {
  beforeEach(async () => {
    server = await start();
    base = `ws://127.0.0.1:${server.port}`;
  });
  afterEach(async () => {
    await server.close();
  });

  describe("upgrade authentication (Invariants 1 and 2)", () => {
    const rejectTicket = (ticket: string, roomId = "room-1") =>
      expectUpgradeRejected(`${base}/${roomId}`, roomTicketProtocols(ticket));

    it("joins with a ticket in the subprotocol header and selects only the room protocol", async () => {
      const ticket = await signTicket();
      const ws = await openClient(`${base}/room-1`, roomTicketProtocols(ticket));

      expect(ws.protocol).toBe(ROOM_PROTOCOL);
      await waitFor(() => server.rooms.get("room-1")?.clients.size === 1);
      ws.close();
    });

    it("never echoes the ticket in the handshake response", async () => {
      const ticket = await signTicket();
      const response = await rawUpgrade(
        server.port,
        "/room-1",
        roomTicketProtocols(ticket).join(", "),
      );

      expect(response).toMatch(/^HTTP\/1\.1 101/);
      expect(response).toMatch(new RegExp(`^Sec-WebSocket-Protocol: ${ROOM_PROTOCOL}\r$`, "im"));
      expect(response).not.toContain(ticket);
    });

    it("never logs the ticket, accepted or rejected", async () => {
      await server.close();
      const lines: string[] = [];
      server = await start({
        logger: pino({ level: "trace" }, { write: (line: string) => lines.push(line) }),
      });
      base = `ws://127.0.0.1:${server.port}`;
      const ticket = await signTicket();
      const otherRoom = await signTicket({ roomId: "room-2" });

      const ws = await openClient(`${base}/room-1`, roomTicketProtocols(ticket));
      await rejectTicket(otherRoom);
      await expectUpgradeRejected(`${base}/room-1?ticket=${ticket}`);
      ws.close();
      await waitFor(() => server.stats().connections === 0);

      expect(lines.length).toBeGreaterThan(0);
      const logged = lines.join("");
      expect(logged).not.toContain(ticket);
      expect(logged).not.toContain(otherRoom);
    });

    it("rejects a connection without a ticket with 401", async () => {
      expect(await expectUpgradeRejected(`${base}/room-1`)).toBe(401);
      expect(await expectUpgradeRejected(`${base}/room-1`, [ROOM_PROTOCOL])).toBe(401);
    });

    it("rejects a ticket without the room protocol with 401", async () => {
      const ticket = await signTicket();
      expect(await expectUpgradeRejected(`${base}/room-1`, [`ticket.${ticket}`])).toBe(401);
    });

    it("rejects more than one ticket with 401", async () => {
      const ticket = await signTicket();
      const other = await signTicket({ sub: "user-2" });
      expect(
        await expectUpgradeRejected(`${base}/room-1`, [
          ...roomTicketProtocols(ticket),
          `ticket.${other}`,
        ]),
      ).toBe(401);
    });

    it("ignores a ticket in the query string (401)", async () => {
      const ticket = await signTicket();
      expect(await expectUpgradeRejected(`${base}/room-1?ticket=${ticket}`)).toBe(401);
      expect(await expectUpgradeRejected(`${base}/room-1?ticket=${ticket}`, [ROOM_PROTOCOL])).toBe(
        401,
      );
    });

    it("rejects a ticket for another room with 401", async () => {
      expect(await rejectTicket(await signTicket({ roomId: "room-1" }), "room-2")).toBe(401);
    });

    it("rejects an expired ticket with 401", async () => {
      expect(await rejectTicket(await signTicket({ iat: now() - 400, exp: now() - 100 }))).toBe(
        401,
      );
    });

    it("rejects a forged ticket with 401", async () => {
      expect(await rejectTicket(await signTicket({ secret: "f".repeat(32) }))).toBe(401);
    });

    it("rejects an invalid ticket with 401", async () => {
      expect(await rejectTicket("not-a-jwt")).toBe(401);
    });

    it("rejects a malformed room id with 401", async () => {
      const ticket = await signTicket({ roomId: "../x" });
      expect(await rejectTicket(ticket, "..%2Fx")).toBe(401);
    });

    it("survives a malformed request target", async () => {
      for (const upgrade of [true, false]) {
        const response = await rawRequest(server.port, upgrade);
        expect(response).toMatch(upgrade ? /^HTTP\/1\.1 401/ : /^HTTP\/1\.1 404/);
      }
      const res = await fetch(`http://127.0.0.1:${server.port}/health`);
      expect(res.status).toBe(200);
    });

    it("never creates a room for a rejected connection", async () => {
      await expectUpgradeRejected(`${base}/room-1`);
      expect(server.stats()).toEqual({ status: "ok", rooms: 0, connections: 0 });
    });
  });

  describe("rooms", () => {
    it("joins the room with a valid ticket", async () => {
      const ws = await openRoom();

      await waitFor(() => server.rooms.get("room-1")?.clients.size === 1);
      expect(server.stats()).toEqual({ status: "ok", rooms: 1, connections: 1 });
      ws.close();
    });

    it("tracks two clients in the same room", async () => {
      const a = await openRoom();
      const b = await openRoom();

      await waitFor(() => server.rooms.get("room-1")?.clients.size === 2);
      expect(server.stats().rooms).toBe(1);
      a.close();
      b.close();
    });

    it("removes a client on disconnect", async () => {
      const a = await openRoom();
      const b = await openRoom();
      await waitFor(() => server.stats().connections === 2);

      a.close();
      await waitFor(() => server.stats().connections === 1);
      expect(server.rooms.get("room-1")?.clients.size).toBe(1);
      b.close();
    });
  });

  describe("messages (Invariant 1)", () => {
    it("answers a valid ping", async () => {
      const ws = await openRoom();
      const reply = nextMessage(ws);
      ws.send(JSON.stringify({ type: "ping" }));

      expect(await reply).toEqual({ type: "pong" });
      ws.close();
    });

    it("rejects an invalid message", async () => {
      const ws = await openRoom();
      const reply = nextMessage(ws);
      ws.send(JSON.stringify({ type: "delete-everything" }));

      expect(await reply).toEqual({ type: "error", message: "unknown or malformed message" });
      expect(ws.readyState).toBe(ws.OPEN);
      ws.close();
    });

    it("closes a connection that sends a malformed sync frame with 1003", async () => {
      const ws = await openRoom();
      const done = closed(ws);
      ws.send(Buffer.from([9, 9, 9]));

      expect(await done).toEqual({ code: 1003, reason: "invalid sync message" });
    });

    it("closes a flooding client with 1008", async () => {
      await server.close();
      server = await start({ rateLimit: { capacity: 5, refillPerSecond: 1 } });
      base = `ws://127.0.0.1:${server.port}`;
      const ws = await openRoom();
      const done = closed(ws);

      for (let i = 0; i < 20; i++) {
        ws.send(JSON.stringify({ type: "ping" }));
      }

      expect(await done).toEqual({ code: 1008, reason: "rate limit exceeded" });
      await waitFor(() => server.stats().connections === 0);
    });
  });

  it("rate-limits binary sync frames too (Invariant 1)", async () => {
    await server.close();
    server = await start({ rateLimit: { capacity: 5, refillPerSecond: 1 } });
    base = `ws://127.0.0.1:${server.port}`;
    const ws = await openRoom();
    const done = closed(ws);

    // A valid, empty sync update (message type 0, sync type 2, empty Yjs update).
    for (let i = 0; i < 20; i++) {
      ws.send(Buffer.from([0, 2, 2, 0, 0]));
    }

    expect(await done).toEqual({ code: 1008, reason: "rate limit exceeded" });
  });

  it("closes a client that floods bytes with 1008 under the default budget (Invariant 1)", async () => {
    const ws = await openRoom();
    const done = closed(ws);
    const frame = syncUpdateFrame(1024 * 1024);

    // 40 frames stay well under the message budget (100) but carry 40 MiB.
    for (let i = 0; i < 40; i++) {
      ws.send(frame);
    }

    expect(await done).toEqual({ code: 1008, reason: "byte budget exceeded" });
    await waitFor(() => server.stats().connections === 0);
  });

  it("ignores frames that arrive after a limiter closed the connection (Invariant 1)", async () => {
    await server.close();
    server = await start({
      maxPayloadBytes: 2_000,
      byteRateLimit: { capacity: 2_000, refillPerSecond: 1 },
    });
    base = `ws://127.0.0.1:${server.port}`;
    const ws = await openRoom();
    const done = closed(ws);

    ws.send(syncUpdateFrame(1_500, "a")); // accepted, ~500 bytes left
    ws.send(syncUpdateFrame(1_500, "b")); // over budget: closes
    ws.send(syncUpdateFrame(10, "c")); // would fit the remaining budget

    expect(await done).toEqual({ code: 1008, reason: "byte budget exceeded" });
    const text = server.rooms.get("room-1")?.state.doc.getText("codemirror").toString() ?? "";
    expect(text).not.toContain("c");
  });

  it("refuses a byte budget smaller than the frame cap", async () => {
    const result = await startServer({
      port: 0,
      host: "127.0.0.1",
      ticketSecret: TEST_SECRET,
      roomGracePeriodMs: 30_000,
      logger: silentLogger,
      store: createMemoryStore(),
      maxPayloadBytes: 1_000,
      byteRateLimit: { capacity: 999, refillPerSecond: 1 },
    });

    expect(result).toEqual({
      success: false,
      error: "byte budget capacity (999) is below the frame cap (1000)",
    });
  });

  describe("ticket expiry (Invariants 1 and 2)", () => {
    beforeEach(() => {
      // Only the timers are fake; sockets keep doing real I/O while fake time advances with real time.
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"], shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("uses an application close code", () => {
      expect(TICKET_EXPIRED_CLOSE_CODE).toBe(4001);
    });

    it("closes a socket with 4001 when its ticket expires", async () => {
      const ticket = await signTicket({ exp: now() + 60 });
      const ws = await openClient(`${base}/room-1`, roomTicketProtocols(ticket));
      await waitFor(() => server.stats().connections === 1);
      const done = closed(ws);

      vi.advanceTimersByTime(61_000);

      expect(await done).toEqual({ code: TICKET_EXPIRED_CLOSE_CODE, reason: "ticket expired" });
      await waitFor(() => server.stats().connections === 0);
    });

    it("keeps a socket open while its ticket is valid", async () => {
      const ws = await openRoom();
      await waitFor(() => server.stats().connections === 1);

      vi.advanceTimersByTime(200_000);
      const reply = nextMessage(ws);
      ws.send(JSON.stringify({ type: "ping" }));

      expect(await reply).toEqual({ type: "pong" });
      expect(ws.readyState).toBe(ws.OPEN);
      ws.close();
    });

    it("closes a ticket that expires moments after the upgrade at its exp", async () => {
      const ticket = await signTicket({ exp: now() + 1 });
      const ws = await openClient(`${base}/room-1`, roomTicketProtocols(ticket));
      const done = closed(ws);

      vi.advanceTimersByTime(1_000);

      expect(await done).toEqual({ code: TICKET_EXPIRED_CLOSE_CODE, reason: "ticket expired" });
    });

    it("closes a socket within one ticket lifetime even if the issuer's clock runs ahead", async () => {
      // Issued by a clock 100 s ahead: exp is 400 s away on this server's clock.
      const ticket = await signTicket({ iat: now() + 100, exp: now() + 400 });
      const ws = await openClient(`${base}/room-1`, roomTicketProtocols(ticket));
      await waitFor(() => server.stats().connections === 1);
      const done = closed(ws);

      vi.advanceTimersByTime(300_000);

      expect(await done).toEqual({ code: TICKET_EXPIRED_CLOSE_CODE, reason: "ticket expired" });
    });

    it("clears the expiry timer on a normal disconnect", async () => {
      const ws = await openRoom();
      await waitFor(() => server.stats().connections === 1);
      const done = closed(ws);
      ws.close();
      await done;
      await waitFor(() => server.stats().connections === 0);

      // Only the empty room's grace-period timer is left; once it fires nothing is pending.
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(30_000);
      expect(server.stats().rooms).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe("http", () => {
    it("reports health", async () => {
      const ws = await openRoom();
      await waitFor(() => server.stats().connections === 1);

      const res = await fetch(`http://127.0.0.1:${server.port}/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok", rooms: 1, connections: 1 });
      ws.close();
    });

    it("returns 404 for anything else", async () => {
      const res = await fetch(`http://127.0.0.1:${server.port}/`);
      expect(res.status).toBe(404);
    });
  });

  describe("shutdown", () => {
    it("closes every connection gracefully", async () => {
      const clients = await Promise.all([
        openRoom("room-1"),
        openRoom("room-1"),
        openRoom("room-2"),
      ]);
      await waitFor(() => server.stats().connections === 3);
      const closes = clients.map(closed);

      await server.close();

      for (const result of await Promise.all(closes)) {
        expect(result).toEqual({ code: 1001, reason: "server shutting down" });
      }
      expect(server.stats()).toEqual({ status: "ok", rooms: 0, connections: 0 });
      await expect(fetch(`http://127.0.0.1:${server.port}/health`)).rejects.toThrow();
    });

    it("terminates a client that ignores the close handshake", async () => {
      await server.close();
      server = await start({ shutdownTimeoutMs: 50 });
      base = `ws://127.0.0.1:${server.port}`;
      const ws = await openRoom();
      await waitFor(() => server.stats().connections === 1);
      // Pause the client's socket so it never answers the close frame.
      ws.pause();

      await server.close();
      expect(server.stats().connections).toBe(0);
      ws.terminate();
    });
  });

  it("reports a port that is already taken", async () => {
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));
    const address = blocker.address();
    const port = typeof address === "object" && address ? address.port : 0;

    const result = await startServer({
      port,
      host: "127.0.0.1",
      ticketSecret: TEST_SECRET,
      roomGracePeriodMs: 0,
      logger: silentLogger,
      store: createMemoryStore(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(`could not listen on port ${port}`);
    }
    blocker.close();
  });
});
