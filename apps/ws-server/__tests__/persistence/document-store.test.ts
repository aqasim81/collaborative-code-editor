import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LeveldbPersistence } from "y-leveldb";
import * as Y from "yjs";
import { type DocumentStore, openLevelDbStore } from "../../src/persistence/document-store";
import { tempDir } from "../helpers/stores";

let dir: ReturnType<typeof tempDir>;

async function open(path = dir.path): Promise<DocumentStore> {
  const store = await openLevelDbStore(path);
  if (!store.success) {
    throw new Error(store.error);
  }
  return store.data;
}

function textOf(update: Uint8Array): string {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, update);
  return doc.getText("t").toString();
}

describe("LevelDB document store", () => {
  beforeEach(() => {
    dir = tempDir();
  });
  afterEach(() => {
    dir.remove();
  });

  it("loads an empty document for a room never stored", async () => {
    const store = await open();
    const loaded = await store.load("room-1");

    expect(loaded.success && textOf(loaded.data)).toBe("");
    await store.close();
  });

  it("stores updates and restores them after reopening", async () => {
    const doc = new Y.Doc();
    const updates: Uint8Array[] = [];
    doc.on("update", (update: Uint8Array) => updates.push(update));
    doc.getText("t").insert(0, "hello");
    doc.getText("t").insert(5, " world");

    const store = await open();
    for (const update of updates) {
      expect(await store.append("room-1", update)).toEqual({ success: true, data: undefined });
    }
    await store.close();

    const reopened = await open();
    const loaded = await reopened.load("room-1");
    expect(loaded.success && textOf(loaded.data)).toBe("hello world");
    const other = await reopened.load("room-2");
    expect(other.success && textOf(other.data)).toBe("");
    await reopened.close();
  });

  it("creates missing parent directories", async () => {
    const store = await open(join(dir.path, "nested", "db"));
    expect((await store.load("r")).success).toBe(true);
    await store.close();
  });

  it("fails instead of crashing when the database is locked", async () => {
    const store = await open();
    const second = await openLevelDbStore(dir.path);

    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toContain("could not open");
    }
    await store.close();
  });

  it("fails when the location can't be created", async () => {
    const file = join(dir.path, "file");
    writeFileSync(file, "");

    const result = await openLevelDbStore(join(file, "db"));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("could not create");
    }
  });

  it("reports failed reads and writes as errors", async () => {
    // y-leveldb swallows transaction errors and resolves with null.
    vi.spyOn(LeveldbPersistence.prototype, "storeUpdate").mockResolvedValue(null);
    vi.spyOn(LeveldbPersistence.prototype, "getYDoc").mockResolvedValue(null);
    const store = await open();

    expect(await store.append("room-1", new Uint8Array([0, 0]))).toEqual({
      success: false,
      error: "could not store an update for room room-1",
    });
    expect(await store.load("room-1")).toEqual({
      success: false,
      error: "could not load room room-1",
    });
    vi.restoreAllMocks();
    await store.close();
  });
});
