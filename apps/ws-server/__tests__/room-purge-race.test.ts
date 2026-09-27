import { type RoomTicketClaims, roomPurgePath, roomTicketProtocols } from "@collab-editor/shared";
import { describe, expect, it, vi } from "vitest";
import type { Result } from "../src/result";
import { startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { expectUpgradeRejected, waitFor } from "./helpers/sockets";
import { createMemoryStore } from "./helpers/stores";
import { signPurgeTicket, TEST_SECRET } from "./helpers/tickets";

// Hold the room-ticket check open so a purge can land while it is in flight; purge tickets stay real.
const pending: Array<(result: Result<RoomTicketClaims>) => void> = [];
vi.mock("../src/auth/ticket", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/auth/ticket")>();
  return {
    ...actual,
    verifyRoomTicket: () =>
      new Promise<Result<RoomTicketClaims>>((resolve) => {
        pending.push(resolve);
      }),
  };
});

const claims: RoomTicketClaims = {
  sub: "user-1",
  aud: "collab-editor:ws-room",
  name: "Ada",
  image: null,
  roomId: "room-1",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300,
};

describe("purge during a ticket check (Invariant 2)", () => {
  it("refuses the upgrade instead of recreating the purged room", async () => {
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

    const rejected = expectUpgradeRejected(
      `ws://127.0.0.1:${server.port}/room-1`,
      roomTicketProtocols("t"),
    );
    await waitFor(() => pending.length === 1);
    const purge = await fetch(`http://127.0.0.1:${server.port}${roomPurgePath("room-1")}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await signPurgeTicket()}` },
    });
    expect(purge.status).toBe(204);
    pending[0]?.({ success: true, data: claims });

    expect(await rejected).toBe(401);
    expect(server.stats().rooms).toBe(0);
    await server.close();
  });
});
