import { SHARED_TEXT_NAME } from "@collab-editor/shared";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import * as Y from "yjs";
import { z } from "zod";
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
  /** Null removes that client's presence. */
  state: Record<string, unknown> | null;
}

export type SyncMessage =
  | { type: "sync-step1"; stateVector: Uint8Array }
  | { type: "sync-step2"; update: Uint8Array }
  | { type: "update"; update: Uint8Array }
  /** `clients` are the awareness entries the update carries, decoded. */
  | { type: "awareness"; update: Uint8Array; clients: AwarenessEntry[] }
  | { type: "query-awareness" };

const idSchema = z.object({
  client: z.number().int().nonnegative(),
  clock: z.number().int().nonnegative(),
});

/**
 * A Yjs relative position in the room's root text, as y-codemirror.next writes a cursor's anchor and head.
 * Every client resolves these against its document, and a malformed one (or one inside a nested type the
 * document doesn't have) throws there, taking that client's cursor plugins down, and a position in another
 * root type makes every receiver create that type. Only positions in the room's text pass.
 */
const relativePositionSchema = z.object({
  type: z.null(),
  tname: z.literal(SHARED_TEXT_NAME),
  item: idSchema.nullable(),
  assoc: z.number().int(),
});

const cursorSchema = z
  .object({ anchor: relativePositionSchema, head: relativePositionSchema })
  .nullable()
  .optional();

/** Presence is small (a name, a colour, a cursor); anything bigger is not presence. */
export const MAX_AWARENESS_UPDATE_BYTES = 64 * 1024;

/**
 * Reads the entries of an awareness update (`count, (clientId, clock, JSON state) * count`); throws when
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
    const clock = decoding.readVarUint(decoder);
    const state: unknown = JSON.parse(decoding.readVarString(decoder));
    if (typeof state !== "object" || Array.isArray(state)) {
      throw new Error("awareness state must be an object or null");
    }
    if (state !== null && !cursorSchema.safeParse((state as { cursor?: unknown }).cursor).success) {
      throw new Error("awareness cursor is malformed");
    }
    clients.push({ clientId, clock, state: state as Record<string, unknown> | null });
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

/** Encodes awareness entries as an awareness update, the inverse of what `parseSyncMessage` reads. */
export function encodeAwarenessEntries(entries: AwarenessEntry[]): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, entries.length);
  for (const { clientId, clock, state } of entries) {
    encoding.writeVarUint(encoder, clientId);
    encoding.writeVarUint(encoder, clock);
    encoding.writeVarString(encoder, JSON.stringify(state));
  }
  return encoding.toUint8Array(encoder);
}
