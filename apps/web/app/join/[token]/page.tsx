import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { joinRoomAction } from "@/actions/invite";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { inviteTokenSchema } from "@/lib/invite";
import { findMemberRole, findRoomByInviteToken } from "@/lib/rooms";
import { invitePath, roomPath, signInRedirect } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Join a room · Collaborative Code Editor",
  robots: { index: false },
};

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

// Rendering never writes: only the Join button's POST adds the membership (ADR 0003).
export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  const user = toSessionUser(await auth());
  if (!user) {
    // Before the token is looked at, so a signed-out visitor learns nothing about it.
    redirect(signInRedirect(invitePath(token)));
  }

  const parsed = inviteTokenSchema.safeParse(token);
  const room = parsed.success ? await findRoomByInviteToken(parsed.data) : null;
  if (!room) {
    notFound();
  }
  if ((await findMemberRole(room.id, user.id)) !== null) {
    redirect(roomPath(room.id));
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Join {room.name}</h1>
      <p className="text-muted-foreground">
        {room.creator.name ?? "Someone"} invited you to edit this room together.
      </p>
      <form action={joinRoomAction} className="w-full">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" className="w-full">
          Join room
        </Button>
      </form>
    </main>
  );
}
