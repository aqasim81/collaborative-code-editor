import { type PresenceUser, presenceUser } from "@collab-editor/shared";
import { describe, expect, it, vi } from "vitest";
import { Awareness, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import * as Y from "yjs";
import { encodeAwareness, parseSyncMessage, type SyncMessage } from "../../src/sync/protocol";
import {
  createSyncRoom,
  type Peer,
  PRESENCE_ID_TTL_MS,
  type PresenceBinding,
  prunePresenceIds,
  type SyncRoom,
} from "../../src/sync/sync-room";
import { silentLogger } from "../helpers/logger";
import { createMemoryStore, type MemoryStore, storedText } from "../helpers/stores";

interface FakePeer extends Peer {
  received: SyncMessage[];
  closedWith: { code: number; reason: string } | null;
}

const ADA = presenceUser({ id: "user-ada", name: "Ada", image: null });
const MALLORY = presenceUser({ id: "user-mallory", name: "Mallory", image: null });

function fakePeer(user: PresenceUser = ADA): FakePeer {
  const peer: FakePeer = {
    user,
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
    function presence(state: Record<string, unknown> = { cursor: null }): Awareness {
      const awareness = new Awareness(new Y.Doc());
      awareness.setLocalState(state);
      return awareness;
    }

    /** The awareness message a client sends for `ids` (its own id by default), as the server parses it. */
    function announce(awareness: Awareness, ids = [awareness.clientID]): SyncMessage {
      const parsed = parseSyncMessage(encodeAwareness(encodeAwarenessUpdate(awareness, ids)));
      if (!parsed.success) {
        throw new Error(parsed.error);
      }
      return parsed.data;
    }

    /** A client-side Awareness holding `clientId` at a given clock and state, e.g. to forge an update. */
    function forged(
      clientId: number,
      clock: number,
      state: Record<string, unknown> | null,
    ): Awareness {
      const awareness = new Awareness(new Y.Doc());
      awareness.setLocalState(null);
      awareness.states.set(clientId, state ?? {});
      awareness.meta.set(clientId, { clock, lastUpdated: 0 });
      if (state === null) {
        awareness.states.delete(clientId);
      }
      return awareness;
    }

    const clockOf = (r: SyncRoom, id: number) => r.awareness.meta.get(id)?.clock ?? -1;

    it("relays presence, clears it when its peer leaves and never stores it", async () => {
      const store = createMemoryStore();
      const r = room(store);
      const a = fakePeer();
      const b = fakePeer();
      r.addPeer(a);
      r.addPeer(b);
      const ada = presence();
      r.handle(a, announce(ada));
      await r.flushed();

      expect(r.awareness.getStates().get(ada.clientID)).toEqual({ cursor: null, user: ADA });
      expect(b.received.some((m) => m.type === "awareness")).toBe(true);

      b.received.length = 0;
      r.removePeer(a);
      expect(r.awareness.getStates().size).toBe(0);
      expect(b.received.map((m) => m.type)).toEqual(["awareness"]);
      expect(store.updates.size).toBe(0);
      ada.destroy();
    });

    it("sends current presence to a joining peer and on request", async () => {
      const r = room();
      const a = fakePeer();
      r.addPeer(a);
      const ada = presence();
      r.handle(a, announce(ada));
      await r.flushed();

      const b = fakePeer();
      r.addPeer(b);
      await r.flushed();
      expect(b.received.map((m) => m.type)).toEqual(["sync-step1", "awareness"]);

      b.received.length = 0;
      r.handle(b, { type: "query-awareness" });
      await r.flushed();
      expect(b.received.map((m) => m.type)).toEqual(["awareness"]);
      ada.destroy();
    });

    it("ignores an update that changes another user's presence (Invariant 1)", async () => {
      const r = room();
      const a = fakePeer();
      const b = fakePeer(MALLORY);
      r.addPeer(a);
      r.addPeer(b);
      const ada = presence();
      r.handle(a, announce(ada));
      // A y-websocket client announces itself before it echoes anything.
      const own = presence();
      r.handle(b, announce(own));
      await r.flushed();

      // An echo of Ada's current state (what y-websocket clients do) is harmless and allowed.
      r.handle(b, announce(ada));
      await r.flushed();
      expect(b.closedWith).toBeNull();

      // b sends Ada's client id with a newer clock: dropped, whatever b meant by it.
      ada.setLocalState({ note: "forged" });
      r.handle(b, announce(ada));
      await r.flushed();

      expect(r.awareness.getStates().get(ada.clientID)).toEqual({ cursor: null, user: ADA });
      ada.destroy();
      own.destroy();
    });

    it("ignores a same-clock null for another user's presence, without closing the sender (#32, audit)", async () => {
      const r = room();
      const a = fakePeer();
      const b = fakePeer(MALLORY);
      r.addPeer(a);
      r.addPeer(b);
      const ada = presence();
      r.handle(a, announce(ada));
      await r.flushed();

      // What an honest y-websocket client echoes after its own 30 s timeout dropped Ada first.
      const removal = forged(ada.clientID, clockOf(r, ada.clientID), null);
      r.handle(b, announce(removal, [ada.clientID]));
      await r.flushed();

      expect(b.closedWith).toBeNull();
      expect(r.awareness.getStates().has(ada.clientID)).toBe(true);
      ada.destroy();
      removal.destroy();
    });

    it("gives the presence back to a reconnecting client and clears it when that connection closes (#32)", async () => {
      const r = room();
      const first = fakePeer();
      const other = fakePeer(MALLORY);
      r.addPeer(first);
      r.addPeer(other);
      const ada = presence();
      r.handle(first, announce(ada));
      await r.flushed();
      r.removePeer(first);
      expect(r.awareness.getStates().has(ada.clientID)).toBe(false);

      // Same client id on a new connection; the client re-announces with a newer clock.
      const second = fakePeer();
      r.addPeer(second);
      ada.setLocalState(ada.getLocalState());
      r.handle(second, announce(ada));
      await r.flushed();
      expect(r.awareness.getStates().has(ada.clientID)).toBe(true);

      // Nobody else may take it over now...
      const hijack = forged(ada.clientID, clockOf(r, ada.clientID) + 1, { note: "forged" });
      r.handle(other, announce(hijack, [ada.clientID]));
      await r.flushed();
      expect(r.awareness.getStates().get(ada.clientID)?.user).toEqual(ADA);

      // ...and it goes when its connection does.
      r.removePeer(second);
      expect(r.awareness.getStates().has(ada.clientID)).toBe(false);
      ada.destroy();
      hijack.destroy();
    });

    it("moves a presence to the same user's new connection while the old one is still open (#32, #33)", async () => {
      const r = room();
      const stale = fakePeer();
      r.addPeer(stale);
      const ada = presence();
      r.handle(stale, announce(ada));
      await r.flushed();

      // The client lost its socket without the server noticing, and is back on a new one.
      const fresh = fakePeer();
      r.addPeer(fresh);
      ada.setLocalState(ada.getLocalState());
      r.handle(fresh, announce(ada));
      await r.flushed();
      expect(fresh.closedWith).toBeNull();

      // The dead connection going away no longer takes the presence with it; the live one does.
      r.removePeer(stale);
      expect(r.awareness.getStates().has(ada.clientID)).toBe(true);
      r.removePeer(fresh);
      expect(r.awareness.getStates().has(ada.clientID)).toBe(false);
      ada.destroy();
    });

    it("releases presence the server timed out, so its client can claim it again (#32)", async () => {
      const r = room();
      const a = fakePeer();
      const b = fakePeer();
      r.addPeer(a);
      r.addPeer(b);
      const ada = presence();
      r.handle(a, announce(ada));
      await r.flushed();

      // What the server's 30 s outdated-state sweep does.
      removeAwarenessStates(r.awareness, [ada.clientID], "timeout");

      // The same client, back on another connection, owns it again.
      ada.setLocalState(ada.getLocalState());
      r.handle(b, announce(ada));
      await r.flushed();
      expect(b.closedWith).toBeNull();
      expect(r.awareness.getStates().has(ada.clientID)).toBe(true);
      ada.destroy();
    });

    it("lets a connection own a single presence (#32)", async () => {
      const r = room();
      const a = fakePeer();
      r.addPeer(a);
      const ada = presence();
      r.handle(a, announce(ada));
      await r.flushed();

      const extra = presence();
      r.handle(a, announce(extra));
      await r.flushed();

      expect(r.awareness.getStates().has(extra.clientID)).toBe(false);
      expect(r.awareness.getStates().has(ada.clientID)).toBe(true);
      ada.destroy();
      extra.destroy();
    });

    it("keeps only the first of several new presences in one update (#32)", async () => {
      const r = room();
      const a = fakePeer();
      r.addPeer(a);
      const one = presence();
      const two = presence();
      const both = forged(one.clientID, 1, { cursor: null });
      both.states.set(two.clientID, { cursor: null });
      both.meta.set(two.clientID, { clock: 1, lastUpdated: 0 });

      r.handle(a, announce(both, [one.clientID, two.clientID]));
      await r.flushed();

      expect([...r.awareness.getStates().keys()]).toEqual([one.clientID]);
      [one, two, both].forEach((x) => {
        x.destroy();
      });
    });

    it("keeps a presence id bound to its user after that user leaves (audit)", async () => {
      const r = room();
      const first = fakePeer();
      const mallory = fakePeer(MALLORY);
      r.addPeer(first);
      r.addPeer(mallory);
      const ada = presence();
      r.handle(first, announce(ada));
      const own = presence();
      r.handle(mallory, announce(own));
      await r.flushed();
      r.removePeer(first);

      // Mallory races Ada's reconnect for her id, from her open connection and from a new one.
      const hijack = forged(ada.clientID, 2 ** 40, { note: "forged" });
      r.handle(mallory, announce(hijack, [ada.clientID]));
      const fresh = fakePeer(MALLORY);
      r.addPeer(fresh);
      r.handle(fresh, announce(hijack, [ada.clientID]));
      await r.flushed();
      expect(r.awareness.getStates().has(ada.clientID)).toBe(false);

      // Ada comes back and is herself again.
      const back = fakePeer();
      r.addPeer(back);
      ada.setLocalState(ada.getLocalState());
      r.handle(back, announce(ada));
      await r.flushed();
      expect(r.awareness.getStates().get(ada.clientID)?.user).toEqual(ADA);
      [ada, own, hijack].forEach((x) => {
        x.destroy();
      });
    });

    it("keeps nothing for removals of presences the room has never had (audit)", async () => {
      const r = room();
      const a = fakePeer();
      r.addPeer(a);
      await r.flushed();
      const before = r.awareness.meta.size;

      const ghosts = new Awareness(new Y.Doc());
      ghosts.setLocalState(null);
      const ids = Array.from({ length: 100 }, (_, i) => 1_000_000 + i);
      for (const id of ids) {
        ghosts.meta.set(id, { clock: 5, lastUpdated: 0 });
      }
      r.handle(a, announce(ghosts, ids));
      await r.flushed();

      expect(r.awareness.meta.size).toBe(before);
      ghosts.destroy();
    });

    /** A room with a small per-user memory, optionally sharing its id bindings with another instance. */
    function smallRoom(presenceIds = new Map<number, PresenceBinding>()): SyncRoom {
      return createSyncRoom({
        roomId: "r1",
        store: createMemoryStore(),
        logger: silentLogger,
        onFailure: vi.fn(),
        maxPresenceIdsPerUser: 2,
        presenceIds,
      });
    }

    async function join(r: SyncRoom, user: PresenceUser, awareness = presence()) {
      const peer = fakePeer(user);
      r.addPeer(peer);
      r.handle(peer, announce(awareness));
      await r.flushed();
      return { peer, awareness };
    }

    async function claim(r: SyncRoom, user: PresenceUser, clientId: number): Promise<void> {
      const hijack = forged(clientId, 2 ** 40, { note: "forged" });
      const peer = fakePeer(user);
      r.addPeer(peer);
      r.handle(peer, announce(hijack, [clientId]));
      await r.flushed();
      hijack.destroy();
    }

    it("forgets a user's own oldest absent ids when that user has too many", async () => {
      const r = smallRoom();
      const first = await join(r, ADA);
      r.removePeer(first.peer);
      const second = await join(r, ADA);
      r.removePeer(second.peer);

      // A third id from the same user pushes out the first, which has left.
      const third = await join(r, ADA);
      expect(r.awareness.meta.has(first.awareness.clientID)).toBe(false);
      expect(r.awareness.meta.has(second.awareness.clientID)).toBe(true);
      expect(r.awareness.getStates().has(third.awareness.clientID)).toBe(true);
      [first, second, third].forEach((x) => {
        x.awareness.destroy();
      });
    });

    it("never lets another user's churn free an id, present or absent (audit)", async () => {
      const r = smallRoom();
      const ada = await join(r, ADA);
      const id = ada.awareness.clientID;
      // Ada's tab goes quiet: the server times her out while her socket stays open.
      removeAwarenessStates(r.awareness, [id], "timeout");

      // Mallory churns through many ids of her own, then claims Ada's.
      for (let i = 0; i < 5; i++) {
        const m = await join(r, MALLORY);
        r.removePeer(m.peer);
        m.awareness.destroy();
      }
      await claim(r, MALLORY, id);
      expect(r.awareness.getStates().has(id)).toBe(false);

      // Ada's client re-announces and is herself; Mallory still can't take the id.
      ada.awareness.setLocalState(ada.awareness.getLocalState());
      r.handle(ada.peer, announce(ada.awareness));
      await r.flushed();
      await claim(r, MALLORY, id);
      expect(r.awareness.getStates().get(id)?.user).toEqual(ADA);

      // The same holds while Ada is between sockets (a 4001 ticket refresh).
      r.removePeer(ada.peer);
      for (let i = 0; i < 5; i++) {
        const m = await join(r, MALLORY);
        r.removePeer(m.peer);
        m.awareness.destroy();
      }
      await claim(r, MALLORY, id);
      expect(r.awareness.getStates().has(id)).toBe(false);
      ada.awareness.destroy();
    });

    it("tells a new connection whose first presence uses another user's id to take a new one (audit)", async () => {
      const r = room();
      const mallory = fakePeer(MALLORY);
      r.addPeer(mallory);
      const squat = presence();
      r.handle(mallory, announce(squat));
      await r.flushed();

      // After a server restart Ada's tab comes back second with the id Mallory now holds.
      const ada = fakePeer();
      r.addPeer(ada);
      const victim = forged(squat.clientID, 2 ** 20, { cursor: null });
      r.handle(ada, announce(victim, [squat.clientID]));
      await r.flushed();

      expect(ada.closedWith).toEqual({ code: 4002, reason: "presence id in use" });

      // Also when the squatter matched the exact clock the victim announces with (audit).
      const again = fakePeer();
      r.addPeer(again);
      const exact = forged(squat.clientID, clockOf(r, squat.clientID), { cursor: null });
      r.handle(again, announce(exact, [squat.clientID]));
      await r.flushed();
      expect(again.closedWith?.code).toBe(4002);
      exact.destroy();
      // A connection that already has its own id only has the entry dropped.
      const bob = fakePeer();
      r.addPeer(bob);
      const own = presence();
      r.handle(bob, announce(own));
      r.handle(bob, announce(victim, [squat.clientID]));
      await r.flushed();
      expect(bob.closedWith).toBeNull();
      expect(r.awareness.getStates().get(squat.clientID)?.user).toEqual(MALLORY);
      [squat, victim, own].forEach((x) => {
        x.destroy();
      });
    });

    it("forgets id bindings nobody has used for an hour", async () => {
      const bindings = new Map<number, PresenceBinding>([
        [1, { userId: "user-ada", seenAt: 0 }],
        [2, { userId: "user-ada", seenAt: PRESENCE_ID_TTL_MS }],
      ]);

      prunePresenceIds(bindings, PRESENCE_ID_TTL_MS + 1);

      expect([...bindings.keys()]).toEqual([2]);
    });

    it("keeps id bindings across instances of the same room (audit)", async () => {
      const bindings = new Map<number, PresenceBinding>();
      const before = smallRoom(bindings);
      const ada = await join(before, ADA);
      before.removePeer(ada.peer);
      await before.destroy();

      // The empty room was destroyed; Mallory is first back and goes for Ada's id.
      const after = smallRoom(bindings);
      await claim(after, MALLORY, ada.awareness.clientID);
      expect(after.awareness.getStates().has(ada.awareness.clientID)).toBe(false);
      ada.awareness.destroy();
    });

    it("shows the connection's ticket identity, whatever user the client claims (#32)", async () => {
      const r = room();
      const a = fakePeer();
      const b = fakePeer();
      r.addPeer(a);
      r.addPeer(b);
      const mallory = presence({
        cursor: null,
        user: { id: "user-ada", name: "Ada?", color: "#000" },
      });
      const spoofer = fakePeer(MALLORY);
      r.addPeer(spoofer);
      r.handle(spoofer, announce(mallory));
      await r.flushed();

      const shown = r.awareness.getStates().get(mallory.clientID);
      expect(shown?.user).toEqual(MALLORY);
      expect(shown?.cursor).toBeNull();
      mallory.destroy();
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
