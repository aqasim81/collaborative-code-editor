"use client";

import { useState } from "react";
import { RoomProvider, useRoom } from "@/components/room/room-provider";
import type { LanguageId } from "@/lib/languages";
import { CodeEditor } from "./code-editor";
import { Toolbar } from "./toolbar";

interface RoomEditorProps {
  roomId: string;
  roomName: string;
  initialLanguage: LanguageId;
  /** WS server URL, from the server component's validated env. */
  serverUrl: string;
}

function SharedEditor({ language }: { language: LanguageId }) {
  const { text, error } = useRoom();
  return (
    <div className="flex h-full flex-col">
      {error ? (
        <p
          role="alert"
          className="shrink-0 border-b border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          Could not join this room: {error}
        </p>
      ) : null}
      <div className="min-h-0 flex-1">
        <CodeEditor language={language} text={text} />
      </div>
    </div>
  );
}

export function RoomEditor({ roomId, roomName, initialLanguage, serverUrl }: RoomEditorProps) {
  const [language, setLanguage] = useState<LanguageId>(initialLanguage);

  return (
    <div className="flex h-full flex-col">
      <Toolbar roomName={roomName} language={language} onLanguageChange={setLanguage} />
      <div className="min-h-0 flex-1">
        <RoomProvider roomId={roomId} serverUrl={serverUrl}>
          <SharedEditor language={language} />
        </RoomProvider>
      </div>
    </div>
  );
}
