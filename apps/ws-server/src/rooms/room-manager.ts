import type { Logger } from "../logger";

export interface Room<C> {
  id: string;
  clients: Set<C>;
}

export interface RoomManager<C> {
  /** Adds a client, creating the room on first join and cancelling a pending destroy. */
  join(roomId: string, client: C): Room<C>;
  /** Removes a client; an empty room is destroyed after the grace period. */
  leave(roomId: string, client: C): void;
  get(roomId: string): Room<C> | undefined;
  roomCount(): number;
  connectionCount(): number;
  /** Every connected client across all rooms. */
  clients(): C[];
  /** Destroys every room immediately and cancels pending timers (shutdown). */
  clear(): void;
}

export interface RoomManagerOptions {
  gracePeriodMs: number;
  logger: Logger;
}

export function createRoomManager<C>({
  gracePeriodMs,
  logger,
}: RoomManagerOptions): RoomManager<C> {
  const rooms = new Map<string, Room<C>>();
  const destroyTimers = new Map<string, NodeJS.Timeout>();

  function cancelDestroy(roomId: string): void {
    const timer = destroyTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      destroyTimers.delete(roomId);
    }
  }

  function scheduleDestroy(roomId: string): void {
    cancelDestroy(roomId);
    const timer = setTimeout(() => {
      destroyTimers.delete(roomId);
      const room = rooms.get(roomId);
      if (room && room.clients.size === 0) {
        rooms.delete(roomId);
        logger.info({ roomId }, "room destroyed");
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
        room = { id: roomId, clients: new Set() };
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
    roomCount: () => rooms.size,
    connectionCount: () => {
      let total = 0;
      for (const room of rooms.values()) {
        total += room.clients.size;
      }
      return total;
    },
    clients: () => [...rooms.values()].flatMap((room) => [...room.clients]),
    clear() {
      for (const roomId of destroyTimers.keys()) {
        cancelDestroy(roomId);
      }
      rooms.clear();
    },
  };
}
