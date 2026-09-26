import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as Y from "yjs";
import type { Result } from "../result";

// Binary frame layout of the y-websocket protocol: a varUint message type, then its payload.
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_QUERY_AWARENESS = 3;
// Sync sub-types (y-protocols/sync).
const SYNC_STEP1 = 0;
const SYNC_STEP2 = 1;
const SYNC_UPDATE = 2;

export interface AwarenessEntry {
  clientId: number;
  clock: number;
}

export type SyncMessage =
  | { type: "sync-step1"; stateVector: Uint8Array }
  | { type: "sync-step2"; update: Uint8Array }
  | { type: "update"; update: Uint8Array }
  /** `clients` are the awareness entries (client id and clock) the update carries. */
  | { type: "awareness"; update: Uint8Array; clients: AwarenessEntry[] }
  | { type: "query-awareness" };

/** Presence is small (a name, a colour, a cursor); anything bigger is not presence. */
export const MAX_AWARENESS_UPDATE_BYTES = 64 * 1024;

/**
 * Reads the client ids of an awareness update (`count, (clientId, clock, JSON state) * count`); throws when
 * it is malformed, too large, or a state is neither an object nor null.
 */
function readAwarenessClients(update: Uint8Array): AwarenessEntry[] {
  if (update.length > MAX_AWARENESS_UPDATE_BYTES) {
    throw new Error("awareness update too large");
  }
  const decoder = decoding.createDecoder(update);
  const count = decoding.readVarUint(decoder);
  const clients: AwarenessEntry[] = [];
  for (let i = 0; i < count; i++) {
    const clientId = decoding.readVarUint(decoder);
    clients.push({ clientId, clock: decoding.readVarUint(decoder) });
    const state: unknown = JSON.parse(decoding.readVarString(decoder));
    if (typeof state !== "object" || Array.isArray(state)) {
      throw new Error("awareness state must be an object or null");
    }
  }
  if (decoding.hasContent(decoder)) {
    throw new Error("trailing bytes");
  }
  return clients;
}

function readMessage(decoder: decoding.Decoder): SyncMessage | null {
  const type = decoding.readVarUint(decoder);
  if (type === MESSAGE_QUERY_AWARENESS) {
    return { type: "query-awareness" };
  }
  if (type === MESSAGE_AWARENESS) {
    const update = decoding.readVarUint8Array(decoder);
    return { type: "awareness", update, clients: readAwarenessClients(update) };
  }
  if (type !== MESSAGE_SYNC) {
    return null;
  }
  const syncType = decoding.readVarUint(decoder);
  const payload = decoding.readVarUint8Array(decoder);
  switch (syncType) {
    case SYNC_STEP1:
      Y.decodeStateVector(payload);
      return { type: "sync-step1", stateVector: payload };
    case SYNC_STEP2:
      Y.decodeUpdate(payload);
      return { type: "sync-step2", update: payload };
    case SYNC_UPDATE:
      Y.decodeUpdate(payload);
      return { type: "update", update: payload };
    default:
      return null;
  }
}

/**
 * Validates a binary frame completely before anything is applied (Invariant 1): known message type,
 * decodable Yjs payload, no trailing bytes.
 */
export function parseSyncMessage(data: Uint8Array): Result<SyncMessage> {
  try {
    const decoder = decoding.createDecoder(data);
    const message = readMessage(decoder);
    if (!message || decoding.hasContent(decoder)) {
      return { success: false, error: "unknown or malformed sync message" };
    }
    return { success: true, data: message };
  } catch {
    return { success: false, error: "unknown or malformed sync message" };
  }
}

function encodeSync(syncType: number, payload: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  encoding.writeVarUint(encoder, syncType);
  encoding.writeVarUint8Array(encoder, payload);
  return encoding.toUint8Array(encoder);
}

export const encodeSyncStep1 = (doc: Y.Doc): Uint8Array =>
  encodeSync(SYNC_STEP1, Y.encodeStateVector(doc));

export const encodeSyncStep2 = (update: Uint8Array): Uint8Array => encodeSync(SYNC_STEP2, update);

export const encodeUpdate = (update: Uint8Array): Uint8Array => encodeSync(SYNC_UPDATE, update);

export function encodeAwareness(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(encoder, update);
  return encoding.toUint8Array(encoder);
}
