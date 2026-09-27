# 0001. Use Auth.js JWT sessions so the WS server can authenticate without the database

- **Status:** Accepted (amended 2026-09-26 and 2026-09-27, see addenda; latest #48)
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
- Deleting a room (#35) is revoked the same way: its members are refused the next ticket, so open
  sockets lose the room within one ticket lifetime. Since #48 (addendum below) the web app also purges the
  room on the WS server, which closes its sockets at once and removes its document.
- A ticket fetch that throws (a transient failure) is retried with backoff; only a refusal keeps the
  connection down, so a removed member is still never retried into the room (#27).

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
  Done in #30 (`WS_TRUSTED_PROXIES`, next addendum).
- Many users behind one NAT share a bucket; the burst covers a reconnect storm of a small office, and
  each tab otherwise reconnects about once per ticket lifetime.
- A first-message ticket was rejected: the socket would open before it is authenticated.

## Addendum (2026-09-27, #30): trusted proxies for the upgrade rate limit

Behind a reverse proxy or load balancer every upgrade arrives from the proxy's address, so all users
shared one upgrade bucket (30 burst, 1/s) and one busy network could lock everyone out.

**Decision.**
- `WS_TRUSTED_PROXIES` lists the reverse proxies in front of the WS server: comma-separated IPv4/IPv6
  addresses and CIDR ranges (e.g. `10.0.0.0/8,fd00::/8`). The default is empty: no peer is trusted and
  `X-Forwarded-For` is ignored, as before. Empty entries, ports, hostnames, bad prefixes, ranges wider
  than /8 (`/0` would let any client choose its bucket) and IPv6 ranges overlapping `::ffff:0:0/96` wider
  than an IPv4 /8 (a dual-stack listener reports IPv4 peers there, so `::/8` would trust every IPv4
  client) refuse to start with the variable named.
- The header is read only when the socket peer is on the list. Its hops are walked from the right; trusted
  proxies are skipped and the first untrusted hop is the client address, keyed as before (IPv6 by its /64,
  written in one canonical form so leading zeros or case cannot split one client into several buckets).
  Hops to its left were written by the client and are never used.
- A missing header, an all-trusted chain or a malformed nearest hop (`unknown`, `host:port`, garbage) keys
  the request by the peer, i.e. the proxy's own bucket. IPv4-mapped IPv6 addresses, in any spelling
  (`::ffff:1.2.3.4`, `::ffff:102:304`, expanded), are treated as the IPv4 address they map, in peers,
  hops and entries alike (`::ffff:a00:0/104` is `10.0.0.0/8`).
- An explicit list was chosen over a boolean or hop count ("trust one hop"): exposed directly, such a
  setting would trust the client itself. The limit still runs before any parsing or HMAC work, and the
  header is never logged; the startup log shows how many proxies are configured.

**Consequences.**
- Operators list only their proxies' own addresses. Listing a range that contains clients lets those
  clients pick their bucket again.
- A proxy that appends `host:port` entries falls back to the proxy bucket; revisit if the deployment
  platform does this.
- RFC 7239 `Forwarded` and `X-Real-IP` are not read.

## Addendum (2026-09-27, #48): the web app purges a deleted room's document

Deleting a room removed its rows, but its Yjs document stayed in LevelDB forever: the web app can't reach
LevelDB and the WS server never reads Postgres. This is the first web app → WS server call.

**Decision.**
- **Purge ticket.** After a delete the web app signs an HS256 purge ticket with `WS_TICKET_SECRET`:
  audience `collab-editor:ws-admin`, claims `{ sub, roomId, iat, exp }`, lifetime ≤ 60 s
  (`PURGE_TICKET_*` in `@collab-editor/shared`). Each verifier checks its own audience, so a room ticket is
  refused as a purge ticket and a purge ticket is refused on upgrade.
- **`DELETE /rooms/<id>`** on the WS server's HTTP port, ticket in `Authorization: Bearer` (never the URL).
  It takes a token from the per-IP upgrade bucket before any HMAC work (429), then needs a purge ticket for
  exactly that room (401). It answers 204, 500 when the store can't clear (so the web app retries) and 503
  during shutdown. It is idempotent: an unknown or already purged room answers 204.
- **Purge order.** The room's upgrades are refused first, then every socket closes with
  `4003 room deleted` (`ROOM_DELETED_CLOSE_CODE`; presence drops at once, #28), the room is evicted, waiting
  for its pending writes, its presence-id bindings are dropped, and only then is the document cleared
  (y-leveldb `clearDocument`). No write lands after the clear. This is a deliberate exception to
  Invariant 4 for a deleted room only. Clients do not reconnect after 4003 and show "This room was deleted".
- **Tombstone.** For `ROOM_TICKET_TTL_SECONDS + 60` s after a purge, upgrades for the room get 401 even
  with a valid room ticket, so a ticket issued just before the delete can't recreate the document. The
  tombstone lives in memory: a WS server restart within those 6 minutes forgets it, and a client that was
  reconnecting with a still-valid ticket could then write a new orphan document. The window is narrow and
  the result is the orphan #35 already accepted. The tombstone runs on the WS server's clock and a room
  ticket's `exp` on the web app's, so the minute of margin also assumes the two clocks agree to within a
  minute (NTP).
- **Outbox.** `deleteOwnedRoom` writes a `RoomPurge` row in the delete's transaction, so a crash can't
  lose a purge. `deleteRoom` sweeps due rows after its response (`after()`), and dashboard loads
  (`listRooms`) sweep at most once a minute per process. A failure keeps the row with `attempts`,
  `lastError` and a backoff of 1 min doubling to 1 h; rows are never dropped. `deleteRoom`'s answer never
  depends on the purge.
- **Addressing.** The web app calls `WS_SERVER_URL` if set (for a private address), else
  `NEXT_PUBLIC_WS_URL` with `ws:` → `http:` and `wss:` → `https:`.

**Alternatives rejected.**
- A periodic sweep in the WS server: it would need Postgres.
- A separate admin port: one more port to deploy and firewall, while the ticket and rate limit already
  guard the route.
- Vercel Cron or a timer in `instrumentation.ts`: no deployment target is chosen yet (#37/#38); revisit
  then.
- Sweeping in `getRoomTicket`: a database read on the hot reconnect path.
