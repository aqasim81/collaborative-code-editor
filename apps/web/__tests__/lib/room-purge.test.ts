// @vitest-environment node
// jose needs the Node realm's Uint8Array; jsdom provides its own.
import { PURGE_TICKET_AUDIENCE } from "@collab-editor/shared";
import { jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  roomPurge: { findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { env } from "@/lib/env";
import {
  maybeSweepRoomPurges,
  type PurgeDeps,
  purgeRetryDelayMs,
  purgeRoomDocument,
  ROOM_PURGE_SWEEP_INTERVAL_MS,
  roomPurgeUrl,
  sweepRoomPurges,
} from "@/lib/room-purge";

const errorLog = vi.spyOn(console, "error");
const NOW = new Date("2026-09-27T12:00:00Z");
const row = (roomId: string, attempts = 0) => ({
  roomId,
  userId: "u1",
  attempts,
  createdAt: NOW,
  nextAttemptAt: NOW,
  lastError: null,
});

function deps(
  respond: () => Promise<Response>,
  now = NOW,
): PurgeDeps & { fetch: ReturnType<typeof vi.fn> } {
  return { fetch: vi.fn(respond), now: () => now };
}

const answer = (status: number) => () => Promise.resolve(new Response(null, { status }));

beforeEach(() => {
  vi.clearAllMocks();
  errorLog.mockImplementation(() => undefined);
});
afterEach(() => {
  errorLog.mockReset();
});

describe("purgeRoomDocument (Invariants 1 and 6)", () => {
  it("sends DELETE /rooms/<id> with the purge ticket as a bearer, never in the URL", async () => {
    const d = deps(answer(204));

    await expect(purgeRoomDocument("r1", "u1", d)).resolves.toEqual({
      success: true,
      data: undefined,
    });
    const [url, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://localhost:8080/rooms/r1");
    expect(init.method).toBe("DELETE");
    const token = String((init.headers as Record<string, string>).Authorization).replace(
      /^Bearer /,
      "",
    );
    expect(String(url)).not.toContain(token);
    const { payload } = await jwtVerify(token, new TextEncoder().encode(env.WS_TICKET_SECRET), {
      audience: PURGE_TICKET_AUDIENCE,
      currentDate: NOW,
    });
    expect(payload).toMatchObject({ sub: "u1", roomId: "r1" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([401, 429, 500, 503])("fails on %i", async (status) => {
    await expect(purgeRoomDocument("r1", "u1", deps(answer(status)))).resolves.toEqual({
      success: false,
      error: `WS server answered ${status}`,
    });
  });

  it("fails when the WS server can't be reached or times out", async () => {
    const refused = deps(() => Promise.reject(new TypeError("fetch failed")));
    const timedOut = deps(() =>
      Promise.reject(new DOMException("The operation was aborted due to timeout", "TimeoutError")),
    );

    await expect(purgeRoomDocument("r1", "u1", refused)).resolves.toEqual({
      success: false,
      error: "fetch failed",
    });
    await expect(purgeRoomDocument("r1", "u1", timedOut)).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("timeout"),
    });
  });
});

describe("roomPurgeUrl", () => {
  it.each([
    ["http://localhost:8080", "http://localhost:8080/rooms/r1"],
    ["http://localhost:8080/", "http://localhost:8080/rooms/r1"],
    // Behind a proxy that routes the WS server by prefix, the prefix must be kept.
    ["https://host/collab", "https://host/collab/rooms/r1"],
    ["https://host/collab/", "https://host/collab/rooms/r1"],
  ])("joins %s with the purge path", (base, expected) => {
    expect(roomPurgeUrl(base, "r1")).toBe(expected);
  });
});

describe("purgeRetryDelayMs", () => {
  it("starts at a minute, doubles and caps at an hour", () => {
    expect([1, 2, 3, 4, 6, 7, 20].map(purgeRetryDelayMs)).toEqual([
      60_000, 120_000, 240_000, 480_000, 1_920_000, 3_600_000, 3_600_000,
    ]);
  });
});

describe("sweepRoomPurges", () => {
  it("fetches only due rows, oldest first, at most the limit", async () => {
    prismaMock.roomPurge.findMany.mockResolvedValue([]);

    await sweepRoomPurges(deps(answer(204)));
    expect(prismaMock.roomPurge.findMany).toHaveBeenCalledWith({
      where: { nextAttemptAt: { lte: NOW } },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
  });

  it("deletes the row of a purged room", async () => {
    prismaMock.roomPurge.findMany.mockResolvedValue([row("r1")]);

    await sweepRoomPurges(deps(answer(204)));
    expect(prismaMock.roomPurge.deleteMany).toHaveBeenCalledWith({ where: { roomId: "r1" } });
    expect(prismaMock.roomPurge.updateMany).not.toHaveBeenCalled();
  });

  it("keeps a failed row and backs it off, then carries on with the next", async () => {
    prismaMock.roomPurge.findMany.mockResolvedValue([row("r1", 2), row("r2")]);
    const d = deps(answer(204));
    d.fetch.mockImplementationOnce(answer(503));

    await sweepRoomPurges(d);
    expect(prismaMock.roomPurge.updateMany).toHaveBeenCalledWith({
      where: { roomId: "r1" },
      data: {
        attempts: 3,
        lastError: "WS server answered 503",
        nextAttemptAt: new Date(NOW.getTime() + 240_000),
      },
    });
    expect(prismaMock.roomPurge.deleteMany).toHaveBeenCalledWith({ where: { roomId: "r2" } });
  });

  it("never rejects, even when the database fails", async () => {
    prismaMock.roomPurge.findMany.mockRejectedValue(new Error("db down"));

    await expect(sweepRoomPurges(deps(answer(204)))).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalled();
  });
});

describe("maybeSweepRoomPurges", () => {
  it("sweeps at most once per interval", async () => {
    prismaMock.roomPurge.findMany.mockResolvedValue([]);
    const at = (offsetMs: number) => deps(answer(204), new Date(NOW.getTime() + offsetMs));

    await maybeSweepRoomPurges(at(0));
    await maybeSweepRoomPurges(at(ROOM_PURGE_SWEEP_INTERVAL_MS - 1));
    expect(prismaMock.roomPurge.findMany).toHaveBeenCalledTimes(1);
    await maybeSweepRoomPurges(at(ROOM_PURGE_SWEEP_INTERVAL_MS));
    expect(prismaMock.roomPurge.findMany).toHaveBeenCalledTimes(2);
  });

  it("never starts a sweep while one is still running", async () => {
    let release: (rows: never[]) => void = () => undefined;
    prismaMock.roomPurge.findMany.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const at = (offsetMs: number) => deps(answer(204), new Date(NOW.getTime() + 10 * offsetMs));

    const first = maybeSweepRoomPurges(at(ROOM_PURGE_SWEEP_INTERVAL_MS));
    const second = maybeSweepRoomPurges(at(ROOM_PURGE_SWEEP_INTERVAL_MS * 2));
    expect(prismaMock.roomPurge.findMany).toHaveBeenCalledTimes(1);
    release([]);
    await Promise.all([first, second]);
  });
});
