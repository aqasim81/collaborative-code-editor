import { PRESENCE_ID_TAKEN_CLOSE_CODE, type PresenceUser } from "@collab-editor/shared";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import * as Y from "yjs";
import type { Logger } from "../logger";
import type { DocumentStore } from "../persistence/document-store";
import {
  type AwarenessEntry,
  encodeAwareness,
  encodeAwarenessEntries,
  encodeSyncStep1,
  encodeSyncStep2,
  encodeUpdate,
  type SyncMessage,
} from "./protocol";

/** One connection as the room sees it. */
export interface Peer {
  /** Who is connected, from the verified ticket: every presence this peer sends is shown as this user. */
  readonly user: PresenceUser;
  send(data: Uint8Array): void;
  /** Starts closing the connection; the server removes the peer from the room as it does. */
  close(code: number, reason: string): void;
}

export interface SyncRoom {
  readonly doc: Y.Doc;
  /** Presence only: never persisted (Invariant 5). */
  readonly awareness: Awareness;
  addPeer(peer: Peer): void;
  /** Drops the peer and clears the awareness state it controlled (Invariant 5). */
  removePeer(peer: Peer): void;
  handle(peer: Peer, message: SyncMessage): void;
  /** Resolves once every update applied so far is persisted and broadcast, or the room failed. */
  flushed(): Promise<void>;
  destroy(): Promise<void>;
}

export interface SyncRoomOptions {
  roomId: string;
  store: DocumentStore;
  logger: Logger;
  /** Called once when the document can't be loaded or stored; the room must be discarded. */
  onFailure: () => void;
  /** A previous instance of this room that is still flushing; loading waits for it. */
  previous?: Promise<void>;
  /** How many client ids the room remembers per user (default `MAX_PRESENCE_IDS_PER_USER`). */
  maxPresenceIdsPerUser?: number;
  /**
   * The user each awareness client id belongs to. Owned by the caller so it outlives this instance: an
   * empty room is destroyed after its grace period, and the next instance must still know whose id is whose.
   */
  presenceIds?: Map<number, PresenceBinding>;
  /** Clock for binding timestamps; injectable for tests. */
  now?: () => number;
}

/** Close code sent to every peer when the room's document can't be loaded or stored. */
export const STORAGE_FAILURE_CLOSE_CODE = 1011;
export const INVALID_MESSAGE_CLOSE_CODE = 1003;

/**
 * Client ids a room remembers per user after they leave. Each tab or reload is a new id; past the cap the
 * user's own oldest ids that nobody is using are forgotten, so one user can never push out another's.
 */
export const MAX_PRESENCE_IDS_PER_USER = 100;

/** A binding nobody has announced for this long is forgotten (a live client renews every 15 s). */
export const PRESENCE_ID_TTL_MS = 60 * 60 * 1000;

/** Whose awareness client id this is, and when it was last announced. */
export interface PresenceBinding {
  userId: string;
  seenAt: number;
}

/** Forgets the bindings of a room that nobody has announced for `PRESENCE_ID_TTL_MS`. */
export function prunePresenceIds(ids: Map<number, PresenceBinding>, now: number): void {
  for (const [id, { seenAt }] of ids) {
    if (now - seenAt > PRESENCE_ID_TTL_MS) {
      ids.delete(id);
    }
  }
}

// Marks the update that restores the stored document, so it isn't stored again.
const LOAD_ORIGIN = Symbol("load");

/**
 * Server-side Yjs replica of one room. Yjs is the source of truth (Invariant 3): peers exchange sync
 * messages with this Y.Doc, and every update it produces is written to the store before it is broadcast
 * or included in a sync reply (Invariant 4).
 */
export function createSyncRoom({
  roomId,
  store,
  logger,
  onFailure,
  previous = Promise.resolve(),
  maxPresenceIdsPerUser = MAX_PRESENCE_IDS_PER_USER,
  presenceIds: idUsers = new Map(),
  now = () => Date.now(),
}: SyncRoomOptions): SyncRoom {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  // The server has no presence of its own.
  awareness.setLocalState(null);
  const peers = new Set<Peer>();
  // The peer that controls each awareness client id: it last set that id's state, and closing it clears it.
  const owners = new Map<number, Peer>();
  // The one client id each peer speaks for: the first it announced (a y-websocket client has one).
  const peerIds = new Map<Peer, number>();
  let failed = false;

  function fail(reason: string): void {
    if (failed) {
      return;
    }
    failed = true;
    logger.error({ roomId, reason }, "room storage failed, closing its connections");
    // A copy: closing a peer removes it from `peers`.
    for (const peer of [...peers]) {
      peer.close(STORAGE_FAILURE_CLOSE_CODE, "document storage failed");
    }
    onFailure();
  }

  const ready: Promise<void> = previous
    .then(() => store.load(roomId))
    .then((loaded) => {
      if (!loaded.success) {
        fail(loaded.error);
        return;
      }
      Y.applyUpdate(doc, loaded.data, LOAD_ORIGIN);
    })
    // A throwing store or corrupt stored bytes must fail the room, not leave it half-open.
    .catch((error: unknown) => fail(`could not restore the document: ${(error as Error).message}`));

  // Serialises writes and everything that must only happen after them.
  let persisted: Promise<void> = ready;
  function afterPersisted(task: () => Promise<void> | void): void {
    persisted = persisted.then(async () => {
      if (failed) {
        return;
      }
      try {
        await task();
      } catch (error) {
        fail((error as Error).message);
      }
    });
  }

  /** Runs a handler after the stored document is loaded, in arrival order. */
  function whenReady(peer: Peer, task: () => void): void {
    void ready.then(() => {
      if (failed || !peers.has(peer)) {
        return;
      }
      try {
        task();
      } catch (error) {
        logger.warn({ roomId, err: error }, "sync message could not be applied");
        peer.close(INVALID_MESSAGE_CLOSE_CODE, "invalid sync message");
      }
    });
  }

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin === LOAD_ORIGIN) {
      return;
    }
    const message = encodeUpdate(update);
    afterPersisted(async () => {
      const stored = await store.append(roomId, update);
      if (!stored.success) {
        fail(stored.error);
        return;
      }
      for (const peer of peers) {
        if (peer !== origin) {
          peer.send(message);
        }
      }
    });
  });

  awareness.on(
    "update",
    (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      // `updated` counts too: a client reconnecting with its old id lands there, not in `added`.
      if (peers.has(origin as Peer)) {
        for (const id of [...added, ...updated]) owners.set(id, origin as Peer);
      }
      // Whoever removed it (its peer leaving, or the 30 s timeout), a removed id has no owner.
      for (const id of removed) owners.delete(id);
      const message = encodeAwareness(
        encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]),
      );
      for (const peer of peers) {
        peer.send(message);
      }
    },
  );

  async function flushed(): Promise<void> {
    let current: Promise<void>;
    do {
      current = persisted;
      await current;
    } while (current !== persisted);
  }

  /**
   * Binds `clientId` to `userId`, most recently used last. Returns false when the user already has the
   * maximum and none of their ids can be forgotten (all present or spoken for by an open connection).
   */
  function rememberUser(clientId: number, userId: string): boolean {
    const known = idUsers.has(clientId);
    idUsers.delete(clientId);
    if (!known) {
      const theirs = [...idUsers].filter(([, b]) => b.userId === userId).map(([id]) => id);
      if (theirs.length >= maxPresenceIdsPerUser) {
        const inUse = new Set(peerIds.values());
        const stale = theirs.find((id) => !awareness.states.has(id) && !inUse.has(id));
        if (stale === undefined) {
          return false;
        }
        idUsers.delete(stale);
        awareness.meta.delete(stale);
      }
    }
    idUsers.set(clientId, { userId, seenAt: now() });
    return true;
  }

  /**
   * The entries of an awareness update from `peer` that may be applied (Invariant 1); the rest are
   * dropped, not punished, because honest y-websocket clients send some of them (echoes of what the
   * server already has, removals after their own 30 s timeout). A peer speaks for one client id, the
   * first it announces, and only while no other user has held that id in this room. Another connection
   * of the same user may take an id over: a client that lost its socket comes back on a new one before
   * the server notices the old one is gone. Removals only count for a presence that exists, so no
   * metadata is kept for ids the room has never had.
   */
  function acceptedEntries(
    peer: Peer,
    clients: AwarenessEntry[],
  ): { accepted: AwarenessEntry[]; idTaken: boolean } {
    const accepted: AwarenessEntry[] = [];
    for (const entry of clients) {
      const { clientId, clock, state } = entry;
      const user = idUsers.get(clientId)?.userId;
      const othersId = user !== undefined && user !== peer.user.id;
      let bound = peerIds.get(peer);
      // A connection's first presence is its own client id (y-websocket announces itself before it echoes
      // anything), whatever its clock and whether or not it changes anything. If another user holds that
      // id (a collision, or someone who took it while the server's memory was empty), the client must
      // pick a new one.
      if (state !== null && bound === undefined) {
        if (othersId) {
          return { accepted: [], idTaken: true };
        }
        if (!rememberUser(clientId, peer.user.id)) {
          continue;
        }
        peerIds.set(peer, clientId);
        bound = clientId;
      }
      const current = awareness.meta.get(clientId)?.clock ?? 0;
      const applies =
        state === null ? awareness.states.has(clientId) && clock >= current : clock > current;
      if (!applies || othersId || bound !== clientId) {
        continue;
      }
      if (state !== null) {
        // Keeps the binding fresh (known ids always fit).
        rememberUser(clientId, peer.user.id);
      }
      accepted.push(entry);
    }
    return { accepted, idTaken: false };
  }

  function sendAwarenessStates(peer: Peer): void {
    const clients = [...awareness.getStates().keys()];
    if (clients.length > 0) {
      peer.send(encodeAwareness(encodeAwarenessUpdate(awareness, clients)));
    }
  }

  return {
    doc,
    awareness,
    addPeer(peer) {
      peers.add(peer);
      whenReady(peer, () => {
        peer.send(encodeSyncStep1(doc));
        sendAwarenessStates(peer);
      });
    },
    removePeer(peer) {
      // Already gone: the server drops a peer when it starts closing it, and again on `close`.
      if (!peers.delete(peer)) {
        return;
      }
      peerIds.delete(peer);
      const controlled = [...owners].filter(([, owner]) => owner === peer).map(([id]) => id);
      if (controlled.length > 0) {
        removeAwarenessStates(awareness, controlled, null);
      }
    },
    handle(peer, message) {
      whenReady(peer, () => {
        switch (message.type) {
          case "sync-step1": {
            // Encoded now, so it holds exactly the updates already queued for storage; sent after them.
            const reply = encodeSyncStep2(Y.encodeStateAsUpdate(doc, message.stateVector));
            afterPersisted(() => peer.send(reply));
            return;
          }
          case "sync-step2":
          case "update":
            Y.applyUpdate(doc, message.update, peer);
            return;
          case "awareness": {
            const { accepted, idTaken } = acceptedEntries(peer, message.clients);
            if (idTaken) {
              logger.info(
                { roomId },
                "presence id held by another user, asking the client for a new one",
              );
              peer.close(PRESENCE_ID_TAKEN_CLOSE_CODE, "presence id in use");
              return;
            }
            if (accepted.length < message.clients.length) {
              logger.debug(
                { roomId, dropped: message.clients.length - accepted.length },
                "awareness entries dropped",
              );
            }
            if (accepted.length === 0) {
              return;
            }
            // The identity others see is the ticket's, never what the client claims.
            const update = encodeAwarenessEntries(
              accepted.map((entry) => ({
                ...entry,
                state: entry.state && { ...entry.state, user: peer.user },
              })),
            );
            applyAwarenessUpdate(awareness, update, peer);
            return;
          }
          case "query-awareness":
            sendAwarenessStates(peer);
            return;
        }
      });
    },
    flushed,
    async destroy() {
      await flushed();
      awareness.destroy();
      doc.destroy();
    },
  };
}
