// Signs the check in as the seed room's owner without GitHub: mints the Auth.js session cookie the web
// app would set, from AUTH_SECRET. Local production checks only; nothing here is imported by app code.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FullConfig } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { SEED_ROOM_ID, SIGNED_OUT_ONLY, STORAGE_STATE } from "./constants";

// The http cookie name; on https Auth.js prefixes it with __Secure-. The check runs on http localhost.
const SESSION_COOKIE = "authjs.session-token";

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

function writeState(cookies: object[]): void {
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
    const { id, name, image } = room.creator;
    const value = await encode({
      token: { id, name, picture: image, sub: id },
      secret: AUTH_SECRET,
      salt: SESSION_COOKIE,
    });
    // A secret other than the web server's makes a cookie it silently ignores: every signed-in check
    // would then test the sign-in redirect instead.
    const session = await fetch(new URL("/api/auth/session", baseURL), {
      headers: { cookie: `${SESSION_COOKIE}=${value}` },
    });
    const body: unknown = await session.json();
    if (typeof body !== "object" || body === null || !("user" in body)) {
      throw new Error(
        `The web app refused the minted session: AUTH_SECRET here differs from the server's. ${RUN_HINT}`,
      );
    }
    const { hostname } = new URL(baseURL);
    writeState([
      {
        name: SESSION_COOKIE,
        value,
        domain: hostname,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
  } finally {
    await prisma.$disconnect();
  }
}
