"use client";

import { useState } from "react";
import type { LanguageId } from "@/lib/languages";
import { CodeEditor } from "./code-editor";
import { Toolbar } from "./toolbar";

interface RoomEditorProps {
  roomName: string;
  initialLanguage: LanguageId;
}

export function RoomEditor({ roomName, initialLanguage }: RoomEditorProps) {
  const [language, setLanguage] = useState<LanguageId>(initialLanguage);

  return (
    <div className="flex h-full flex-col">
      <Toolbar roomName={roomName} language={language} onLanguageChange={setLanguage} />
      <div className="min-h-0 flex-1">
        <CodeEditor language={language} />
      </div>
    </div>
  );
}
