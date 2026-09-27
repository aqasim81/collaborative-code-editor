// Records the README's demo: two demo users, Ada and Linus, editing one room side by side. Not part of
// `make verify` or CI. Needs the production web app and WS server running with throwaway secrets, and
// AUTH_SECRET / DATABASE_URL in this shell set to the same values. The steps from the two videos to
// docs/media/demo.gif are in the README's Setup section.
//
//   pnpm --filter @collab-editor/web exec tsx e2e/record-demo.ts <video-dir>
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as pause } from "node:timers/promises";
import { type Browser, chromium, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { generateInviteToken } from "../lib/invite";
import { roomPath } from "../lib/routes";
import { mintSessionCookie } from "./session";

const BASE_URL = "http://localhost:3000";
const SIZE = { width: 640, height: 400 };
const ROOM = { id: "demo-room", name: "demo" };
// Fixed ids, so a second run reuses the same rows; these two give contrasting caret colours
// (userColor; re-check if PRESENCE_COLORS changes).
const ADA = { id: "demo-ada-user", name: "Ada", image: null };
const LINUS = { id: "demo-linus-user", name: "Linus", image: null };

async function seed(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    for (const user of [ADA, LINUS]) {
      await prisma.user.upsert({ where: { id: user.id }, update: {}, create: user });
    }
    await prisma.room.upsert({
      where: { id: ROOM.id },
      update: {},
      create: { ...ROOM, creatorId: ADA.id, inviteToken: generateInviteToken() },
    });
    for (const [userId, role] of [
      [ADA.id, "OWNER"],
      [LINUS.id, "EDITOR"],
    ] as const) {
      await prisma.roomMember.upsert({
        where: { roomId_userId: { roomId: ROOM.id, userId } },
        update: {},
        create: { roomId: ROOM.id, userId, role },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

interface Pane {
  page: Page;
  /** When the page (and so its video) started, to trim the loading off later. */
  startedAt: number;
}

async function openRoom(
  browser: Browser,
  user: typeof ADA,
  secret: string,
  dir: string,
): Promise<Pane> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: SIZE,
    colorScheme: "dark",
    recordVideo: { dir, size: SIZE },
  });
  await context.addCookies([await mintSessionCookie(user, secret, BASE_URL)]);
  const page = await context.newPage();
  const startedAt = Date.now();
  await page.goto(roomPath(ROOM.id));
  await expect(page.getByText("Connected")).toBeVisible({ timeout: 15_000 });
  return { page, startedAt };
}

/** Types like a person: 60–120 ms between keys. */
async function typeLikeAPerson(page: Page, text: string): Promise<void> {
  for (const char of text) {
    await page.keyboard.type(char);
    await pause(60 + Math.random() * 60);
  }
}

async function main(): Promise<void> {
  const dir = process.argv[2];
  const secret = process.env.AUTH_SECRET;
  if (!dir || !secret) {
    throw new Error("Usage: AUTH_SECRET=… DATABASE_URL=… tsx e2e/record-demo.ts <video-dir>");
  }
  await seed();
  const browser = await chromium.launch();
  try {
    const ada = await openRoom(browser, ADA, secret, dir);
    const linus = await openRoom(browser, LINUS, secret, dir);
    await linus.page.getByRole("button", { name: /People/ }).click();
    await expect(linus.page.getByText("In this room (2)")).toBeVisible();

    // A rerun starts from an empty document; the video is trimmed to start after this.
    await ada.page.locator(".cm-content").click();
    await ada.page.keyboard.press("ControlOrMeta+a");
    await ada.page.keyboard.press("Backspace");
    await pause(800);
    const recordingFrom = Date.now();

    // closeBrackets types the closers and Enter indents, so only the openers are typed here.
    await typeLikeAPerson(ada.page, "function greet(name) {");
    await ada.page.keyboard.press("Escape");
    await ada.page.keyboard.press("Enter");
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the JavaScript Ada types, not a template.
    await typeLikeAPerson(ada.page, "return `Hello, ${name}!`;");
    await pause(600);

    // Both edit line 1 at once: Linus gives the parameter a default, Ada exports the function.
    await linus.page.locator(".cm-line").first().click();
    await linus.page.keyboard.press("Home");
    for (let i = 0; i < "function greet(name".length; i += 1) {
      await linus.page.keyboard.press("ArrowRight");
    }
    await Promise.all([
      typeLikeAPerson(linus.page, ' = "world"'),
      (async () => {
        await pause(300);
        await ada.page.keyboard.press("ArrowUp");
        await ada.page.keyboard.press("Home");
        await typeLikeAPerson(ada.page, "export ");
        // Closes the keyword completion the word opened.
        await ada.page.keyboard.press("Escape");
      })(),
    ]);
    await pause(800);

    // Linus calls it at the end, and Ada's pane follows.
    await linus.page.keyboard.press("ControlOrMeta+End");
    await linus.page.keyboard.press("Enter");
    await linus.page.keyboard.press("Enter");
    await typeLikeAPerson(linus.page, 'greet("Ada");');
    await pause(2_500);

    const videos: string[] = [];
    for (const { page, startedAt } of [ada, linus]) {
      await page.context().close();
      const path = await page.video()?.path();
      if (path) {
        videos.push(`${path} ${((recordingFrom - startedAt) / 1000).toFixed(2)}`);
      }
    }
    // One line per pane: the video file and the seconds to trim from its start.
    writeFileSync(join(dir, "videos.txt"), `${videos.join("\n")}\n`);
    process.stdout.write(`${videos.join("\n")}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
