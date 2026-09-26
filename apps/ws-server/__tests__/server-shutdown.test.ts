import type { RoomTicketClaims } from "@collab-editor/shared";
import { describe, expect, it, vi } from "vitest";
import type { Result } from "../src/result";
import { startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { expectUpgradeRejected, waitFor } from "./helpers/sockets";
import { createMemoryStore } from "./helpers/stores";
import { TEST_SECRET } from "./helpers/tickets";

// Hold the ticket check open so shutdown can start while it is in flight.
const pending: Array<(result: Result<RoomTicketClaims>) => void> = [];
vi.mock("../src/auth/ticket", () => ({
  verifyRoomTicket: () =>
    new Promise<Result<RoomTicketClaims>>((resolve) => {
      pending.push(resolve);
    }),
}));

const claims: RoomTicketClaims = {
  sub: "user-1",
  aud: "collab-editor:ws-room",
  name: "Ada",
  roomId: "room-1",
  iat: 0,
  exp: 0,
};

describe("shutdown during a ticket check (Invariant 1)", () => {
  it("refuses the connection instead of joining it to a room", async () => {
    const started = await startServer({
      port: 0,
      host: "127.0.0.1",
      ticketSecret: TEST_SECRET,
      roomGracePeriodMs: 0,
      logger: silentLogger,
      store: createMemoryStore(),
    });
    if (!started.success) {
      throw new Error(started.error);
    }
    const server = started.data;

    const rejected = expectUpgradeRejected(`ws://127.0.0.1:${server.port}/room-1?ticket=t`);
    await waitFor(() => pending.length === 1);
    const closing = server.close();
    pending[0]?.({ success: true, data: claims });

    expect(await rejected).toBe(503);
    await closing;
    expect(server.stats()).toEqual({ status: "ok", rooms: 0, connections: 0 });
  });
});
