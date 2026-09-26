"use client";

import type { SessionUser } from "@collab-editor/shared";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { getRoomTicket } from "@/actions/room-ticket";
import { type ConnectionStatus, connectRoom, type RoomConnection } from "@/lib/yjs/provider";

export interface RoomContextValue {
  doc: Y.Doc;
  text: Y.Text;
  awareness: Awareness;
  status: ConnectionStatus;
  error: string | null;
  /** Ticket fetches have kept failing: suggest a reload (the user decides; unsynced edits would be lost). */
  reloadHint: boolean;
}

const RoomContext = createContext<RoomContextValue | null>(null);

interface RoomProviderProps {
  roomId: string;
  user: SessionUser;
  /** WS server URL (`NEXT_PUBLIC_WS_URL`), passed down from the server component. */
  serverUrl: string;
  children: ReactNode;
  /** Rendered (also on the server) until the room's connection exists. */
  fallback?: ReactNode;
}

/** Creates the room's Yjs document and its connection on mount and tears both down on unmount. */
export function RoomProvider({
  roomId,
  user,
  serverUrl,
  children,
  fallback = null,
}: RoomProviderProps) {
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [reloadHint, setReloadHint] = useState(false);

  // Primitive deps: a new `user` object on every render must not reconnect the room.
  const { id: userId, name: userName, image: userImage } = user;
  useEffect(() => {
    const next = connectRoom({
      serverUrl,
      roomId,
      user: { id: userId, name: userName, image: userImage },
      fetchTicket: getRoomTicket,
      onStatus: (value) => {
        setStatus(value);
        if (value === "connected") {
          setError(null);
          setReloadHint(false);
        }
      },
      onError: setError,
      onReloadHint: setReloadHint,
    });
    setConnection(next);
    return () => {
      next.destroy();
      setConnection(null);
      // The provider is reused across rooms: nothing of the old room's connection may carry over.
      setStatus("connecting");
      setError(null);
      setReloadHint(false);
    };
  }, [roomId, serverUrl, userId, userName, userImage]);

  if (!connection) {
    return fallback;
  }
  return (
    <RoomContext.Provider
      value={{
        doc: connection.doc,
        text: connection.text,
        awareness: connection.awareness,
        status,
        error,
        reloadHint,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomContextValue {
  const value = useContext(RoomContext);
  if (!value) {
    throw new Error("useRoom must be used inside <RoomProvider>");
  }
  return value;
}
