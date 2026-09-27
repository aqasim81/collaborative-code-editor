import { roomPurgePath } from "@collab-editor/shared";
import { env, wsServerHttpUrl } from "@/lib/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import type { Result } from "@/lib/result";
import { signPurgeTicket } from "@/lib/ws-ticket";

// Server-only. Purges deleted rooms' documents on the WS server through the `RoomPurge` outbox (#48).
// `deleteOwnedRoom` writes a row in the delete's transaction; a sweep calls the WS server for each due
// row and backs off on failure, so a WS server that is down never loses a purge or blocks a delete.

/** How often dashboard loads may sweep, per process. */
export const ROOM_PURGE_SWEEP_INTERVAL_MS = 60_000;
const PURGE_REQUEST_TIMEOUT_MS = 5_000;
const MAX_RETRY_DELAY_MS = 3_600_000;
/** Rows purged per sweep. */
const SWEEP_BATCH_SIZE = 20;

export interface PurgeDeps {
  fetch: typeof fetch;
  now: () => Date;
}

const defaultDeps: PurgeDeps = { fetch: (...args) => fetch(...args), now: () => new Date() };

/** Delay before retry `attempt` (1-based): 1 min, doubling, capped at 1 h. */
export function purgeRetryDelayMs(attempt: number): number {
  return Math.min(60_000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
}

/**
 * The purge URL under the WS server's base URL, keeping any path prefix the base has (a proxy may route
 * the WS server by prefix; `new URL("/rooms/…", base)` would drop it).
 */
export function roomPurgeUrl(base: string, roomId: string): string {
  return `${base.replace(/\/+$/, "")}${roomPurgePath(roomId)}`;
}

/** Asks the WS server to close the room and drop its document. Only a 204 counts as done. */
export async function purgeRoomDocument(
  roomId: string,
  userId: string,
  deps: PurgeDeps = defaultDeps,
): Promise<Result<void>> {
  const ticket = await signPurgeTicket(
    { userId, roomId },
    env.WS_TICKET_SECRET,
    Math.floor(deps.now().getTime() / 1000),
  );
  try {
    const res = await deps.fetch(roomPurgeUrl(wsServerHttpUrl(env), roomId), {
      method: "DELETE",
      // In a header, never the URL, which proxies log.
      headers: { Authorization: `Bearer ${ticket}` },
      signal: AbortSignal.timeout(PURGE_REQUEST_TIMEOUT_MS),
    });
    return res.status === 204
      ? { success: true, data: undefined }
      : { success: false, error: `WS server answered ${res.status}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Purges every due outbox row, oldest first: a success deletes the row, a failure backs it off. Rows
 * are never dropped. Never rejects, so it can run in `after()`.
 */
export async function sweepRoomPurges(deps: PurgeDeps = defaultDeps): Promise<void> {
  try {
    const due = await prisma.roomPurge.findMany({
      where: { nextAttemptAt: { lte: deps.now() } },
      orderBy: { createdAt: "asc" },
      take: SWEEP_BATCH_SIZE,
    });
    for (const row of due) {
      const purged = await purgeRoomDocument(row.roomId, row.userId, deps);
      if (purged.success) {
        // *Many: a sweep running alongside may have removed the row already.
        await prisma.roomPurge.deleteMany({ where: { roomId: row.roomId } });
        continue;
      }
      const attempts = row.attempts + 1;
      // warn: the row is retried. The ticket is never logged.
      logger.warn({ roomId: row.roomId, attempts, err: purged.error }, "room purge failed");
      await prisma.roomPurge.updateMany({
        where: { roomId: row.roomId },
        data: {
          attempts,
          lastError: purged.error,
          nextAttemptAt: new Date(deps.now().getTime() + purgeRetryDelayMs(attempts)),
        },
      });
    }
  } catch (error) {
    logger.error({ err: error }, "room purge sweep failed");
  }
}

let lastSweepAt = Number.NEGATIVE_INFINITY;
let running: Promise<void> | null = null;

/**
 * `sweepRoomPurges`, started at most once per `ROOM_PURGE_SWEEP_INTERVAL_MS` in this process and never
 * while one it started is still running (a sweep against a hanging WS server can outlast the interval).
 */
export function maybeSweepRoomPurges(deps: PurgeDeps = defaultDeps): Promise<void> {
  const now = deps.now().getTime();
  if (running || now - lastSweepAt < ROOM_PURGE_SWEEP_INTERVAL_MS) {
    return running ?? Promise.resolve();
  }
  lastSweepAt = now;
  running = sweepRoomPurges(deps).finally(() => {
    running = null;
  });
  return running;
}
