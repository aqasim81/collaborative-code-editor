"use client";

import type { SessionUser } from "@collab-editor/shared";
import { useState } from "react";
import { PresenceList } from "@/components/room/presence-list";
import { RoomProvider, useRoom } from "@/components/room/room-provider";
import type { LanguageId } from "@/lib/languages";
import { CodeEditor } from "./code-editor";
import { ConnectionStatus } from "./connection-status";
import { Toolbar } from "./toolbar";

interface RoomEditorProps {
  roomId: string;
  roomName: string;
  initialLanguage: LanguageId;
  /** The signed-in user, as the session shows it. */
  user: SessionUser;
  /** WS server URL, from the server component's validated env. */
  serverUrl: string;
}

interface RoomViewProps {
  roomName: string;
  selfId: string;
  language: LanguageId;
  onLanguageChange: (language: LanguageId) => void;
}

function RoomView({ roomName, selfId, language, onLanguageChange }: RoomViewProps) {
  const { text, awareness, status, error, reloadHint } = useRoom();
  return (
    <div className="flex h-full flex-col">
      <Toolbar
        roomName={roomName}
        status={<ConnectionStatus status={status} error={error} />}
        language={language}
        onLanguageChange={onLanguageChange}
      />
      {error ? (
        <p
          role="alert"
          className="shrink-0 border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          Could not join this room: {error}
        </p>
      ) : null}
      {reloadHint && !error ? (
        <output className="flex shrink-0 items-center gap-3 border-b border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          <span>Having trouble reconnecting. Reloading the page may help.</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-yellow-400 px-2 py-0.5 font-medium hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-yellow-600 dark:hover:bg-yellow-900"
          >
            Reload
          </button>
        </output>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <CodeEditor language={language} text={text} awareness={awareness} />
        </div>
        <div className="hidden w-56 shrink-0 border-l border-neutral-200 md:block dark:border-neutral-800">
          <PresenceList awareness={awareness} selfId={selfId} />
        </div>
      </div>
    </div>
  );
}

export function RoomEditor({
  roomId,
  roomName,
  initialLanguage,
  user,
  serverUrl,
}: RoomEditorProps) {
  const [language, setLanguage] = useState<LanguageId>(initialLanguage);

  return (
    <RoomProvider
      roomId={roomId}
      user={user}
      serverUrl={serverUrl}
      // Server-rendered and shown until the connection exists, so the toolbar doesn't pop in.
      fallback={
        <Toolbar
          roomName={roomName}
          status={<ConnectionStatus status="connecting" error={null} />}
          language={language}
          onLanguageChange={setLanguage}
        />
      }
    >
      <RoomView
        roomName={roomName}
        selfId={user.id}
        language={language}
        onLanguageChange={setLanguage}
      />
    </RoomProvider>
  );
}
