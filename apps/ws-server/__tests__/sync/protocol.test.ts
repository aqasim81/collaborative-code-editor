import * as encoding from "lib0/encoding";
import { describe, expect, it } from "vitest";
import { Awareness, encodeAwarenessUpdate } from "y-protocols/awareness";
import * as Y from "yjs";
import {
  encodeAwareness,
  encodeSyncStep1,
  encodeSyncStep2,
  encodeUpdate,
  parseSyncMessage,
} from "../../src/sync/protocol";

function docWithText(text: string): Y.Doc {
  const doc = new Y.Doc();
  doc.getText("t").insert(0, text);
  return doc;
}

function frame(...parts: Array<number | Uint8Array | string>): Uint8Array {
  const encoder = encoding.createEncoder();
  for (const part of parts) {
    if (typeof part === "number") encoding.writeVarUint(encoder, part);
    else if (typeof part === "string") encoding.writeVarString(encoder, part);
    else encoding.writeVarUint8Array(encoder, part);
  }
  return encoding.toUint8Array(encoder);
}

describe("parseSyncMessage (Invariant 1)", () => {
  it("round-trips every message the server encodes", () => {
    const doc = docWithText("abc");
    const update = Y.encodeStateAsUpdate(doc);

    expect(parseSyncMessage(encodeSyncStep1(doc))).toEqual({
      success: true,
      data: { type: "sync-step1", stateVector: Y.encodeStateVector(doc) },
    });
    expect(parseSyncMessage(encodeSyncStep2(update))).toEqual({
      success: true,
      data: { type: "sync-step2", update },
    });
    expect(parseSyncMessage(encodeUpdate(update))).toEqual({
      success: true,
      data: { type: "update", update },
    });
  });

  it("accepts awareness updates and awareness queries", () => {
    const awareness = new Awareness(new Y.Doc());
    awareness.setLocalState({ name: "Ada" });
    const update = encodeAwarenessUpdate(awareness, [awareness.clientID]);

    expect(parseSyncMessage(encodeAwareness(update))).toEqual({
      success: true,
      data: {
        type: "awareness",
        update,
        clients: [{ clientId: awareness.clientID, clock: 1 }],
      },
    });
    expect(parseSyncMessage(frame(3))).toEqual({
      success: true,
      data: { type: "query-awareness" },
    });
    awareness.destroy();
  });

  it.each([
    ["an empty frame", new Uint8Array()],
    ["an unknown message type", frame(7)],
    ["the auth message type", frame(2, 0, "denied")],
    ["an unknown sync type", frame(0, 9, new Uint8Array([0]))],
    ["a truncated sync payload", new Uint8Array([0, 2, 10, 1])],
    ["a garbage update", frame(0, 2, new Uint8Array([1, 200, 200, 200, 200]))],
    ["a garbage state vector", frame(0, 0, new Uint8Array([5]))],
    ["trailing bytes", new Uint8Array([...frame(0, 2, new Uint8Array([0, 0])), 1])],
    ["awareness with invalid JSON", frame(1, frame(1, 1, 1, "{nope"))],
    ["awareness with trailing bytes", frame(1, new Uint8Array([...frame(0), 4]))],
    ["awareness with a non-object state", frame(1, frame(1, 1, 1, "[1,2]"))],
    ["awareness with a scalar state", frame(1, frame(1, 1, 1, "42"))],
    [
      "an oversized awareness update",
      frame(1, frame(1, 1, 1, JSON.stringify({ x: "y".repeat(70_000) }))),
    ],
  ])("rejects %s", (_label, data) => {
    expect(parseSyncMessage(data)).toEqual({
      success: false,
      error: "unknown or malformed sync message",
    });
  });
});
