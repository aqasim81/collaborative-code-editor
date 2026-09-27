// Dev-only seed: one room owned by the first user, so /room/<id> can be tried before
// room management exists. Idempotent: running it again leaves the same rows in place.
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const SEED_ROOM_ID = "seed-room";

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const owner = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    if (!owner) {
      process.stderr.write("No users yet. Sign in once with GitHub, then run db:seed again.\n");
      return 1;
    }

    await prisma.room.upsert({
      where: { id: SEED_ROOM_ID },
      update: {},
      create: {
        id: SEED_ROOM_ID,
        name: "Seed room",
        creatorId: owner.id,
        // Same format as lib/invite.ts generateInviteToken(), which this script can't import (no @/ alias).
        inviteToken: randomBytes(32).toString("base64url"),
      },
    });
    await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: SEED_ROOM_ID, userId: owner.id } },
      update: {},
      create: { roomId: SEED_ROOM_ID, userId: owner.id, role: "OWNER" },
    });

    process.stdout.write(`Seed room id: ${SEED_ROOM_ID} (owner: ${owner.name ?? owner.id})\n`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  },
);
