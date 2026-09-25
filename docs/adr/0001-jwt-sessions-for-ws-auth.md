# 0001. Use Auth.js JWT sessions so the WS server can authenticate without the database

- **Status:** Accepted
- **Date:** 2026-09-26

## Context

The web app (Next.js) signs users in with GitHub through Auth.js v5. The WS server (Phase 4) has to authenticate every connection before it joins a room (Invariant 1). The WS server has no Prisma client, and a database lookup on every connection and reconnect would couple it to Postgres and add latency.

Auth.js offers two session strategies: `database`, where an opaque token is looked up in the `Session` table, and `jwt`, where the session is a self-contained token.

## Decision

- Use `session: { strategy: "jwt" }`, with the Prisma adapter still persisting `User` and `Account`.
- The `jwt` callback in `apps/web/lib/auth.config.ts` puts `id`, `name` and `picture` on the token at sign-in. The claims are typed as `AuthTokenClaims` in `@collab-editor/shared`.
- Auth.js tokens are **JWE** (encrypted), not plain signed JWTs. In Phase 4 the WS server will decode them with `decode()` from `@auth/core/jwt`. It uses the same `AUTH_SECRET`, with the session cookie name as the salt (`authjs.session-token`, or `__Secure-authjs.session-token` over HTTPS).
- The config is split into `auth.config.ts` (edge-safe, used by middleware) and `auth.ts` (adds the Prisma adapter), because Prisma can't run in the edge middleware runtime.

## Consequences

- The WS server verifies users with only `AUTH_SECRET`; it never touches Postgres.
- Sessions can't be revoked server-side before they expire (Auth.js default 30 days). Signing out clears the cookie, but a copied token stays valid until `exp`. Room membership is still checked per room, so a valid token alone grants no room access (Invariant 2).
- `AUTH_SECRET` must be shared by the web app and the WS server, and rotated together.
- The `Session` table exists (adapter schema) but stays empty.
- Phase 4 must work out how the browser presents the token to the WS server. The session cookie is `httpOnly` and may not be sent cross-origin.

## Alternatives considered

- **Database sessions:** revocable, but the WS server would need database access on every connection.
- **A separate signed WS ticket issued by the web app:** short-lived and narrowly scoped, but it adds an endpoint and a second token format. It can be revisited in Phase 4 if cookie forwarding proves awkward.
