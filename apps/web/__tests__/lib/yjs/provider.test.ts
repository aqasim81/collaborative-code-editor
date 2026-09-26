import {
  PRESENCE_ID_TAKEN_CLOSE_CODE,
  roomTicketProtocols,
  TICKET_EXPIRED_CLOSE_CODE,
} from "@collab-editor/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Awareness, encodeAwarenessUpdate } from "y-protocols/awareness";
import * as Y from "yjs";
import type { RoomTicketResult } from "@/actions/room-ticket";
import {
  type ConnectionStatus,
  connectRoom,
  type RoomConnection,
  toConnectionStatus,
} from "@/lib/yjs/provider";

/** Stands in for the browser WebSocket; tests drive open and close by hand. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readonly OPEN = 1;
  readyState = 0;
  binaryType = "blob";
  onopen: (() => void) | null = null;
  onclose: ((event: unknown) => void) | null = null;
  onmessage: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sent: unknown[] = [];

  constructor(
    readonly url: string,
    readonly protocols: string[] = [],
  ) {
    FakeWebSocket.instances.push(this);
  }
  send(data: unknown) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  serverOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
  serverSend(data: Uint8Array) {
    this.onmessage?.({ data: data.slice().buffer });
  }
  serverClose(code = 1006) {
    this.readyState = 3;
    this.onclose?.({ code });
  }
}

/** Awareness frames (message type 1) a socket sent, as the client id and clock of their first entry. */
function awarenessFrames(ws: FakeWebSocket): Array<{ clientId: number; clock: number }> {
  return ws.sent
    .filter((frame): frame is Uint8Array => frame instanceof Uint8Array && frame[0] === 1)
    .map((frame) => {
      // varUints: type, payload length, entry count, then the first entry's client id and clock.
      const values = readVarUints(frame, 5);
      return { clientId: values[3] ?? -1, clock: values[4] ?? -1 };
    });
}

function varUint(value: number): number[] {
  const bytes: number[] = [];
  let rest = value;
  while (rest > 0x7f) {
    bytes.push((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  bytes.push(rest);
  return bytes;
}

function readVarUints(bytes: Uint8Array, count: number): number[] {
  const values: number[] = [];
  let index = 0;
  while (values.length < count) {
    let value = 0;
    let shift = 0;
    for (;;) {
      const byte = bytes[index++] ?? 0;
      value += (byte & 0x7f) * 2 ** shift;
      shift += 7;
      if (byte < 0x80) {
        break;
      }
    }
    values.push(value);
  }
  return values;
}

/** y-websocket sync step 1 for an empty document: message sync (0), step 1 (0), empty state vector. */
const EMPTY_SYNC_STEP_1 = new Uint8Array([0, 0, 1, 0]);

/** The Yjs update inside a sync step 2 frame (message sync 0, step 2 = 1, var-length update), or null. */
function syncStep2Update(frame: unknown): Uint8Array | null {
  const bytes = frame instanceof Uint8Array ? frame : null;
  if (!bytes || bytes[0] !== 0 || bytes[1] !== 1) {
    return null;
  }
  let length = 0;
  let shift = 0;
  let index = 2;
  for (;;) {
    const byte = bytes[index++] ?? 0;
    length += (byte & 0x7f) * 2 ** shift;
    shift += 7;
    if (byte < 0x80) {
      break;
    }
  }
  return bytes.slice(index, index + length);
}

const NOW = 1_000;
const ok = (ticket: string, expiresAt: number): RoomTicketResult => ({
  success: true,
  data: { ticket, expiresAt },
});

let connection: RoomConnection | null = null;

function connect(
  fetchTicket: (roomId: string) => Promise<RoomTicketResult>,
  extra: { onStatus?: (s: ConnectionStatus) => void; onError?: (m: string) => void } = {},
): RoomConnection {
  connection = connectRoom({
    serverUrl: "ws://ws.test/",
    roomId: "r1",
    user: { id: "u1", name: "Ada", image: null },
    fetchTicket,
    now: () => NOW,
    WebSocketPolyfill: FakeWebSocket as unknown as typeof WebSocket,
    ...extra,
  });
  return connection;
}

const socket = (index: number): FakeWebSocket => {
  const ws = FakeWebSocket.instances[index];
  if (!ws) {
    throw new Error(`no socket ${index}`);
  }
  return ws;
};

afterEach(() => {
  connection?.destroy();
  connection = null;
  FakeWebSocket.instances = [];
});

describe("connectRoom", () => {
  it("connects with a fresh ticket in the subprotocols, never in the URL", async () => {
    const fetchTicket = vi.fn(async () => ok("t1", NOW + 300));
    const statuses: ConnectionStatus[] = [];
    const room = connect(fetchTicket, { onStatus: (s) => statuses.push(s) });

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    expect(fetchTicket).toHaveBeenCalledWith("r1");
    expect(socket(0).url).toBe("ws://ws.test/r1");
    expect(socket(0).protocols).toEqual(roomTicketProtocols("t1"));

    socket(0).serverOpen();
    expect(statuses).toEqual(["connecting", "connected"]);
    // The first frame is Yjs sync step 1 for the shared document.
    expect(socket(0).sent.length).toBeGreaterThan(0);
    expect(room.text).toBe(room.doc.getText("codemirror"));
  });

  it("announces the user before connecting, in the shape the editor reads", async () => {
    const room = connect(async () => ok("t1", NOW + 300));

    expect(room.awareness).toBe(room.provider.awareness);
    expect(room.awareness.getLocalState()?.user).toEqual(
      expect.objectContaining({ id: "u1", name: "Ada", image: null, color: expect.any(String) }),
    );
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();
    expect(awarenessFrames(socket(0)).map((f) => f.clientId)).toContain(room.doc.clientID);
  });

  it("re-announces its presence with a newer clock on every reconnect (#32)", async () => {
    const room = connect(async () => ok("t1", NOW + 300));
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();
    const before = Math.max(...awarenessFrames(socket(0)).map((f) => f.clock));

    socket(0).serverClose();
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    socket(1).serverOpen();

    const after = awarenessFrames(socket(1)).filter((f) => f.clientId === room.doc.clientID);
    expect(Math.max(...after.map((f) => f.clock))).toBeGreaterThan(before);
  });

  it("takes a new client id and reconnects when the server says its id is in use (#32)", async () => {
    const room = connect(async () => ok("t1", NOW + 300));
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();
    room.text.insert(0, "kept");
    const oldId = room.doc.clientID;

    socket(0).serverClose(PRESENCE_ID_TAKEN_CLOSE_CODE);

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    const newId = room.doc.clientID;
    expect(newId).not.toBe(oldId);
    expect(room.awareness.clientID).toBe(newId);
    expect(room.awareness.getStates().has(oldId)).toBe(false);
    expect(room.awareness.getLocalState()?.user).toMatchObject({ id: "u1" });
    expect(room.text.toString()).toBe("kept");

    // The new id is announced with a clock the server will apply (above 0).
    socket(1).serverOpen();
    const announced = awarenessFrames(socket(1)).filter((f) => f.clientId === newId);
    expect(Math.max(...announced.map((f) => f.clock))).toBeGreaterThan(0);
  });

  it("drops a squatter's state it was sent for its own id before taking a new one (#32)", async () => {
    const room = connect(async () => ok("t1", NOW + 300));
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();
    // The server relays the room's presence, including a squatter holding this client's id...
    const squatter = new Awareness(new Y.Doc());
    squatter.clientID = room.awareness.clientID;
    squatter.setLocalState({ user: { id: "u-mal", name: "Mallory" }, cursor: "theirs" });
    squatter.meta.set(squatter.clientID, { clock: 1_000, lastUpdated: 0 });
    const update = encodeAwarenessUpdate(squatter, [squatter.clientID]);
    socket(0).serverSend(new Uint8Array([1, ...varUint(update.length), ...update]));
    // ...then closes with 4002.
    socket(0).serverClose(PRESENCE_ID_TAKEN_CLOSE_CODE);

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    expect(room.awareness.getLocalState()).toEqual({
      user: expect.objectContaining({ id: "u1", name: "Ada" }),
      cursor: null,
    });
    squatter.destroy();
  });

  it("reports reconnecting rather than disconnected while a dropped socket comes back", async () => {
    const statuses: ConnectionStatus[] = [];
    connect(async () => ok("t1", NOW + 300), { onStatus: (s) => statuses.push(s) });
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();

    socket(0).serverClose();
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    socket(1).serverOpen();

    expect(statuses).toEqual([
      "connecting",
      "connected",
      "reconnecting",
      "reconnecting",
      "connected",
    ]);
  });

  it("reports a refused ticket and never opens a socket", async () => {
    const onError = vi.fn();
    connect(async () => ({ success: false, error: "Room not found" }), { onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Room not found"));
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("fetches a new ticket before reconnecting when the current one is about to expire", async () => {
    const fetchTicket = vi
      .fn<(roomId: string) => Promise<RoomTicketResult>>()
      .mockResolvedValueOnce(ok("t1", NOW + 10))
      .mockResolvedValueOnce(ok("t2", NOW + 300));
    connect(fetchTicket);
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();

    socket(0).serverClose();

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    expect(socket(1).url).toBe("ws://ws.test/r1");
    expect(socket(1).protocols).toEqual(roomTicketProtocols("t2"));
    // The provider's own retry must not also connect with the stale ticket.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(fetchTicket).toHaveBeenCalledTimes(2);
  });

  it("lets the provider reconnect by itself while the ticket is still fresh", async () => {
    const fetchTicket = vi.fn(async () => ok("t1", NOW + 300));
    connect(fetchTicket);
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();

    socket(0).serverClose();

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    expect(socket(1).url).toBe("ws://ws.test/r1");
    expect(socket(1).protocols).toEqual(roomTicketProtocols("t1"));
    expect(fetchTicket).toHaveBeenCalledTimes(1);
  });

  it("fetches a fresh ticket and reconnects when the server closes with ticket expired", async () => {
    const fetchTicket = vi
      .fn<(roomId: string) => Promise<RoomTicketResult>>()
      // The ticket still looks fresh to this client (clocks may differ); the server's close code decides.
      .mockResolvedValueOnce(ok("t1", NOW + 300))
      .mockResolvedValueOnce(ok("t2", NOW + 600));
    const room = connect(fetchTicket);
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();

    socket(0).serverClose(TICKET_EXPIRED_CLOSE_CODE);
    // A local edit made while disconnected is kept in the document.
    room.text.insert(0, "kept");

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(2));
    expect(socket(1).url).toBe("ws://ws.test/r1");
    expect(socket(1).protocols).toEqual(roomTicketProtocols("t2"));
    expect(fetchTicket).toHaveBeenCalledTimes(2);
    // The provider's own retry must not also connect with the expired ticket.
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(FakeWebSocket.instances).toHaveLength(2);

    socket(1).serverOpen();
    // The server asks for everything it lacks; the reply must carry the edit made while disconnected.
    socket(1).serverSend(EMPTY_SYNC_STEP_1);
    const update = socket(1)
      .sent.map(syncStep2Update)
      .find((u) => u !== null);
    if (!update) {
      throw new Error("no sync step 2 reply");
    }
    const server = new Y.Doc();
    Y.applyUpdate(server, update);
    expect(server.getText("codemirror").toString()).toBe("kept");
  });

  it("reports a ticket fetch that throws instead of failing silently", async () => {
    const onError = vi.fn();
    connect(
      async () => {
        throw new Error("network down");
      },
      { onError },
    );

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Could not get a room ticket"));
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("stays down and reports the error when the fresh ticket is refused after expiry", async () => {
    const onError = vi.fn();
    const fetchTicket = vi
      .fn<(roomId: string) => Promise<RoomTicketResult>>()
      .mockResolvedValueOnce(ok("t1", NOW + 300))
      .mockResolvedValueOnce({ success: false, error: "Room not found" });
    connect(fetchTicket, { onError });
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();

    socket(0).serverClose(TICKET_EXPIRED_CLOSE_CODE);

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Room not found"));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("stops everything on destroy, including a ticket that arrives later", async () => {
    let resolveTicket: (result: RoomTicketResult) => void = () => undefined;
    const room = connect(
      () =>
        new Promise((resolve) => {
          resolveTicket = resolve;
        }),
    );
    const destroyDoc = vi.spyOn(room.doc, "destroy");

    room.destroy();
    connection = null;
    resolveTicket(ok("late", NOW + 300));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(destroyDoc).toHaveBeenCalledOnce();
  });

  it("does not refresh the ticket for a close caused by destroy", async () => {
    const fetchTicket = vi.fn(async () => ok("t1", NOW + 10));
    const room = connect(fetchTicket);
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    socket(0).serverOpen();

    room.destroy();
    connection = null;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchTicket).toHaveBeenCalledTimes(1);
  });
});

describe("toConnectionStatus", () => {
  it.each([
    ["connected", false, 0, "connected"],
    ["connecting", false, 0, "connecting"],
    ["connecting", false, 2, "connecting"],
    ["connecting", false, 3, "disconnected"],
    ["disconnected", true, 0, "reconnecting"],
    ["connecting", true, 2, "reconnecting"],
    ["connecting", true, 3, "disconnected"],
    ["connected", true, 5, "connected"],
  ] as const)("%s, ever connected %s, %i failures → %s", (socket, everConnected, failures, expected) => {
    expect(toConnectionStatus(socket, everConnected, failures)).toBe(expected);
  });
});
