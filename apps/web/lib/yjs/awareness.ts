import { type PresenceUser, presenceUser, type SessionUser } from "@collab-editor/shared";
import { useCallback, useRef, useSyncExternalStore } from "react";
import type { Awareness } from "y-protocols/awareness";
import { z } from "zod";

/** One person in the room, however many tabs they have open. */
export interface PresenceEntry {
  user: PresenceUser;
  isSelf: boolean;
}

// The WS server sets `user` on every state from the connection's ticket; anything else is ignored.
// Typed against PresenceUser so the two can't drift apart.
const presenceUserSchema: z.ZodType<PresenceUser> = z.object({
  id: z.string().min(1),
  name: z.string(),
  image: z.string().nullable(),
  color: z.string(),
  colorLight: z.string(),
});

const userOf = (state: unknown): PresenceUser | null => {
  const parsed = presenceUserSchema.safeParse((state as { user?: unknown } | null)?.user);
  return parsed.success ? parsed.data : null;
};

/** Announces who this client is; y-codemirror.next reads `name`, `color` and `colorLight` from it. */
export function setLocalUser(awareness: Awareness, user: SessionUser): void {
  awareness.setLocalStateField("user", presenceUser(user));
}

/**
 * Everyone present, once per user: this user (`selfId`, from the session) first, then the others by name.
 * Not from the local state, which a state relayed for this client's own id can overwrite.
 */
export function readPresence(awareness: Awareness, selfId: string): PresenceEntry[] {
  const users = new Map<string, PresenceUser>();
  for (const state of awareness.getStates().values()) {
    const user = userOf(state);
    if (user && !users.has(user.id)) {
      users.set(user.id, user);
    }
  }
  return [...users.values()]
    .map((user) => ({ user, isSelf: user.id === selfId }))
    .sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.user.name.localeCompare(b.user.name));
}

/**
 * The room's presence list, re-rendering only when it changes: awareness also changes on every cursor
 * move, which must not re-render the list.
 */
export function usePresence(awareness: Awareness, selfId: string): PresenceEntry[] {
  const cache = useRef<{ key: string; entries: PresenceEntry[] }>({ key: "[]", entries: [] });
  const subscribe = useCallback(
    (onChange: () => void) => {
      awareness.on("change", onChange);
      return () => awareness.off("change", onChange);
    },
    [awareness],
  );
  const snapshot = useCallback(() => {
    const entries = readPresence(awareness, selfId);
    const key = JSON.stringify(entries);
    if (key !== cache.current.key) {
      cache.current = { key, entries };
    }
    return cache.current.entries;
  }, [awareness, selfId]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
