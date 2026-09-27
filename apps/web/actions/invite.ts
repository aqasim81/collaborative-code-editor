"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { toSessionUser } from "@/lib/auth.config";
import { env } from "@/lib/env";
import { inviteTokenSchema, inviteUrl } from "@/lib/invite";
import { NOT_SIGNED_IN, type Result } from "@/lib/result";
import { INVALID_ROOM_ID, ROOM_NOT_FOUND, roomIdSchema } from "@/lib/room-input";
import {
  addEditorMember,
  findMemberRole,
  findRoomByInviteToken,
  rotateInviteToken,
} from "@/lib/rooms";
import { roomPath } from "@/lib/routes";

// A malformed, unknown and reset token get the same answer, which says nothing about any room.
const INVITE_NOT_FOUND = "Invite not found";

/**
 * Makes the signed-in user an EDITOR of the room the invite token belongs to (Invariant 2: only a valid
 * token grants membership, ADR 0003). An existing member keeps their role.
 */
export async function acceptInvite(token: unknown): Promise<Result<{ roomId: string }>> {
  const parsed = inviteTokenSchema.safeParse(token);
  if (!parsed.success) {
    return { success: false, error: INVITE_NOT_FOUND };
  }

  const user = toSessionUser(await auth());
  if (!user) {
    return { success: false, error: NOT_SIGNED_IN };
  }

  try {
    const room = await findRoomByInviteToken(parsed.data);
    if (!room) {
      return { success: false, error: INVITE_NOT_FOUND };
    }
    await addEditorMember(room.id, user.id);
    return { success: true, data: { roomId: room.id } };
  } catch {
    return { success: false, error: "Could not join the room. Try again." };
  }
}

/**
 * The invite page's Join form. Joining is a POST, never a side effect of opening the link, so link
 * previews and prefetches can't create memberships.
 */
export async function joinRoomAction(formData: FormData): Promise<void> {
  const result = await acceptInvite(formData.get("token"));
  if (!result.success) {
    // Reset between page load and submit, a forged form, or a lost session: the page's 404.
    notFound();
  }
  redirect(roomPath(result.data.roomId));
}

/**
 * Gives a room the signed-in user owns a new invite link; the old one stops working. Members who
 * already joined keep access. A non-member gets the same answer as for a missing room.
 */
export async function resetInviteLink(roomId: unknown): Promise<Result<{ inviteUrl: string }>> {
  const parsed = roomIdSchema.safeParse(roomId);
  if (!parsed.success) {
    return { success: false, error: INVALID_ROOM_ID };
  }

  const user = toSessionUser(await auth());
  if (!user) {
    return { success: false, error: NOT_SIGNED_IN };
  }

  try {
    // The rotation itself is scoped to ownership; the role is only looked up to explain a refusal.
    const token = await rotateInviteToken(parsed.data, user.id);
    if (token === null) {
      const role = await findMemberRole(parsed.data, user.id);
      return {
        success: false,
        error: role === null ? ROOM_NOT_FOUND : "Only the room's owner can reset the invite link",
      };
    }
    // A cached room page (back/forward) would otherwise hand the Share button the revoked link.
    revalidatePath(roomPath(parsed.data));
    return { success: true, data: { inviteUrl: inviteUrl(token, env.NEXT_PUBLIC_SITE_URL) } };
  } catch {
    return { success: false, error: "Could not reset the invite link. Try again." };
  }
}
