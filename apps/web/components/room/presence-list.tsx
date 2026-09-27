"use client";

import Image from "next/image";
import type { PresenceEntry } from "@/lib/yjs/awareness";

interface PresenceListProps {
  /** From `usePresence`: this user first, marked "(you)". */
  entries: PresenceEntry[];
}

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

function Avatar({ user }: { user: PresenceEntry["user"] }) {
  // The ring is the user's caret colour, so a face can be matched to a cursor.
  const ring = { boxShadow: `0 0 0 2px ${user.color}` };
  if (user.image) {
    // Unoptimised: the URL comes from the WS server, not a fixed host the image loader could allow.
    return (
      <Image
        src={user.image}
        alt=""
        width={28}
        height={28}
        unoptimized
        className="size-7 rounded-full"
        style={ring}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-7 items-center justify-center rounded-full text-xs font-semibold text-neutral-900"
      style={{ ...ring, backgroundColor: user.color }}
    >
      {initials(user.name)}
    </span>
  );
}

/** Everyone in the room right now, one entry per person, updated as they join and leave. */
export function PresenceList({ entries }: PresenceListProps) {
  return (
    <aside
      aria-labelledby="presence-heading"
      className="flex h-full flex-col gap-3 overflow-y-auto p-3"
    >
      <h2 id="presence-heading" className="text-xs font-medium text-neutral-500 uppercase">
        In this room ({entries.length})
      </h2>
      <ul className="flex flex-col gap-2.5">
        {entries.map(({ user, isSelf }) => (
          <li key={user.id} className="flex min-w-0 items-center gap-2.5 text-sm">
            <Avatar user={user} />
            <span className="truncate">{user.name}</span>
            {isSelf ? <span className="shrink-0 text-xs text-neutral-500">(you)</span> : null}
          </li>
        ))}
      </ul>
    </aside>
  );
}
