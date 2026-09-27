import { ROOM_DELETED_CLOSE_CODE, roomPurgePath, roomTicketProtocols } from "@collab-editor/shared";
import { afterEach, describe, expect, it } from "vitest";
import type { Result } from "../src/result";
import { type RunningServer, type ServerOptions, startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { closed, expectUpgradeRejected, openClient, waitFor } from "./helpers/sockets";
import { createMemoryStore, type MemoryStore, storedText } from "./helpers/stores";
import { signPurgeTicket, signTicket, TEST_SECRET } from "./helpers/tickets";
import { connectYClient, synced, type YClient } from "./helpers/yjs-clients";

let server: RunningServer | null = null;
let store: MemoryStore;
const yClients: YClient[] = [];

async function start(options: Partial<ServerOptions> = {}): Promise<RunningServer> {
  store = createMemoryStore();
  const result = await startServer({
    port: 0,
    host: "127.0.0.1",
    ticketSecret: TEST_SECRET,
    roomGracePeriodMs: 0,
    logger: silentLogger,
    store,
    ...options,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  server = result.data;
  return result.data;
}

/** Sends `DELETE /rooms/<id>` with the token as a bearer (none when null). */
async function purge(port: number, token: string | null, roomId = "room-1"): Promise<number> {
  const headers: Record<string, string> =
    token === null ? {} : { Authorization: `Bearer ${token}` };
  const res = await fetch(`http://127.0.0.1:${port}${roomPurgePath(roomId)}`, {
    method: "DELETE",
    headers,
  });
  await res.arrayBuffer();
  return res.status;
}

async function yClient(port: number, roomId = "room-1"): Promise<YClient> {
  const client = await connectYClient(port, roomId);
  yClients.push(client);
  await synced(client);
  return client;
}

afterEach(async () => {
  for (const client of yClients.splice(0)) {
    client.destroy();
  }
  await server?.close();
  server = null;
});

describe("DELETE /rooms/<id> (Invariants 1, 2, 4 and 5)", () => {
  it("closes the room's sockets with 4003, evicts the room and clears its document", async () => {
    const { port } = await start();
    const writer = await yClient(port);
    const closeCodes: number[] = [];
    writer.provider.on("connection-close", (event) => closeCodes.push(event?.code ?? 0));
    writer.text.insert(0, "secret");
    await waitFor(() => storedText(store, "room-1") === "secret");
    const other = await openClient(
      `ws://127.0.0.1:${port}/room-1`,
      roomTicketProtocols(await signTicket({ sub: "user-2" })),
    );

    expect(await purge(port, await signPurgeTicket())).toBe(204);
    expect((await closed(other)).code).toBe(ROOM_DELETED_CLOSE_CODE);
    await waitFor(() => closeCodes.length > 0);
    expect(closeCodes[0]).toBe(ROOM_DELETED_CLOSE_CODE);
    expect(store.updates.has("room-1")).toBe(false);
    await waitFor(() => server?.stats().rooms === 0);
  });

  it("refuses a rejoin with a still-valid room ticket, and leaves other rooms alone", async () => {
    const { port } = await start();

    expect(await purge(port, await signPurgeTicket())).toBe(204);
    const url = (roomId: string) => `ws://127.0.0.1:${port}/${roomId}`;
    expect(
      await expectUpgradeRejected(url("room-1"), roomTicketProtocols(await signTicket())),
    ).toBe(401);
    const neighbour = await openClient(
      url("room-2"),
      roomTicketProtocols(await signTicket({ roomId: "room-2" })),
    );
    neighbour.close();
  });

  it("refuses a missing bearer, a room ticket and another room's purge ticket", async () => {
    const { port } = await start();

    expect(await purge(port, null)).toBe(401);
    expect(await purge(port, await signTicket())).toBe(401);
    expect(await purge(port, await signPurgeTicket({ roomId: "room-2" }))).toBe(401);
    expect(await purge(port, "not-a-jwt")).toBe(401);
    // Nothing was purged: the room can still be joined.
    const ws = await openClient(
      `ws://127.0.0.1:${port}/room-1`,
      roomTicketProtocols(await signTicket()),
    );
    ws.close();
  });

  it("refuses a purge ticket as a room ticket on upgrade", async () => {
    const { port } = await start();

    expect(
      await expectUpgradeRejected(
        `ws://127.0.0.1:${port}/room-1`,
        roomTicketProtocols(await signPurgeTicket()),
      ),
    ).toBe(401);
  });

  it.each([
    ["GET", "/rooms/room-1"],
    ["POST", "/rooms/room-1"],
    ["DELETE", "/rooms/bad.id"],
    ["DELETE", "/rooms/room-1/extra"],
    ["DELETE", "/rooms/"],
  ])("answers %s %s with 404", async (method, path) => {
    const { port } = await start();
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await signPurgeTicket()}` },
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });

  it("clears the document only after the room's pending writes", async () => {
    const { port } = await start();
    const writer = await yClient(port);
    const events: string[] = [];
    const { append, clear } = store;
    store.append = async (roomId, update) => {
      events.push("append started");
      const result = await append(roomId, update);
      events.push("append");
      return result;
    };
    store.clear = (roomId): Promise<Result<void>> => {
      events.push("clear");
      return clear(roomId);
    };
    let release: () => void = () => undefined;
    store.gate = new Promise((resolve) => {
      release = resolve;
    });
    writer.text.insert(0, "late");
    await waitFor(() => events.includes("append started"));

    const status = purge(port, await signPurgeTicket());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(events).not.toContain("clear");
    release();

    expect(await status).toBe(204);
    expect(events).toContain("append");
    expect(events.at(-1)).toBe("clear");
    expect(store.updates.has("room-1")).toBe(false);
  });

  it("answers 500 when the store can't clear, with the room still evicted and refused", async () => {
    const { port } = await start();
    const ws = await openClient(
      `ws://127.0.0.1:${port}/room-1`,
      roomTicketProtocols(await signTicket()),
    );
    store.failClear = true;

    expect(await purge(port, await signPurgeTicket())).toBe(500);
    expect((await closed(ws)).code).toBe(ROOM_DELETED_CLOSE_CODE);
    await waitFor(() => server?.stats().rooms === 0);
    expect(
      await expectUpgradeRejected(
        `ws://127.0.0.1:${port}/room-1`,
        roomTicketProtocols(await signTicket()),
      ),
    ).toBe(401);
  });

  it("answers 204 for a room it never had, and again for a room already purged", async () => {
    const { port } = await start();

    expect(await purge(port, await signPurgeTicket({ roomId: "never" }), "never")).toBe(204);
    expect(await purge(port, await signPurgeTicket({ roomId: "never" }), "never")).toBe(204);
  });

  it("answers 429 from the upgrade bucket before looking at the ticket", async () => {
    const { port } = await start({ upgradeRateLimit: { capacity: 1, refillPerSecond: 0.001 } });

    expect(await purge(port, null)).toBe(401);
    expect(await purge(port, await signPurgeTicket())).toBe(429);
  });

  it("answers 503 once shutdown has started", async () => {
    const { port } = await start({ closeTimeoutMs: 1_000 });
    const ws = await openClient(
      `ws://127.0.0.1:${port}/room-1`,
      roomTicketProtocols(await signTicket()),
    );
    // Never answer the shutdown's close frame, so shutdown stays in progress.
    ws.pause();
    const closing = server?.close();
    server = null;

    expect(await purge(port, await signPurgeTicket())).toBe(503);
    ws.terminate();
    await closing;
  });
});
