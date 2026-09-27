import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import { authConfig, isProtectedPath, toSessionUser } from "@/lib/auth.config";
import { SIGN_IN_PATH } from "@/lib/routes";

type JwtParams = Parameters<typeof authConfig.callbacks.jwt>[0];
type SessionParams = Parameters<typeof authConfig.callbacks.session>[0];
type AuthorizedParams = Parameters<typeof authConfig.callbacks.authorized>[0];

const { jwt, session, authorized } = authConfig.callbacks;

function authorizedFor(pathname: string, signedIn: boolean): ReturnType<typeof authorized> {
  const params = {
    auth: signedIn ? { user: { id: "user-1" }, expires: "2099-01-01T00:00:00.000Z" } : null,
    request: { nextUrl: new URL(`http://localhost:3000${pathname}`) },
  } as unknown as AuthorizedParams;
  return authorized(params);
}

describe("authConfig", () => {
  it("uses JWT sessions and the custom sign-in page", () => {
    expect(authConfig.session.strategy).toBe("jwt");
    expect(authConfig.pages.signIn).toBe(SIGN_IN_PATH);
    expect(authConfig.providers).toHaveLength(1);
  });

  // GitHub returns iss=https://github.com/login/oauth on the callback (RFC 9207); without a
  // matching issuer Auth.js rejects the sign-in with "unexpected iss response parameter value".
  it("declares GitHub's OAuth issuer so the callback's iss parameter validates", () => {
    const [github] = authConfig.providers;
    expect(github?.options?.issuer).toBe("https://github.com/login/oauth");
  });
});

describe("jwt callback", () => {
  it("puts the user id, name and picture on the token at sign-in", async () => {
    const token = await jwt({
      token: { sub: "user-1" },
      user: { id: "user-1", name: "Ada", image: "https://avatars.githubusercontent.com/u/1" },
    } as JwtParams);

    expect(token).toMatchObject({
      id: "user-1",
      name: "Ada",
      picture: "https://avatars.githubusercontent.com/u/1",
    });
  });

  it("keeps existing claims on later calls without a user", async () => {
    const existing: JWT = { id: "user-1", name: "Ada", picture: null };
    const token = await jwt({ token: { ...existing } } as JwtParams);

    expect(token).toEqual(existing);
  });

  it("falls back to existing token claims when the user has no name or image", async () => {
    const token = await jwt({
      token: { name: "gh-login", picture: "https://avatars.githubusercontent.com/u/2" },
      user: { id: "user-2", name: null, image: null },
    } as JwtParams);

    expect(token).toMatchObject({
      id: "user-2",
      name: "gh-login",
      picture: "https://avatars.githubusercontent.com/u/2",
    });
  });

  it("uses null when neither user nor token has a name or picture", async () => {
    const token = await jwt({ token: {}, user: { id: "user-3" } } as JwtParams);

    expect(token).toMatchObject({ id: "user-3", name: null, picture: null });
  });
});

describe("session callback", () => {
  const baseSession: Session = {
    user: { name: "Ada", image: null },
    expires: "2099-01-01T00:00:00.000Z",
  };

  it("exposes the user id from the token", async () => {
    const result = await session({
      session: structuredClone(baseSession),
      token: { id: "user-1" },
    } as unknown as SessionParams);

    expect(result.user?.id).toBe("user-1");
  });

  it("leaves the session unchanged when the token has no id", async () => {
    const result = await session({
      session: structuredClone(baseSession),
      token: {},
    } as unknown as SessionParams);

    expect(result.user?.id).toBeUndefined();
  });
});

describe("authorized callback", () => {
  it.each([
    "/dashboard",
    "/dashboard/settings",
    "/room/abc123",
    "/join/some-invite-token",
  ])("blocks signed-out visitors from %s", (pathname) => {
    expect(authorizedFor(pathname, false)).toBe(false);
  });

  it("allows signed-in users into protected routes", () => {
    expect(authorizedFor("/room/abc123", true)).toBe(true);
  });

  it.each(["/", "/sign-in", "/rooms-info"])("allows anyone to open %s", (pathname) => {
    expect(authorizedFor(pathname, false)).toBe(true);
  });
});

describe("isProtectedPath", () => {
  it("matches protected prefixes on segment boundaries only", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/room/1")).toBe(true);
    expect(isProtectedPath("/room")).toBe(true);
    expect(isProtectedPath("/roomy")).toBe(false);
    expect(isProtectedPath("/dashboards")).toBe(false);
    expect(isProtectedPath("/join/tok")).toBe(true);
    expect(isProtectedPath("/joined")).toBe(false);
  });
});

describe("toSessionUser", () => {
  it("returns null when signed out or the session has no user id", () => {
    expect(toSessionUser(null)).toBeNull();
    expect(toSessionUser({ expires: "x" })).toBeNull();
    expect(toSessionUser({ user: { name: "Ada" }, expires: "x" })).toBeNull();
  });

  it("maps the session user and fills in missing name and image", () => {
    expect(toSessionUser({ user: { id: "u1", name: "Ada", image: "img" }, expires: "x" })).toEqual({
      id: "u1",
      name: "Ada",
      image: "img",
    });
    expect(toSessionUser({ user: { id: "u2" }, expires: "x" })).toEqual({
      id: "u2",
      name: "Anonymous",
      image: null,
    });
  });
});
