"use client";

import type { SessionUser } from "@collab-editor/shared";
import { type ReactNode, useState } from "react";
import { PresenceList } from "@/components/room/presence-list";
import { PRESENCE_PANEL_ID, PresenceToggle } from "@/components/room/presence-toggle";
import { RoomProvider, useRoom } from "@/components/room/room-provider";
import { RoomStatusBanner } from "@/components/room/room-status-banner";
import { ShareRoomButton } from "@/components/room/share-room-button";
import type { LanguageId } from "@/lib/languages";
import { cn } from "@/lib/utils";
import { usePresence } from "@/lib/yjs/awareness";
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
  /** The room's invite link for its owner; null for everyone else (ADR 0003). */
  inviteUrl: string | null;
}

interface RoomViewProps {
  roomId: string;
  roomName: string;
  actions: ReactNode;
  selfId: string;
  language: LanguageId;
  onLanguageChange: (language: LanguageId) => void;
}

function RoomView({
  roomId,
  roomName,
  actions,
  selfId,
  language,
  onLanguageChange,
}: RoomViewProps) {
  const { text, awareness, status, error } = useRoom();
  const people = usePresence(awareness, selfId);
  const [presenceOpen, setPresenceOpen] = useState(false);
  return (
    <div className="flex h-full flex-col">
      <Toolbar
        roomName={roomName}
        status={<ConnectionStatus status={status} error={error} />}
        language={language}
        onLanguageChange={onLanguageChange}
        actions={
          <>
            {actions}
            <PresenceToggle
              count={people.length}
              open={presenceOpen}
              onOpenChange={setPresenceOpen}
            />
          </>
        }
      />
      <RoomStatusBanner roomId={roomId} />
      <div className="relative flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <CodeEditor language={language} text={text} awareness={awareness} />
        </div>
        {/* A sidebar from lg up; below lg an overlay the toolbar's People button opens. */}
        <div
          id={PRESENCE_PANEL_ID}
          className={cn(
            "shrink-0 border-l border-neutral-200 bg-background lg:static lg:block lg:w-56 lg:shadow-none dark:border-neutral-800",
            presenceOpen ? "absolute inset-y-0 right-0 z-10 w-64 shadow-lg" : "hidden",
          )}
        >
          <PresenceList entries={people} />
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
  inviteUrl,
}: RoomEditorProps) {
  const [language, setLanguage] = useState<LanguageId>(initialLanguage);
  const actions =
    inviteUrl === null ? null : <ShareRoomButton roomId={roomId} initialInviteUrl={inviteUrl} />;

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
          actions={actions}
        />
      }
    >
      <RoomView
        roomId={roomId}
        roomName={roomName}
        actions={actions}
        selfId={user.id}
        language={language}
        onLanguageChange={setLanguage}
      />
    </RoomProvider>
  );
}
