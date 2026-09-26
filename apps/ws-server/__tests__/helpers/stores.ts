import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as Y from "yjs";
import type { DocumentStore } from "../../src/persistence/document-store";
import type { Result } from "../../src/result";

export interface MemoryStore extends DocumentStore {
  /** Updates in write order, per room. */
  updates: Map<string, Uint8Array[]>;
  closed: boolean;
  /** When set, every write waits for it before completing. */
  gate: Promise<void> | null;
  failLoad: boolean;
  failAppend: boolean;
}

/** In-memory document store with hooks to hold or fail writes. */
export function createMemoryStore(): MemoryStore {
  const store: MemoryStore = {
    updates: new Map(),
    closed: false,
    gate: null,
    failLoad: false,
    failAppend: false,
    async load(roomId): Promise<Result<Uint8Array>> {
      if (store.failLoad) {
        return { success: false, error: "load failed" };
      }
      return { success: true, data: Y.mergeUpdates(store.updates.get(roomId) ?? []) };
    },
    async append(roomId, update): Promise<Result<void>> {
      if (store.gate) {
        await store.gate;
      }
      if (store.failAppend) {
        return { success: false, error: "append failed" };
      }
      store.updates.set(roomId, [...(store.updates.get(roomId) ?? []), update]);
      return { success: true, data: undefined };
    },
    async close() {
      store.closed = true;
    },
  };
  return store;
}

/** The text a store would restore for a room. */
export function storedText(store: MemoryStore, roomId: string, name = "codemirror"): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, Y.mergeUpdates(store.updates.get(roomId) ?? []));
  return doc.getText(name).toString();
}

/** A fresh temporary directory, removed by the returned cleanup. */
export function tempDir(): { path: string; remove: () => void } {
  const path = mkdtempSync(join(tmpdir(), "ws-server-test-"));
  return { path, remove: () => rmSync(path, { recursive: true, force: true }) };
}
