"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRoom } from "@/components/room/room-provider";
import { Button } from "@/components/ui/button";
import { ROOM_ERROR_COPY, SERVER_UNREACHABLE_COPY } from "@/lib/room-errors";
import { DASHBOARD_PATH, roomPath, signInRedirect } from "@/lib/routes";

const BANNER = "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2 text-sm";
const RED = `${BANNER} border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200`;
const YELLOW = `${BANNER} border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200`;

function Alert({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div role="alert" className={RED}>
      <p>
        <strong className="font-semibold">{title}.</strong> {body}
      </p>
      {children}
    </div>
  );
}

/**
 * What's wrong with the room's connection, if anything, and what to do about it: a refusal with its way
 * forward, a reload suggestion after long ticket trouble (#43), or the unreachable server with Retry now.
 */
export function RoomStatusBanner({ roomId }: { roomId: string }) {
  const { status, error, reloadHint, retry } = useRoom();

  if (error) {
    const { title, body, action } = ROOM_ERROR_COPY[error];
    return (
      <Alert title={title} body={body}>
        <Button asChild size="sm" variant="outline">
          {action === "sign-in" ? (
            <Link href={signInRedirect(roomPath(roomId))}>Sign in</Link>
          ) : (
            <Link href={DASHBOARD_PATH}>Back to your rooms</Link>
          )}
        </Button>
      </Alert>
    );
  }

  if (reloadHint) {
    return (
      <output className={YELLOW}>
        <span>Having trouble reconnecting. Reloading the page may help.</span>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </output>
    );
  }

  if (status === "disconnected") {
    return (
      <Alert {...SERVER_UNREACHABLE_COPY}>
        <Button size="sm" variant="outline" onClick={retry}>
          Retry now
        </Button>
      </Alert>
    );
  }

  return null;
}
