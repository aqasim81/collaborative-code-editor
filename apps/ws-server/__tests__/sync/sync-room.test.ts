import { describe, expect, it, vi } from "vitest";
import { Awareness, encodeAwarenessUpdate } from "y-protocols/awareness";
import * as Y from "yjs";
import { parseSyncMessage, type SyncMessage } from "../../src/sync/protocol";
import { createSyncRoom, type Peer, type SyncRoom } from "../../src/sync/sync-room";
import { silentLogger } from "../helpers/logger";
import { createMemoryStore, type MemoryStore, storedText } from "../helpers/stores";

interface FakePeer extends Peer {
  received: SyncMessage[];
  closedWith: { code: number; reason: string } | null;
}

function fakePeer(): FakePeer {
  const peer: FakePeer = {
    received: [],
    closedWith: null,
    send(data) {
      const parsed = parseSyncMessage(data);
      if (!parsed.success) {
        throw new Error("server sent a malformed frame");
      }
      peer.received.push(parsed.data);
    },
    close(code, reason) {
      peer.closedWith = { code, reason };
    },
  };
  return peer;
}

function room(store: MemoryStore = createMemoryStore(), onFailure = vi.fn()): SyncRoom {
  return createSyncRoom({ roomId: "r1", store, logger: silentLogger, onFailure });
}

/** A client-side edit, as the update message a provider sends. */
function edit(text: string, base?: Y.Doc): SyncMessage {
  const doc = base ?? new Y.Doc();
  let update = new Uint8Array();
  doc.once("update", (u: Uint8Array) => {
    update = u;
  });
  doc.getText("codemirror").insert(0, text);
  return { type: "update", update };
}

function textOf(message: SyncMessage | undefined): string {
  const doc = new Y.Doc();
  if (message && "update" in message) {
    Y.applyUpdate(doc, message.update);
  }
  return doc.getText("codemirror").toString();
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("sync room", () => {
  it("restores the stored document and opens with sync step 1", async () => {
    const store = createMemoryStore();
    store.updates.set("r1", [(edit("stored") as { update: Uint8Array }).update]);
    const r = room(store);
    const peer = fakePeer();
    r.addPeer(peer);
    await r.flushed();

    expect(r.doc.getText("codemirror").toString()).toBe("stored");
    expect(peer.received[0]?.type).toBe("sync-step1");
    // Restoring must not store the document a second time.
    expect(store.updates.get("r1")).toHaveLength(1);
  });

  it("stores an update before broadcasting it, and never echoes it to its sender (Invariant 4)", async () => {
    const store = createMemoryStore();
    let release: () => void = () => undefined;
    store.gate = new Promise((resolve) => {
      release = resolve;
    });
    const r = room(store);
    const a = fakePeer();
    const b = fakePeer();
    r.addPeer(a);
    r.addPeer(b);
    await tick();
    a.received.length = 0;
    b.received.length = 0;

    r.handle(a, edit("hi"));
    await tick();
    expect(b.received).toEqual([]);
    expect(store.updates.get("r1")).toBeUndefined();

    release();
    await r.flushed();
    expect(storedText(store, "r1")).toBe("hi");
    expect(b.received.map((m) => m.type)).toEqual(["update"]);
    expect(textOf(b.received[0])).toBe("hi");
    expect(a.received).toEqual([]);
  });

  it("answers sync step 1 only after the updates it contains are stored", async () => {
    const store = createMemoryStore();
    let release: () => void = () => undefined;
    store.gate = new Promise((resolve) => {
      release = resolve;
    });
    const r = room(store);
    const a = fakePeer();
    const b = fakePeer();
    r.addPeer(a);
    r.addPeer(b);
    await tick();
    b.received.length = 0;

    r.handle(a, edit("x"));
    r.handle(b, { type: "sync-step1", stateVector: Y.encodeStateVector(new Y.Doc()) });
    await tick();
    expect(b.received).toEqual([]);

    release();
    await r.flushed();
    expect(b.received.map((m) => m.type)).toEqual(["update", "sync-step2"]);
    expect(textOf(b.received[1])).toBe("x");
  });

  it("closes every peer with 1011 and reports failure when a write fails", async () => {
    const store = createMemoryStore();
    store.failAppend = true;
    const onFailure = vi.fn();
    const r = room(store, onFailure);
    const a = fakePeer();
    const b = fakePeer();
    r.addPeer(a);
    r.addPeer(b);
    await tick();
    b.received.length = 0;

    r.handle(a, edit("lost"));
    r.handle(a, edit("also lost"));
    await r.flushed();

    expect(b.received).toEqual([]);
    expect(a.closedWith).toEqual({ code: 1011, reason: "document storage failed" });
    expect(b.closedWith).toEqual({ code: 1011, reason: "document storage failed" });
    expect(onFailure).toHaveBeenCalledOnce();
  });

  it("fails the room when the stored document can't be loaded", async () => {
    const store = createMemoryStore();
    store.failLoad = true;
    const onFailure = vi.fn();
    const r = room(store, onFailure);
    const peer = fakePeer();
    r.addPeer(peer);
    r.handle(peer, edit("ignored"));
    await r.flushed();

    expect(peer.closedWith?.code).toBe(1011);
    expect(peer.received).toEqual([]);
    expect(onFailure).toHaveBeenCalledOnce();
  });

  it("fails the room when loading throws or the stored bytes are corrupt", async () => {
    for (const breakStore of [
      (store: MemoryStore) => {
        store.load = () => Promise.reject(new Error("disk gone"));
      },
      (store: MemoryStore) => {
        store.load = async () => ({ success: true, data: new Uint8Array([255, 1]) });
      },
    ]) {
      const store = createMemoryStore();
      breakStore(store);
      const onFailure = vi.fn();
      const r = room(store, onFailure);
      const peer = fakePeer();
      r.addPeer(peer);
      await r.flushed();

      expect(peer.closedWith?.code).toBe(1011);
      expect(onFailure).toHaveBeenCalledOnce();
      await expect(r.destroy()).resolves.toBeUndefined();
    }
  });

  it("closes a peer whose update can't be applied", async () => {
    const r = room();
    const peer = fakePeer();
    r.addPeer(peer);
    r.handle(peer, { type: "update", update: new Uint8Array([255]) });
    await r.flushed();

    expect(peer.closedWith).toEqual({ code: 1003, reason: "invalid sync message" });
  });

  it("ignores messages from a peer that already left", async () => {
    const store = createMemoryStore();
    const r = room(store);
    const peer = fakePeer();
    r.addPeer(peer);
    r.removePeer(peer);
    r.handle(peer, edit("late"));
    await r.flushed();

    expect(store.updates.get("r1")).toBeUndefined();
  });

  describe("awareness (Invariant 5)", () => {
    const entries = (awareness: Awareness) => [
      { clientId: awareness.clientID, clock: awareness.meta.get(awareness.clientID)?.clock ?? 0 },
    ];

    function presence(name: string): { awareness: Awareness; message: SyncMessage } {
      const awareness = new Awareness(new Y.Doc());
      awareness.setLocalState({ name });
      return {
        awareness,
        message: {
          type: "awareness",
          update: encodeAwarenessUpdate(awareness, [awareness.clientID]),
          clients: entries(awareness),
        },
      };
    }

    it("relays presence, clears it when its peer leaves and never stores it", async () => {
      const store = createMemoryStore();
      const r = room(store);
      const a = fakePeer();
      const b = fakePeer();
      r.addPeer(a);
      r.addPeer(b);
      const ada = presence("Ada");
      r.handle(a, ada.message);
      await r.flushed();

      expect(r.awareness.getStates().get(ada.awareness.clientID)).toEqual({ name: "Ada" });
      expect(b.received.some((m) => m.type === "awareness")).toBe(true);

      b.received.length = 0;
      r.removePeer(a);
      expect(r.awareness.getStates().size).toBe(0);
      expect(b.received.map((m) => m.type)).toEqual(["awareness"]);
      expect(store.updates.size).toBe(0);
      ada.awareness.destroy();
    });

    it("sends current presence to a joining peer and on request", async () => {
      const r = room();
      const a = fakePeer();
      r.addPeer(a);
      const ada = presence("Ada");
      r.handle(a, ada.message);
      await r.flushed();

      const b = fakePeer();
      r.addPeer(b);
      await r.flushed();
      expect(b.received.map((m) => m.type)).toEqual(["sync-step1", "awareness"]);

      b.received.length = 0;
      r.handle(b, { type: "query-awareness" });
      await r.flushed();
      expect(b.received.map((m) => m.type)).toEqual(["awareness"]);
      ada.awareness.destroy();
    });

    it("rejects an update that sets or clears another connection's presence (Invariant 1)", async () => {
      const r = room();
      const a = fakePeer();
      const b = fakePeer();
      r.addPeer(a);
      r.addPeer(b);
      const ada = presence("Ada");
      r.handle(a, ada.message);
      await r.flushed();

      // An echo of Ada's current state (what y-websocket clients do) is harmless and allowed.
      r.handle(b, ada.message);
      await r.flushed();
      expect(b.closedWith).toBeNull();

      // b sends Ada's client id with a newer clock and a forged name.
      ada.awareness.setLocalState({ name: "Mallory" });
      r.handle(b, {
        type: "awareness",
        update: encodeAwarenessUpdate(ada.awareness, [ada.awareness.clientID]),
        clients: entries(ada.awareness),
      });
      await r.flushed();

      expect(b.closedWith).toEqual({ code: 1003, reason: "invalid sync message" });
      expect(r.awareness.getStates().get(ada.awareness.clientID)).toEqual({ name: "Ada" });
      ada.awareness.destroy();
    });

    it("sends nothing on a query when nobody is present", async () => {
      const r = room();
      const a = fakePeer();
      r.addPeer(a);
      await r.flushed();
      a.received.length = 0;

      r.handle(a, { type: "query-awareness" });
      await r.flushed();
      expect(a.received).toEqual([]);
    });
  });

  it("destroy() waits for pending writes", async () => {
    const store = createMemoryStore();
    let release: () => void = () => undefined;
    store.gate = new Promise((resolve) => {
      release = resolve;
    });
    const r = room(store);
    const peer = fakePeer();
    r.addPeer(peer);
    r.handle(peer, edit("keep"));
    await tick();

    const destroyed = r.destroy();
    release();
    await destroyed;
    expect(storedText(store, "r1")).toBe("keep");
  });
});
