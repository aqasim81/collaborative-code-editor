import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomManager } from "../../src/rooms/room-manager";
import { silentLogger } from "../helpers/logger";

const GRACE_MS = 30_000;

interface State {
  roomId: string;
  previous: Promise<void>;
  destroyed: boolean;
}

function manager(destroyState: (state: State) => Promise<void> = async () => undefined) {
  return createRoomManager<string, State>({
    gracePeriodMs: GRACE_MS,
    logger: silentLogger,
    createState: (roomId, previous) => ({ roomId, previous, destroyed: false }),
    destroyState: async (state) => {
      await destroyState(state);
      state.destroyed = true;
    },
  });
}

describe("room manager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a room on first join and tracks every client", () => {
    const rooms = manager();
    rooms.join("r1", "a");
    rooms.join("r1", "b");
    rooms.join("r2", "c");

    expect(rooms.roomCount()).toBe(2);
    expect(rooms.connectionCount()).toBe(3);
    expect([...(rooms.get("r1")?.clients ?? [])]).toEqual(["a", "b"]);
    expect(rooms.clients()).toEqual(["a", "b", "c"]);
  });

  it("removes a client on leave but keeps the room while others remain", () => {
    const rooms = manager();
    rooms.join("r1", "a");
    rooms.join("r1", "b");
    rooms.leave("r1", "a");

    vi.advanceTimersByTime(GRACE_MS);
    expect([...(rooms.get("r1")?.clients ?? [])]).toEqual(["b"]);
  });

  it("destroys an empty room only after the grace period", () => {
    const rooms = manager();
    rooms.join("r1", "a");
    rooms.leave("r1", "a");

    vi.advanceTimersByTime(GRACE_MS - 1);
    expect(rooms.get("r1")).toBeDefined();
    vi.advanceTimersByTime(1);
    expect(rooms.get("r1")).toBeUndefined();
    expect(rooms.roomCount()).toBe(0);
  });

  it("keeps the room when someone rejoins within the grace period", () => {
    const rooms = manager();
    rooms.join("r1", "a");
    rooms.leave("r1", "a");
    vi.advanceTimersByTime(GRACE_MS / 2);
    rooms.join("r1", "b");

    vi.advanceTimersByTime(GRACE_MS * 2);
    expect(rooms.connectionCount()).toBe(1);
    expect(rooms.get("r1")).toBeDefined();
  });

  it("ignores leaves for unknown rooms or clients", () => {
    const rooms = manager();
    rooms.join("r1", "a");
    rooms.leave("nope", "a");
    rooms.leave("r1", "stranger");

    vi.advanceTimersByTime(GRACE_MS);
    expect(rooms.connectionCount()).toBe(1);
  });

  it("creates one state per room and destroys it with the room", async () => {
    const rooms = manager();
    const state = rooms.join("r1", "a").state;
    expect(rooms.join("r1", "b").state).toBe(state);
    expect(state.roomId).toBe("r1");

    rooms.leave("r1", "a");
    rooms.leave("r1", "b");
    vi.advanceTimersByTime(GRACE_MS);
    await vi.waitFor(() => expect(state.destroyed).toBe(true));
  });

  it("evict() destroys a room at once and the next join starts a fresh one", () => {
    const rooms = manager();
    const first = rooms.join("r1", "a").state;
    rooms.evict("r1");
    rooms.evict("unknown");

    expect(rooms.get("r1")).toBeUndefined();
    const second = rooms.join("r1", "a").state;
    expect(second).not.toBe(first);
  });

  it("makes a new instance wait until the previous one is destroyed", async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const rooms = manager(() => held);
    rooms.join("r1", "a");
    rooms.evict("r1");
    const next = rooms.join("r1", "b").state;
    let settled = false;
    void next.previous.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    release();
    await vi.waitFor(() => expect(settled).toBe(true));
  });

  it("clear() drops every room and pending destroy and waits for every state", async () => {
    const rooms = manager();
    const r1 = rooms.join("r1", "a").state;
    rooms.join("r2", "b");
    rooms.leave("r2", "b");

    await rooms.clear();
    expect(rooms.roomCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(r1.destroyed).toBe(true);
  });
});
