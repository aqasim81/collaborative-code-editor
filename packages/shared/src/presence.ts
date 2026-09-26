import type { SessionUser } from "./user";

/**
 * Caret colours, readable on the dark editor theme and distinct from each other. Order is part of the
 * contract: changing it changes every user's colour.
 */
export const PRESENCE_COLORS = [
  "#f87171",
  "#fb923c",
  "#fbbf24",
  "#a3e635",
  "#4ade80",
  "#34d399",
  "#2dd4bf",
  "#22d3ee",
  "#38bdf8",
  "#60a5fa",
  "#818cf8",
  "#a78bfa",
  "#c084fc",
  "#e879f9",
  "#f472b6",
  "#fb7185",
] as const;

/** The `user` field of an awareness state; `color` and `colorLight` are the fields y-codemirror.next reads. */
export interface PresenceUser {
  id: string;
  name: string;
  image: string | null;
  /** Caret and label colour. */
  color: string;
  /** Selection highlight: `color` at 20% opacity. */
  colorLight: string;
}

/** FNV-1a, 32-bit: small, stable across runtimes and well spread for short ids. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A user's colour, derived from their id only, so it is the same in every session and on every client. */
export function userColor(userId: string): { color: string; colorLight: string } {
  const color = PRESENCE_COLORS[hash(userId) % PRESENCE_COLORS.length] ?? PRESENCE_COLORS[0];
  return { color, colorLight: `${color}33` };
}

export function presenceUser({ id, name, image }: SessionUser): PresenceUser {
  return { id, name, image, ...userColor(id) };
}
