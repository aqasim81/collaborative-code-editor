import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RoomEditor } from "@/components/editor/room-editor";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { env } from "@/lib/env";
import { toLanguageId } from "@/lib/languages";
import { findRoomForMember } from "@/lib/rooms";
import { SIGN_IN_PATH } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Room · Collaborative Code Editor",
};

interface RoomPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;
  const user = toSessionUser(await auth());
  if (!user) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`/room/${id}`)}`);
  }

  // Invariant 2: membership, not the room id, grants access.
  const room = await findRoomForMember(id, user.id);
  if (!room) {
    notFound();
  }

  // The navbar is 3.5rem tall plus a 1px bottom border.
  return (
    <main className="h-[calc(100dvh-3.5rem-1px)]">
      <RoomEditor
        roomId={room.id}
        roomName={room.name}
        initialLanguage={toLanguageId(room.language)}
        user={user}
        serverUrl={env.NEXT_PUBLIC_WS_URL}
      />
    </main>
  );
}
