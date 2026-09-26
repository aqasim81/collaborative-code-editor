import { randomBytes } from "node:crypto";
import { connect, createServer } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

async function roomUrl(roomId = "room-1", ticketRoom = roomId): Promise<string> {
  return `${base}/${roomId}?ticket=${await signTicket({ roomId: ticketRoom })}`;
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
    it("rejects a connection without a ticket with 401", async () => {
      expect(await expectUpgradeRejected(`${base}/room-1`)).toBe(401);
    });

    it("rejects a ticket for another room with 401", async () => {
      expect(await expectUpgradeRejected(await roomUrl("room-2", "room-1"))).toBe(401);
    });

    it("rejects an expired ticket with 401", async () => {
      const ticket = await signTicket({ iat: now() - 400, exp: now() - 100 });
      expect(await expectUpgradeRejected(`${base}/room-1?ticket=${ticket}`)).toBe(401);
    });

    it("rejects a forged ticket with 401", async () => {
      const ticket = await signTicket({ secret: "f".repeat(32) });
      expect(await expectUpgradeRejected(`${base}/room-1?ticket=${ticket}`)).toBe(401);
    });

    it("rejects a malformed room id with 401", async () => {
      const ticket = await signTicket({ roomId: "../x" });
      expect(await expectUpgradeRejected(`${base}/..%2Fx?ticket=${ticket}`)).toBe(401);
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
      const ws = await openClient(await roomUrl());

      await waitFor(() => server.rooms.get("room-1")?.clients.size === 1);
      expect(server.stats()).toEqual({ status: "ok", rooms: 1, connections: 1 });
      ws.close();
    });

    it("tracks two clients in the same room", async () => {
      const a = await openClient(await roomUrl());
      const b = await openClient(await roomUrl());

      await waitFor(() => server.rooms.get("room-1")?.clients.size === 2);
      expect(server.stats().rooms).toBe(1);
      a.close();
      b.close();
    });

    it("removes a client on disconnect", async () => {
      const a = await openClient(await roomUrl());
      const b = await openClient(await roomUrl());
      await waitFor(() => server.stats().connections === 2);

      a.close();
      await waitFor(() => server.stats().connections === 1);
      expect(server.rooms.get("room-1")?.clients.size).toBe(1);
      b.close();
    });
  });

  describe("messages (Invariant 1)", () => {
    it("answers a valid ping", async () => {
      const ws = await openClient(await roomUrl());
      const reply = nextMessage(ws);
      ws.send(JSON.stringify({ type: "ping" }));

      expect(await reply).toEqual({ type: "pong" });
      ws.close();
    });

    it("rejects an invalid message", async () => {
      const ws = await openClient(await roomUrl());
      const reply = nextMessage(ws);
      ws.send(JSON.stringify({ type: "delete-everything" }));

      expect(await reply).toEqual({ type: "error", message: "unknown or malformed message" });
      expect(ws.readyState).toBe(ws.OPEN);
      ws.close();
    });

    it("closes a connection that sends a malformed sync frame with 1003", async () => {
      const ws = await openClient(await roomUrl());
      const done = closed(ws);
      ws.send(Buffer.from([9, 9, 9]));

      expect(await done).toEqual({ code: 1003, reason: "invalid sync message" });
    });

    it("closes a flooding client with 1008", async () => {
      await server.close();
      server = await start({ rateLimit: { capacity: 5, refillPerSecond: 1 } });
      base = `ws://127.0.0.1:${server.port}`;
      const ws = await openClient(await roomUrl());
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
    const ws = await openClient(await roomUrl());
    const done = closed(ws);

    // A valid, empty sync update (message type 0, sync type 2, empty Yjs update).
    for (let i = 0; i < 20; i++) {
      ws.send(Buffer.from([0, 2, 2, 0, 0]));
    }

    expect(await done).toEqual({ code: 1008, reason: "rate limit exceeded" });
  });

  describe("http", () => {
    it("reports health", async () => {
      const ws = await openClient(await roomUrl());
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
        openClient(await roomUrl("room-1")),
        openClient(await roomUrl("room-1")),
        openClient(await roomUrl("room-2")),
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
      const ws = await openClient(await roomUrl());
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
