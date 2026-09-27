import type { RoomJoinErrorCode } from "@/lib/room-errors";
import type { ConnectionStatus as Status } from "@/lib/yjs/provider";

interface ConnectionStatusProps {
  status: Status;
  /** Set when the room can't be joined at all (no ticket); shown as disconnected. */
  error: RoomJoinErrorCode | null;
}

const LOOK: Record<Status, { label: string; dot: string }> = {
  connected: { label: "Connected", dot: "bg-green-500" },
  connecting: { label: "Connecting…", dot: "bg-yellow-400" },
  reconnecting: { label: "Reconnecting…", dot: "bg-yellow-400" },
  disconnected: { label: "Disconnected", dot: "bg-red-500" },
};

/** The WebSocket state as a coloured dot and a word, announced politely to screen readers. */
export function ConnectionStatus({ status, error }: ConnectionStatusProps) {
  const { label, dot } = LOOK[error ? "disconnected" : status];
  return (
    <output
      aria-live="polite"
      className="flex shrink-0 items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400"
    >
      <span aria-hidden="true" data-testid="status-dot" className={`size-2 rounded-full ${dot}`} />
      {/* Dot only on phones; the word stays for screen readers. */}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </output>
  );
}
