import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoomManager } from "../../src/rooms/room-manager";
import { silentLogger } from "../helpers/logger";

const GRACE_MS = 30_000;

function manager() {
  return createRoomManager<string>({ gracePeriodMs: GRACE_MS, logger: silentLogger });
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

  it("clear() drops every room and pending destroy", () => {
    const rooms = manager();
    rooms.join("r1", "a");
    rooms.join("r2", "b");
    rooms.leave("r2", "b");

    rooms.clear();
    expect(rooms.roomCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
