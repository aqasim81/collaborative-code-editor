import { expect, type Locator, type Page, test } from "@playwright/test";
import { DASHBOARD_PATH, roomPath, SIGN_IN_PATH, signInErrorPath } from "../lib/routes";
import { SEED_ROOM_ID, SIGNED_OUT_ONLY, STORAGE_STATE } from "./constants";

const ROOM = roomPath(SEED_ROOM_ID);

const VIEWPORTS = [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

/** The path and query of the page's URL now, to spot redirects. */
function currentPath(page: Page): string {
  const { pathname, search } = new URL(page.url());
  return pathname + search;
}

/**
 * Every console error or warning and uncaught error the page produces. A 404 page's own document is the
 * one exception: the browser logs its status, and that status is the page doing its job.
 */
function collectConsole(page: Page, notFoundPath: string | null): string[] {
  const messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") {
      return;
    }
    const ownNotFound =
      notFoundPath !== null &&
      message.text().includes("404") &&
      new URL(message.location().url).pathname === notFoundPath;
    if (!ownNotFound) {
      messages.push(`${page.url()} ${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => messages.push(`${page.url()} uncaught: ${error.message}`));
  return messages;
}

/** Loads `path` (no redirect, the given status), waits for `ready` if given, and expects a clean console. */
async function expectQuietPage(
  page: Page,
  path: string,
  status: number,
  ready?: (page: Page) => Locator,
): Promise<void> {
  const messages = collectConsole(page, status === 404 ? path : null);
  const response = await page.goto(path);
  // A redirect (e.g. to sign-in) would check some other page.
  expect(currentPath(page)).toBe(path);
  expect(response?.status()).toBe(status);
  if (ready) {
    await expect(ready(page)).toBeVisible();
  }
  await page.waitForLoadState("networkidle");
  expect(messages).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page, path: string): Promise<void> {
  await page.goto(path);
  expect(currentPath(page)).toBe(path);
  // After client components have hydrated, which is when a toolbar or panel could overflow.
  await page.waitForLoadState("networkidle");
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `${path} scrolls sideways at ${innerWidth}px`).toBeLessThanOrEqual(
    innerWidth,
  );
}

test.describe("signed out", () => {
  for (const [path, status] of [
    ["/", 200],
    [SIGN_IN_PATH, 200],
    [signInErrorPath("AccessDenied"), 200],
    ["/does-not-exist", 404],
  ] as const) {
    test(`${path} logs nothing to the console`, async ({ page }) => {
      await expectQuietPage(page, path, status);
    });
  }

  for (const viewport of VIEWPORTS) {
    test(`/ fits ${viewport.width}px without scrolling sideways`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await expectNoHorizontalScroll(page, "/");
    });
  }
});

test.describe("signed in", () => {
  test.skip(SIGNED_OUT_ONLY, "E2E_SIGNED_OUT_ONLY=1");
  test.use({ storageState: STORAGE_STATE });

  test(`${DASHBOARD_PATH} logs nothing to the console`, async ({ page }) => {
    await expectQuietPage(page, DASHBOARD_PATH, 200);
  });

  test(`${ROOM} connects and logs nothing to the console`, async ({ page }) => {
    await expectQuietPage(page, ROOM, 200, (p) =>
      p.getByRole("status").filter({ hasText: "Connected" }),
    );
  });

  test("a room the user can't open gets the room 404, quietly", async ({ page }) => {
    await expectQuietPage(page, roomPath("not-a-room"), 404, (p) =>
      p.getByText("It doesn't exist or you don't have access"),
    );
  });

  for (const viewport of VIEWPORTS) {
    for (const path of [DASHBOARD_PATH, ROOM]) {
      test(`${path} fits ${viewport.width}px without scrolling sideways`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await expectNoHorizontalScroll(page, path);
      });
    }
  }
});
