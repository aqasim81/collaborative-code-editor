// Signs the check in as the seed room's owner without GitHub (e2e/session.ts). Local production checks
// only; nothing here is imported by app code.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Cookie, FullConfig } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { SEED_ROOM_ID, SIGNED_OUT_ONLY, STORAGE_STATE } from "./constants";
import { mintSessionCookie } from "./session";

const RUN_HINT =
  "Run it as: cd apps/web && node --env-file=.env ./node_modules/.bin/playwright test " +
  "(or E2E_SIGNED_OUT_ONLY=1 pnpm e2e:prod for the public pages only).";

async function expectServer(url: string, name: string): Promise<void> {
  try {
    await fetch(url);
  } catch {
    throw new Error(`${name} is not answering at ${url}. Start it first. ${RUN_HINT}`);
  }
}

function writeState(cookies: Cookie[]): void {
  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(STORAGE_STATE, JSON.stringify({ cookies, origins: [] }));
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:3000";
  await expectServer(baseURL, "The web app (pnpm --filter @collab-editor/web start)");
  if (SIGNED_OUT_ONLY) {
    writeState([]);
    return;
  }

  const { AUTH_SECRET, DATABASE_URL, NEXT_PUBLIC_WS_URL } = process.env;
  if (!AUTH_SECRET || !DATABASE_URL || !NEXT_PUBLIC_WS_URL) {
    throw new Error(`AUTH_SECRET, DATABASE_URL and NEXT_PUBLIC_WS_URL must be set. ${RUN_HINT}`);
  }
  await expectServer(
    `${NEXT_PUBLIC_WS_URL.replace(/^ws/, "http")}/health`,
    "The WS server (node --env-file=../web/.env dist/index.js in apps/ws-server)",
  );

  const prisma = new PrismaClient();
  try {
    const room = await prisma.room.findUnique({
      where: { id: SEED_ROOM_ID },
      select: { creator: { select: { id: true, name: true, image: true } } },
    });
    if (!room) {
      throw new Error("No seed room. Run pnpm --filter @collab-editor/web db:seed first.");
    }
    try {
      writeState([await mintSessionCookie(room.creator, AUTH_SECRET, baseURL)]);
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)} ${RUN_HINT}`, {
        cause: error,
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}
