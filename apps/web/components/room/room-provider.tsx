"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import type * as Y from "yjs";
import { getRoomTicket } from "@/actions/room-ticket";
import { type ConnectionStatus, connectRoom, type RoomConnection } from "@/lib/yjs/provider";

export interface RoomContextValue {
  doc: Y.Doc;
  text: Y.Text;
  status: ConnectionStatus;
  error: string | null;
}

const RoomContext = createContext<RoomContextValue | null>(null);

interface RoomProviderProps {
  roomId: string;
  /** WS server URL (`NEXT_PUBLIC_WS_URL`), passed down from the server component. */
  serverUrl: string;
  children: ReactNode;
}

/** Creates the room's Yjs document and its connection on mount and tears both down on unmount. */
export function RoomProvider({ roomId, serverUrl, children }: RoomProviderProps) {
  const [connection, setConnection] = useState<RoomConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = connectRoom({
      serverUrl,
      roomId,
      fetchTicket: getRoomTicket,
      onStatus: (value) => {
        setStatus(value);
        if (value === "connected") {
          setError(null);
        }
      },
      onError: setError,
    });
    setConnection(next);
    return () => {
      next.destroy();
      setConnection(null);
    };
  }, [roomId, serverUrl]);

  if (!connection) {
    return null;
  }
  return (
    <RoomContext.Provider value={{ doc: connection.doc, text: connection.text, status, error }}>
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
