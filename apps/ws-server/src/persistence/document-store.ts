import { mkdirSync } from "node:fs";
import level from "level";
import { LeveldbPersistence } from "y-leveldb";
import * as Y from "yjs";
import type { Result } from "../result";

/** Durable storage for room documents (Invariant 4). Only Yjs document updates go here, never awareness. */
export interface DocumentStore {
  /** Every stored update for the room, merged into one; an empty update for a room never stored. */
  load(roomId: string): Promise<Result<Uint8Array>>;
  /** Appends one update. Resolves only once it is written. */
  append(roomId: string, update: Uint8Array): Promise<Result<void>>;
  /** Waits for pending writes, then releases the database. */
  close(): Promise<void>;
}

/**
 * Opens (creating if needed) a LevelDB document store through y-leveldb. Fails instead of crashing when
 * the database can't be opened, e.g. when another process holds its lock.
 */
export async function openLevelDbStore(location: string): Promise<Result<DocumentStore>> {
  try {
    mkdirSync(location, { recursive: true });
  } catch (error) {
    return { success: false, error: `could not create ${location}: ${(error as Error).message}` };
  }

  let settle: (error: Error | null) => void = () => undefined;
  const opened = new Promise<Error | null>((resolve) => {
    settle = resolve;
  });
  // Passing an open callback keeps level from emitting an unhandled 'error' event on failure.
  const persistence = new LeveldbPersistence(location, {
    level: (path: string, options: object) =>
      level(path, options, (error) => settle(error ?? null)),
  });
  const openError = await opened;
  if (openError) {
    return { success: false, error: `could not open ${location}: ${openError.message}` };
  }

  // y-leveldb logs and swallows transaction errors, resolving with null instead of rejecting.
  return {
    success: true,
    data: {
      async load(roomId) {
        const doc = await persistence.getYDoc(roomId);
        if (!doc) {
          return { success: false, error: `could not load room ${roomId}` };
        }
        const update = Y.encodeStateAsUpdate(doc);
        doc.destroy();
        return { success: true, data: update };
      },
      async append(roomId, update) {
        const clock = await persistence.storeUpdate(roomId, update);
        if (typeof clock !== "number") {
          return { success: false, error: `could not store an update for room ${roomId}` };
        }
        return { success: true, data: undefined };
      },
      close: () => persistence.destroy(),
    },
  };
}
