import type { SessionUser } from "@collab-editor/shared";
import type { NextAuthConfig, Session } from "next-auth";
import GitHub from "next-auth/providers/github";
import { env } from "@/lib/env";
import { SIGN_IN_PATH } from "@/lib/routes";

// Edge-safe Auth.js config: no database access, so middleware can use it.
// lib/auth.ts adds the Prisma adapter for the Node.js runtime.

// GitHub sends iss=<this> on the OAuth callback (RFC 9207). Auth.js validates it against the
// provider's issuer, which the built-in GitHub provider leaves unset.
const GITHUB_OAUTH_ISSUER = "https://github.com/login/oauth";

const PROTECTED_PREFIXES = ["/dashboard", "/join", "/room"] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Narrows an Auth.js session to the fields the app relies on; null when signed out. */
export function toSessionUser(session: Session | null): SessionUser | null {
  const user = session?.user;
  if (!user?.id) {
    return null;
  }
  return { id: user.id, name: user.name ?? "Anonymous", image: user.image ?? null };
}

export const authConfig = {
  providers: [
    GitHub({
      clientId: env.AUTH_GITHUB_ID,
      clientSecret: env.AUTH_GITHUB_SECRET,
      issuer: GITHUB_OAUTH_ISSUER,
    }),
  ],
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  // Failures land on the sign-in page too (`?error=<type>`), not Auth.js's built-in error page.
  pages: { signIn: SIGN_IN_PATH, error: SIGN_IN_PATH },
  callbacks: {
    // `user` is only present on sign-in; later calls keep the claims already on the token.
    jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.name = user.name ?? token.name ?? null;
        token.picture = user.image ?? token.picture ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
    // Returning false makes the middleware redirect to the sign-in page with a callbackUrl.
    authorized({ auth, request }) {
      return !isProtectedPath(request.nextUrl.pathname) || Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
