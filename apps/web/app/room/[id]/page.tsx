import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { RoomEditor } from "@/components/editor/room-editor";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { env } from "@/lib/env";
import { inviteUrl } from "@/lib/invite";
import { toLanguageId } from "@/lib/languages";
import { findMembership } from "@/lib/rooms";
import { roomPath, signInRedirect } from "@/lib/routes";

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
    redirect(signInRedirect(roomPath(id)));
  }

  // Invariant 2: membership, not the room id, grants access.
  const membership = await findMembership(id, user.id);
  if (!membership) {
    notFound();
  }
  const { room, role } = membership;

  // The navbar is 3.5rem tall plus a 1px bottom border.
  return (
    <main className="h-[calc(100dvh-3.5rem-1px)]">
      <RoomEditor
        roomId={room.id}
        roomName={room.name}
        initialLanguage={toLanguageId(room.language)}
        user={user}
        serverUrl={env.NEXT_PUBLIC_WS_URL}
        // The invite token is a secret only the owner is shown (ADR 0003). Built here, not fetched on
        // click, so the Share button can copy it within the click.
        inviteUrl={role === "OWNER" ? inviteUrl(room.inviteToken, env.NEXT_PUBLIC_SITE_URL) : null}
      />
    </main>
  );
}
