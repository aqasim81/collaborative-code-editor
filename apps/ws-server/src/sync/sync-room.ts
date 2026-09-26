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
  encodeSyncStep1,
  encodeSyncStep2,
  encodeUpdate,
  type SyncMessage,
} from "./protocol";

/** One connection as the room sees it. */
export interface Peer {
  send(data: Uint8Array): void;
  close(code: number, reason: string): void;
}

export interface SyncRoom {
  readonly doc: Y.Doc;
  /** Presence only: never persisted (Invariant 5). */
  readonly awareness: Awareness;
  addPeer(peer: Peer): void;
  /** Drops the peer and clears the awareness states it controlled (Invariant 5). */
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
}

/** Close code sent to every peer when the room's document can't be loaded or stored. */
export const STORAGE_FAILURE_CLOSE_CODE = 1011;
export const INVALID_MESSAGE_CLOSE_CODE = 1003;

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
}: SyncRoomOptions): SyncRoom {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);
  // The server has no presence of its own.
  awareness.setLocalState(null);
  // Each peer with the awareness client ids it controls.
  const peers = new Map<Peer, Set<number>>();
  let failed = false;

  function fail(reason: string): void {
    if (failed) {
      return;
    }
    failed = true;
    logger.error({ roomId, reason }, "room storage failed, closing its connections");
    for (const peer of peers.keys()) {
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
      for (const peer of peers.keys()) {
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
      const controlled = peers.get(origin as Peer);
      if (controlled) {
        for (const id of added) controlled.add(id);
        for (const id of removed) controlled.delete(id);
      }
      const message = encodeAwareness(
        encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]),
      );
      for (const peer of peers.keys()) {
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
   * A peer may not change presence another connected peer controls. y-websocket clients echo the
   * awareness they receive, so an entry for such a client is allowed only when it is not newer than the
   * server's copy, which makes applying it a no-op.
   */
  function changesOthersPresence(peer: Peer, clients: AwarenessEntry[]): boolean {
    return clients.some(({ clientId, clock }) => {
      for (const [other, controlled] of peers) {
        if (other !== peer && controlled.has(clientId)) {
          return clock > (awareness.meta.get(clientId)?.clock ?? -1);
        }
      }
      return false;
    });
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
      peers.set(peer, new Set());
      whenReady(peer, () => {
        peer.send(encodeSyncStep1(doc));
        sendAwarenessStates(peer);
      });
    },
    removePeer(peer) {
      const controlled = peers.get(peer);
      peers.delete(peer);
      if (controlled && controlled.size > 0) {
        removeAwarenessStates(awareness, [...controlled], null);
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
          case "awareness":
            if (changesOthersPresence(peer, message.clients)) {
              logger.warn({ roomId }, "awareness update for another connection's client rejected");
              peer.close(INVALID_MESSAGE_CLOSE_CODE, "invalid sync message");
              return;
            }
            applyAwarenessUpdate(awareness, message.update, peer);
            return;
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
