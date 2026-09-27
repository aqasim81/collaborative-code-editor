import type { Room, RoomRole } from "@prisma/client";
import { generateInviteToken } from "@/lib/invite";
import { type LanguageId, toLanguageId } from "@/lib/languages";
import { prisma } from "@/lib/prisma";

/** What the dashboard shows for a room. Display fields only, so it is safe to hand to the client. */
export type RoomSummary = {
  id: string;
  name: string;
  language: LanguageId;
  role: RoomRole;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * `Room.updatedAt` doubles as "last activity": it is bumped when a member fetches a room ticket, at most
 * once per this interval, so an open room costs at most one write a minute.
 */
export const ROOM_ACTIVITY_RESOLUTION_MS = 60_000;

/**
 * Returns the room only when the user is a member of it (Invariant 2). A room that
 * doesn't exist and a room the user can't access look the same to the caller.
 */
export function findRoomForMember(roomId: string, userId: string): Promise<Room | null> {
  return prisma.room.findFirst({
    where: { id: roomId, members: { some: { userId } } },
  });
}

/** The user's membership of a room, with the room; null for a non-member or a missing room (Invariant 2). */
export function findMembership(
  roomId: string,
  userId: string,
): Promise<{ role: RoomRole; room: Room } | null> {
  return prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true, room: true },
  });
}

/** The user's role in a room; null for a non-member or a missing room. */
export async function findMemberRole(roomId: string, userId: string): Promise<RoomRole | null> {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  });
  return membership?.role ?? null;
}

/** Every room the user is a member of, most recently active first. */
export async function listRoomsForMember(userId: string): Promise<RoomSummary[]> {
  const memberships = await prisma.roomMember.findMany({
    where: { userId },
    select: {
      role: true,
      room: { select: { id: true, name: true, language: true, createdAt: true, updatedAt: true } },
    },
    orderBy: [{ room: { updatedAt: "desc" } }, { room: { createdAt: "desc" } }],
  });
  return memberships.map(({ role, room }) => ({
    ...room,
    language: toLanguageId(room.language),
    role,
  }));
}

/** Matches the room only if the user is its OWNER: the filter every owner-only write uses. */
function ownedRoomWhere(roomId: string, userId: string) {
  return { id: roomId, members: { some: { userId, role: "OWNER" as const } } };
}

/** Creates a room and its OWNER membership in one write, so a room never exists without a member. */
export function createRoomWithOwner(input: {
  name: string;
  language: LanguageId;
  userId: string;
}): Promise<{ id: string }> {
  return prisma.room.create({
    data: {
      name: input.name,
      language: input.language,
      creatorId: input.userId,
      inviteToken: generateInviteToken(),
      members: { create: { userId: input.userId, role: "OWNER" } },
    },
    select: { id: true },
  });
}

/** The room an invite token belongs to, with what the invite page shows; null for an unknown token. */
export function findRoomByInviteToken(
  token: string,
): Promise<{ id: string; name: string; creator: { name: string | null } } | null> {
  return prisma.room.findUnique({
    where: { inviteToken: token },
    select: { id: true, name: true, creator: { select: { name: true } } },
  });
}

/**
 * Makes the user an EDITOR of the room. Idempotent, and never touches an existing membership, so an
 * OWNER who opens their own link stays OWNER.
 */
export async function addEditorMember(roomId: string, userId: string): Promise<void> {
  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    update: {},
    create: { roomId, userId, role: "EDITOR" },
  });
}

/**
 * Replaces the room's invite token, so the old link stops working, only if the user owns the room.
 * Returns the new token, or null when nothing matched. Existing members keep their membership.
 */
export async function rotateInviteToken(roomId: string, userId: string): Promise<string | null> {
  const inviteToken = generateInviteToken();
  const { count } = await prisma.room.updateMany({
    where: ownedRoomWhere(roomId, userId),
    data: { inviteToken },
  });
  return count > 0 ? inviteToken : null;
}

/**
 * Deletes the room only if the user owns it; returns how many rooms went (0 or 1). Members cascade. A
 * deleted room gets a `RoomPurge` row in the same transaction, so its WS-server document is purged even
 * if the process dies right after (#48).
 */
export function deleteOwnedRoom(roomId: string, userId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.room.deleteMany({
      where: ownedRoomWhere(roomId, userId),
    });
    if (count > 0) {
      await tx.roomPurge.create({ data: { roomId, userId } });
    }
    return count;
  });
}

/** Records activity in a room, skipping the write if it was recorded within the last minute. */
export async function markRoomActive(roomId: string, now = new Date()): Promise<void> {
  await prisma.room.updateMany({
    where: {
      id: roomId,
      updatedAt: { lt: new Date(now.getTime() - ROOM_ACTIVITY_RESOLUTION_MS) },
    },
    data: { updatedAt: now },
  });
}
