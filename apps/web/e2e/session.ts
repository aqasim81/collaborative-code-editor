// Signs a browser in without GitHub: mints the Auth.js session cookie the web app would set, from
// AUTH_SECRET. Used by the production check's global setup and the demo recording; not by app code.
import type { Cookie } from "@playwright/test";
import type { User } from "@prisma/client";
import { encode } from "next-auth/jwt";

// The http cookie name; on https Auth.js prefixes it with __Secure-. Both run on http localhost.
const SESSION_COOKIE = "authjs.session-token";

/**
 * The session cookie for `user`, checked against the running web app at `baseURL`. A secret other than
 * the web server's makes a cookie it silently ignores, so that is an error here rather than a redirect later.
 */
export async function mintSessionCookie(
  user: Pick<User, "id" | "name" | "image">,
  secret: string,
  baseURL: string,
): Promise<Cookie> {
  const value = await encode({
    token: { id: user.id, name: user.name, picture: user.image, sub: user.id },
    secret,
    salt: SESSION_COOKIE,
  });
  const session = await fetch(new URL("/api/auth/session", baseURL), {
    headers: { cookie: `${SESSION_COOKIE}=${value}` },
  });
  if (!session.ok) {
    // Auth.js answers 500 when `next start` runs without AUTH_URL (untrusted host).
    throw new Error(
      `The web app answered ${session.status} on /api/auth/session: set AUTH_URL for pnpm start, and check its log.`,
    );
  }
  const body: unknown = await session.json();
  if (typeof body !== "object" || body === null || !("user" in body)) {
    throw new Error(
      "The web app refused the minted session: AUTH_SECRET differs from the server's.",
    );
  }
  return {
    name: SESSION_COOKIE,
    value,
    domain: new URL(baseURL).hostname,
    path: "/",
    expires: -1,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  };
}
