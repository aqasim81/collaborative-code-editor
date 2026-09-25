# 0001. Use Auth.js JWT sessions so the WS server can authenticate without the database

- **Status:** Accepted (amended 2026-09-26, see addendum)
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

## Addendum (2026-09-26, Phase 4, #7): the WS server authenticates with a room ticket

The last consequence above came true: the Auth.js session cookie is `httpOnly`, a JWE, and scoped to the web app's origin, so the browser can't present it to the WS server on another origin. Decrypting it would also only prove identity, while Invariant 2 needs a per-room membership check that requires the database.

**Decision.** The alternative "a separate signed WS ticket issued by the web app" is adopted:

- The `getRoomTicket(roomId)` server action (`apps/web/actions/room-ticket.ts`) checks the session and the `RoomMember` row for `(roomId, user)`.
- On success it returns an HS256 JWT `{ sub, aud, name, roomId, iat, exp }` (audience `collab-editor:ws-room`) that lives at most 5 minutes, signed with a new `WS_TICKET_SECRET` (at least 32 characters).
- The WS server verifies the ticket on upgrade (`apps/ws-server/src/auth/ticket.ts`) and rejects the connection with `401` when it is missing, invalid, not a room ticket (wrong `aud`), expired, longer-lived than 5 minutes, or for another room. It never touches Postgres and doesn't need `AUTH_SECRET`.

**Consequences.**
- `WS_TICKET_SECRET` must be identical in the web app and the WS server and rotated together; `AUTH_SECRET` stays in the web app only.
- Removing a member takes effect for new connections within 5 minutes; an open socket stays connected until it closes (revocation of live sockets is out of scope).
- The client must fetch a fresh ticket before each (re)connect; Phase 5 wires this into the y-websocket provider.
