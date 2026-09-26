import { roomTicketProtocols } from "@collab-editor/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import * as ticketModule from "../src/auth/ticket";
import { type RunningServer, startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { expectUpgradeRejected, openClient } from "./helpers/sockets";
import { createMemoryStore } from "./helpers/stores";
import { signTicket, TEST_SECRET } from "./helpers/tickets";

// Count ticket verifications while keeping the real check.
vi.mock("../src/auth/ticket", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/auth/ticket")>();
  return { verifyRoomTicket: vi.fn(actual.verifyRoomTicket) };
});
const verifyRoomTicket = vi.mocked(ticketModule.verifyRoomTicket);

let server: RunningServer | null = null;

async function start(capacity: number): Promise<RunningServer> {
  const result = await startServer({
    port: 0,
    host: "127.0.0.1",
    ticketSecret: TEST_SECRET,
    roomGracePeriodMs: 0,
    logger: silentLogger,
    store: createMemoryStore(),
    upgradeRateLimit: { capacity, refillPerSecond: 0.001 },
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  server = result.data;
  return result.data;
}

afterEach(async () => {
  await server?.close();
  server = null;
  verifyRoomTicket.mockClear();
});

describe("upgrade rate limit (Invariant 1)", () => {
  it("answers an upgrade flood from one IP with 429 before verifying any more tickets", async () => {
    const { port } = await start(3);
    const url = `ws://127.0.0.1:${port}/room-1`;
    const protocols = roomTicketProtocols(await signTicket());

    const accepted = await Promise.all([1, 2, 3].map(() => openClient(url, protocols)));
    const flood = await Promise.all(
      Array.from({ length: 10 }, () => expectUpgradeRejected(url, protocols)),
    );

    expect(flood).toEqual(Array(10).fill(429));
    expect(verifyRoomTicket).toHaveBeenCalledTimes(3);
    for (const ws of accepted) {
      ws.close();
    }
  });

  it("counts rejected attempts too, so bad tickets cannot bypass the limit", async () => {
    const { port } = await start(2);
    const url = `ws://127.0.0.1:${port}/room-1`;

    const statuses = await Promise.all(
      Array.from({ length: 5 }, () => expectUpgradeRejected(url, roomTicketProtocols("bogus"))),
    );

    expect(statuses).toEqual([401, 401, 429, 429, 429]);
    expect(verifyRoomTicket).toHaveBeenCalledTimes(2);
  });

  it("ignores X-Forwarded-For, so a client cannot pick its own bucket", async () => {
    const { port } = await start(1);
    const url = `ws://127.0.0.1:${port}/room-1`;
    const reject = (ip: string) =>
      new Promise<number>((resolve) => {
        const ws = new WebSocket(url, roomTicketProtocols("bogus"), {
          headers: { "X-Forwarded-For": ip },
        });
        ws.on("unexpected-response", (req, res) => {
          req.destroy();
          resolve(res.statusCode ?? 0);
        });
        ws.on("error", () => undefined);
      });

    expect(await reject("10.0.0.1")).toBe(401);
    expect(await reject("10.0.0.2")).toBe(429);
  });
});
