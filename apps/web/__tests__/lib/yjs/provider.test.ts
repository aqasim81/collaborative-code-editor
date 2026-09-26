import { TICKET_EXPIRED_CLOSE_CODE } from "@collab-editor/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import type { RoomTicketResult } from "@/actions/room-ticket";
import { type ConnectionStatus, connectRoom, type RoomConnection } from "@/lib/yjs/provider";

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

  constructor(readonly url: string) {
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
  it("connects with a fresh ticket for the room in the URL", async () => {
    const fetchTicket = vi.fn(async () => ok("t1", NOW + 300));
    const statuses: ConnectionStatus[] = [];
    const room = connect(fetchTicket, { onStatus: (s) => statuses.push(s) });

    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    expect(fetchTicket).toHaveBeenCalledWith("r1");
    expect(socket(0).url).toBe("ws://ws.test/r1?ticket=t1");

    socket(0).serverOpen();
    expect(statuses).toEqual(["connecting", "connected"]);
    // The first frame is Yjs sync step 1 for the shared document.
    expect(socket(0).sent.length).toBeGreaterThan(0);
    expect(room.text).toBe(room.doc.getText("codemirror"));
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
    expect(socket(1).url).toBe("ws://ws.test/r1?ticket=t2");
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
    expect(socket(1).url).toBe("ws://ws.test/r1?ticket=t1");
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
    expect(socket(1).url).toBe("ws://ws.test/r1?ticket=t2");
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
