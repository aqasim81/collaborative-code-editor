import { roomTicketProtocols } from "@collab-editor/shared";
import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as ticketModule from "../src/auth/ticket";
import { NO_TRUSTED_PROXIES, type TrustedProxies } from "../src/client-address";
import { type RunningServer, startServer } from "../src/server";
import { silentLogger } from "./helpers/logger";
import { trust } from "./helpers/proxies";
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

async function start(
  capacity: number,
  trustedProxies: TrustedProxies = NO_TRUSTED_PROXIES,
  logger = silentLogger,
): Promise<RunningServer> {
  const result = await startServer({
    port: 0,
    host: "127.0.0.1",
    ticketSecret: TEST_SECRET,
    roomGracePeriodMs: 0,
    logger,
    store: createMemoryStore(),
    upgradeRateLimit: { capacity, refillPerSecond: 0.001 },
    trustedProxies,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
  server = result.data;
  return result.data;
}

/** The status of an upgrade with a bogus ticket, optionally sent with an `X-Forwarded-For` header. */
function rejectFrom(url: string, forwardedFor?: string): Promise<number> {
  const headers = forwardedFor === undefined ? {} : { "X-Forwarded-For": forwardedFor };
  return expectUpgradeRejected(url, roomTicketProtocols("bogus"), headers);
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

    expect(await rejectFrom(url, "10.0.0.1")).toBe(401);
    expect(await rejectFrom(url, "10.0.0.2")).toBe(429);
  });
});

describe("trusted proxy (#30)", () => {
  it("keys each forwarded client separately behind a trusted proxy", async () => {
    const { port } = await start(1, trust("127.0.0.1"));
    const url = `ws://127.0.0.1:${port}/room-1`;

    expect(await rejectFrom(url, "10.0.0.1")).toBe(401);
    expect(await rejectFrom(url, "10.0.0.2")).toBe(401);
    expect(await rejectFrom(url, "10.0.0.1")).toBe(429);
    expect(verifyRoomTicket).toHaveBeenCalledTimes(2); // the 429 is answered before any ticket work
  });

  it("ignores entries a client prepends to the header", async () => {
    const { port } = await start(1, trust("127.0.0.1"));
    const url = `ws://127.0.0.1:${port}/room-1`;

    expect(await rejectFrom(url, "9.9.9.1, 1.2.3.4")).toBe(401);
    expect(await rejectFrom(url, "9.9.9.2, 1.2.3.4")).toBe(429);
  });

  it("ignores the header from a peer that is not a trusted proxy", async () => {
    const { port } = await start(1, trust("10.9.9.9"));
    const url = `ws://127.0.0.1:${port}/room-1`;

    expect(await rejectFrom(url, "10.0.0.1")).toBe(401);
    expect(await rejectFrom(url, "10.0.0.2")).toBe(429);
  });

  it("never logs the raw header, only the bucket it chose", async () => {
    const lines: string[] = [];
    const logger = pino({ level: "trace" }, { write: (line: string) => lines.push(line) });
    const { port } = await start(1, trust("127.0.0.1"), logger);
    const url = `ws://127.0.0.1:${port}/room-1`;

    await rejectFrom(url, "198.51.100.77, 1.2.3.4");
    expect(await rejectFrom(url, "198.51.100.78, 1.2.3.4")).toBe(429);

    const logged = lines.join("");
    expect(logged).toContain('"ip":"1.2.3.4"');
    expect(logged).not.toContain("198.51.100.");
  });

  it("puts a trusted proxy's requests without a header in the proxy's own bucket", async () => {
    const { port } = await start(1, trust("127.0.0.1"));
    const url = `ws://127.0.0.1:${port}/room-1`;

    expect(await rejectFrom(url)).toBe(401);
    expect(await rejectFrom(url)).toBe(429);
  });
});
