import { afterEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import { type DocumentStore, openLevelDbStore } from "../src/persistence/document-store";
import { type RunningServer, startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { waitFor } from "./helpers/sockets";
import { createMemoryStore, storedText, tempDir } from "./helpers/stores";
import { TEST_SECRET, type TicketOverrides } from "./helpers/tickets";
import { connectYClient, synced, type YClient } from "./helpers/yjs-clients";

const cleanups: Array<() => Promise<void> | void> = [];

async function start(store: DocumentStore = createMemoryStore()): Promise<RunningServer> {
  const result = await startServer({
    port: 0,
    host: "127.0.0.1",
    ticketSecret: TEST_SECRET,
    roomGracePeriodMs: 30_000,
    logger: silentLogger,
    store,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

async function client(
  server: RunningServer,
  roomId = "room-1",
  doc?: Y.Doc,
  ticket?: TicketOverrides,
): Promise<YClient> {
  const c = await connectYClient(server.port, roomId, doc, ticket);
  cleanups.push(() => c.destroy());
  await synced(c);
  return c;
}

async function levelDbStore(path: string): Promise<DocumentStore> {
  const store = await openLevelDbStore(path);
  if (!store.success) {
    throw new Error(store.error);
  }
  return store.data;
}

const converged = (a: YClient, b: YClient) => () => a.text.toString() === b.text.toString();

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

describe("CRDT convergence (Invariant 3)", () => {
  it("two Y.Docs applying concurrent inserts at the same position converge", () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    a.getText("t").insert(0, "base");
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    const beforeA = Y.encodeStateVector(a);
    const beforeB = Y.encodeStateVector(b);
    a.getText("t").insert(2, "AAA");
    b.getText("t").insert(2, "BBB");
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b, beforeA));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a, beforeB));

    expect(a.getText("t").toString()).toBe(b.getText("t").toString());
    expect(a.getText("t").toString()).toMatch(/^ba(AAABBB|BBBAAA)se$/);
  });

  it("clients inserting at the same position through the server converge", async () => {
    const server = await start();
    cleanups.push(() => server.close());
    const a = await client(server);
    const b = await client(server);

    a.text.insert(0, "from-a ");
    b.text.insert(0, "from-b ");

    await waitFor(converged(a, b));
    expect(a.text.toString()).toContain("from-a ");
    expect(a.text.toString()).toContain("from-b ");
    expect(server.rooms.get("room-1")?.state.doc.getText("codemirror").toString()).toBe(
      a.text.toString(),
    );
  });

  it("delivers an edit to another client within 200ms", async () => {
    const server = await start();
    cleanups.push(() => server.close());
    const a = await client(server);
    const b = await client(server);

    const sent = performance.now();
    a.text.insert(0, "x");
    await waitFor(() => b.text.toString() === "x", 200);
    expect(performance.now() - sent).toBeLessThan(200);
  });

  it("syncs a 10K-line document to a joining client", async () => {
    const server = await start();
    cleanups.push(() => server.close());
    const a = await client(server);
    const lines = Array.from({ length: 10_000 }, (_, i) => `const line${i} = ${i}; // padding`);
    a.text.insert(0, lines.join("\n"));

    const b = await client(server);
    await waitFor(converged(a, b), 5_000);
    expect(b.text.toString().split("\n")).toHaveLength(10_000);
  });

  it("clients converge after one disconnects, both edit, and it reconnects", async () => {
    const server = await start();
    cleanups.push(() => server.close());
    const a = await client(server);
    const b = await client(server);
    a.text.insert(0, "shared");
    await waitFor(converged(a, b));

    a.provider.disconnect();
    await waitFor(() => server.stats().connections === 1);
    a.text.insert(0, "offline-a ");
    b.text.insert(b.text.length, " online-b");
    a.provider.connect();

    await waitFor(converged(a, b), 5_000);
    expect(a.text.toString()).toBe("offline-a shared online-b");
  });
});

describe("byte budget (Invariant 1)", () => {
  it("does not close a fresh connection whose first sync uploads a 10K-line document", async () => {
    const store = createMemoryStore();
    const server = await start(store);
    cleanups.push(() => server.close());
    // Typed line by line, as an editor would produce it: one insert per line of ~100 characters.
    const doc = new Y.Doc();
    const text = doc.getText("codemirror");
    for (let i = 0; i < 10_000; i++) {
      text.insert(
        text.length,
        `${`export const value${i} = computeSomething(${i}, "padding");`.padEnd(99, " ")}\n`,
      );
    }
    expect(Y.encodeStateAsUpdate(doc).length).toBeGreaterThan(1_000_000);

    const a = await client(server, "room-1", doc);
    const serverText = () => server.rooms.get("room-1")?.state.doc.getText("codemirror");
    await waitFor(() => serverText()?.length === text.length, 5_000);

    // Still connected: a follow-up edit arrives and the upload was persisted.
    a.text.insert(0, "// edited\n");
    await waitFor(() => serverText()?.toString().startsWith("// edited\n") === true);
    expect(server.stats().connections).toBe(1);
    expect(storedText(store, "room-1")).toBe(a.text.toString());
  });
});

describe("persistence (Invariant 4)", () => {
  it("stores every update before broadcasting it", async () => {
    const store = createMemoryStore();
    let release: () => void = () => undefined;
    store.gate = new Promise((resolve) => {
      release = resolve;
    });
    const server = await start(store);
    cleanups.push(() => server.close());
    const a = await client(server);
    const b = await client(server);

    a.text.insert(0, "held");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(b.text.toString()).toBe("");

    release();
    await waitFor(() => b.text.toString() === "held");
    expect(storedText(store, "room-1")).toBe("held");

    store.gate = null;
    b.text.insert(4, "!");
    await waitFor(() => a.text.toString() === "held!");
    // Whatever a client has received, the store already has.
    expect(storedText(store, "room-1")).toBe("held!");
  });

  it("restores a room from LevelDB after a server restart", async () => {
    const dir = tempDir();
    cleanups.push(() => dir.remove());
    const first = await start(await levelDbStore(dir.path));
    const writer = await client(first);
    writer.text.insert(0, "survives restarts");
    await waitFor(() => first.rooms.get("room-1")?.state.doc.getText("codemirror").length === 17);
    writer.destroy();
    await first.close();

    const second = await start(await levelDbStore(dir.path));
    cleanups.push(() => second.close());
    const reader = await client(second);

    expect(reader.text.toString()).toBe("survives restarts");
  });
});

describe("presence (Invariant 5)", () => {
  it("clears a client's awareness state for others when it disconnects", async () => {
    const store = createMemoryStore();
    const server = await start(store);
    cleanups.push(() => server.close());
    const a = await client(server);
    const b = await client(server);
    const aId = a.doc.clientID;

    a.provider.awareness.setLocalStateField("user", { name: "Ada" });
    await waitFor(() => b.provider.awareness.getStates().get(aId)?.user?.name === "Ada");

    a.destroy();
    await waitFor(() => !b.provider.awareness.getStates().has(aId));
    const room = server.rooms.get("room-1")?.state;
    expect(room?.awareness.getStates().has(aId)).toBe(false);
    // Presence traffic never reaches the document store.
    expect(store.updates.size).toBe(0);
  });

  it("clears the presence of a client that reconnected, when its connection drops (#32)", async () => {
    const server = await start();
    cleanups.push(() => server.close());
    const a = await client(server);
    const b = await client(server);
    const aId = a.doc.clientID;
    a.provider.awareness.setLocalStateField("mark", 1);
    await waitFor(() => b.provider.awareness.getStates().get(aId)?.mark === 1);

    // The socket drops (no goodbye message) and y-websocket reconnects with the same client id.
    a.provider.ws?.close();
    await waitFor(() => !b.provider.awareness.getStates().has(aId));
    await synced(a);
    // The web provider re-announces presence on every connect.
    a.provider.awareness.setLocalStateField("mark", 2);
    await waitFor(() => b.provider.awareness.getStates().get(aId)?.mark === 2);

    // Dropped again, for good this time: nobody should keep seeing a ghost.
    a.provider.shouldConnect = false;
    a.provider.ws?.close();
    await waitFor(() => !b.provider.awareness.getStates().has(aId));
  });

  it("shows other clients the ticket's identity, not the one a client claims (#32)", async () => {
    const server = await start();
    cleanups.push(() => server.close());
    const a = await client(server, "room-1", undefined, { sub: "user-2", name: "Mallory" });
    const b = await client(server);
    const aId = a.doc.clientID;

    a.provider.awareness.setLocalStateField("user", { id: "user-1", name: "Ada" });
    await waitFor(() => b.provider.awareness.getStates().has(aId));
    expect(b.provider.awareness.getStates().get(aId)?.user).toMatchObject({
      id: "user-2",
      name: "Mallory",
    });
  });
});
