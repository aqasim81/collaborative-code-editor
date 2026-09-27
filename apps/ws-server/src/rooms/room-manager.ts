import type { Logger } from "../logger";

export interface Room<C, S> {
  id: string;
  clients: Set<C>;
  /** Per-room state (the Yjs replica), created on first join and destroyed with the room. */
  state: S;
}

export interface RoomManager<C, S> {
  /** Adds a client, creating the room on first join and cancelling a pending destroy. */
  join(roomId: string, client: C): Room<C, S>;
  /** Removes a client; an empty room is destroyed after the grace period. */
  leave(roomId: string, client: C): void;
  get(roomId: string): Room<C, S> | undefined;
  /**
   * Destroys a room now, whoever is still in it; the next join starts a fresh one. Settles once the
   * room's state is destroyed (including a destroy already under way), or at once when there is none.
   */
  evict(roomId: string): Promise<void>;
  roomCount(): number;
  connectionCount(): number;
  /** Every connected client across all rooms. */
  clients(): C[];
  /** Destroys every room, cancels pending timers and waits for every state to be destroyed (shutdown). */
  clear(): Promise<void>;
}

export interface RoomManagerOptions<S> {
  gracePeriodMs: number;
  logger: Logger;
  /**
   * Creates a room's state. `previous` settles when an earlier instance of the same room has finished
   * being destroyed, so a new instance can wait for its writes.
   */
  createState: (roomId: string, previous: Promise<void>) => S;
  /** Must not reject. */
  destroyState: (state: S) => Promise<void>;
}

export function createRoomManager<C, S>({
  gracePeriodMs,
  logger,
  createState,
  destroyState,
}: RoomManagerOptions<S>): RoomManager<C, S> {
  const rooms = new Map<string, Room<C, S>>();
  const destroyTimers = new Map<string, NodeJS.Timeout>();
  const destroying = new Map<string, Promise<void>>();

  function cancelDestroy(roomId: string): void {
    const timer = destroyTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      destroyTimers.delete(roomId);
    }
  }

  function destroy(room: Room<C, S>): Promise<void> {
    cancelDestroy(room.id);
    rooms.delete(room.id);
    const done: Promise<void> = destroyState(room.state).then(() => {
      if (destroying.get(room.id) === done) {
        destroying.delete(room.id);
      }
    });
    destroying.set(room.id, done);
    logger.info({ roomId: room.id }, "room destroyed");
    return done;
  }

  function scheduleDestroy(roomId: string): void {
    cancelDestroy(roomId);
    const timer = setTimeout(() => {
      destroyTimers.delete(roomId);
      const room = rooms.get(roomId);
      if (room && room.clients.size === 0) {
        destroy(room);
      }
    }, gracePeriodMs);
    // A pending cleanup must not keep the process alive.
    timer.unref();
    destroyTimers.set(roomId, timer);
  }

  return {
    join(roomId, client) {
      let room = rooms.get(roomId);
      if (!room) {
        const previous = destroying.get(roomId) ?? Promise.resolve();
        room = { id: roomId, clients: new Set(), state: createState(roomId, previous) };
        rooms.set(roomId, room);
        logger.info({ roomId }, "room created");
      }
      cancelDestroy(roomId);
      room.clients.add(client);
      return room;
    },
    leave(roomId, client) {
      const room = rooms.get(roomId);
      if (!room || !room.clients.delete(client)) {
        return;
      }
      if (room.clients.size === 0) {
        scheduleDestroy(roomId);
      }
    },
    get: (roomId) => rooms.get(roomId),
    evict(roomId) {
      const room = rooms.get(roomId);
      return room ? destroy(room) : (destroying.get(roomId) ?? Promise.resolve());
    },
    roomCount: () => rooms.size,
    connectionCount: () => {
      let total = 0;
      for (const room of rooms.values()) {
        total += room.clients.size;
      }
      return total;
    },
    clients: () => [...rooms.values()].flatMap((room) => [...room.clients]),
    async clear() {
      for (const room of [...rooms.values()]) {
        destroy(room);
      }
      await Promise.all(destroying.values());
    },
  };
}
