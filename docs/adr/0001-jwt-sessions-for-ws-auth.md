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
- Removing a member takes effect for new connections within 5 minutes; an open socket stays connected until it closes (revocation of live sockets is out of scope). Superseded by the next addendum: open sockets are now closed at ticket expiry.
- The client must fetch a fresh ticket before each (re)connect; Phase 5 wires this into the y-websocket provider.

## Addendum (2026-09-26, #18): sockets close when their ticket expires

The ticket was checked only on upgrade, so a socket outlived its ticket and a removed member kept a live
connection indefinitely.

**Decision.**
- The WS server closes each socket when its ticket's `exp` passes, with the application close code
  `4001` and reason `ticket expired` (`TICKET_EXPIRED_CLOSE_CODE` in `@collab-editor/shared`).
- The web client (`apps/web/lib/yjs/provider.ts`) treats `4001` as "fetch a fresh ticket via
  `getRoomTicket` and reconnect". The `Y.Doc` is kept, so local edits resync through Yjs.
- Membership revocation is **not** pushed from the web app to the WS server. A removed member is refused
  the fresh ticket, so revocation takes effect within one ticket lifetime (at most 5 minutes).

**Consequences.**
- Every connected member reconnects about every 5 minutes: one ticket request plus a Yjs sync-step
  exchange of state vectors and missing updates, with no lost edits.
- Clock skew between the web app and the WS server only moves the close earlier; the server caps the
  delay at the ticket TTL, so a web-app clock running ahead cannot stretch the 5-minute bound. The
  client refreshes on `4001` regardless of the expiry it saw, so skew cannot cause a stale-ticket loop.
- Pushing revocations (immediate removal) would need a web-app → WS-server channel; it can be revisited
  if a 5-minute window becomes too long.

## Addendum (2026-09-26, #19): the ticket travels in `Sec-WebSocket-Protocol`; upgrades are rate-limited

The ticket was sent as `/<roomId>?ticket=<jwt>`. Reverse proxies and access logs record request lines,
so a logged ticket could be replayed against its room until it expired. Upgrade attempts were also
unlimited, each costing an HMAC verification.

**Decision.**
- The client offers two subprotocols: `collab.v1` (`ROOM_PROTOCOL`) and `ticket.<jwt>`
  (`roomTicketProtocols(ticket)` in `@collab-editor/shared`). A JWT (base64url and `.`) is a valid
  subprotocol token.
- The WS server reads the ticket only from `Sec-WebSocket-Protocol`; it requires `collab.v1` and exactly
  one `ticket.` entry. The handshake response always selects `collab.v1` and never echoes the ticket.
  The `?ticket=` query string is not accepted (no fallback).
- Every upgrade attempt first takes a token from a per-IP bucket (burst 30, 1 per second, at most
  10,000 remembered addresses) keyed by the socket's remote address (IPv6 by its /64, since one host usually holds a whole /64);
  an empty bucket gets `429` before
  the request is parsed or any ticket is verified. `X-Forwarded-For` is not trusted.

**Consequences.**
- Behind a reverse proxy every client shares the proxy's address and bucket. Deploying behind one
  (Phase 7) needs an explicit trusted-proxy setting before the limit can key on the forwarded address.
- Many users behind one NAT share a bucket; the burst covers a reconnect storm of a small office, and
  each tab otherwise reconnects about once per ticket lifetime.
- A first-message ticket was rejected: the socket would open before it is authenticated.
