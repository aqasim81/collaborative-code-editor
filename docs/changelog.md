# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### /next-issue follows the per-issue checklist (#64)
- `.claude/commands/next-issue.md` names the checklist's steps instead of numbering them. Each phase runs only the touched packages' tests (`pnpm --filter <pkg> test`, plus `tsc --noEmit` when types changed) and commits; once per issue come Simplify on the whole diff, the invariant audit, one full `make verify`, the PR, code review, the merge and `main` CI, bookkeeping, closing the issue, intake and `ISSUE <N> DONE`
- The invariant audit is skipped for docs-only diffs (`docs/**`, `*.md`, `README.md`, `LICENSE`, `docs/media/**`), with "audit skipped: docs-only" in the PR body; it always runs when `apps/`, `packages/`, `.claude/hooks/` or `.github/` changed. `.claude/rules/ai-native-workflow.md` "Fresh eyes" says the same
- Intake writes new checklists from `plans/issues/_checklist-template.md`; older checklists with a 13-step loop per phase are still accepted, each old step ticked by its named equivalent

### Phase 7 — README and demo (#38)
- `README.md`: pitch, badges, demo GIF, quickstart, features, a Mermaid architecture diagram with the data flow, key decisions linking ADRs 0001–0003, quality and invariants, full setup (GitHub OAuth app, every env variable, sample room, hooks, Apple Silicon `leveldown`, production run, re-recording the demo), status and roadmap. `docs/status.md` points to it for setup
- `LICENSE` (MIT)
- Demo GIF (`docs/media/demo.gif`, 960 px, about 12 s): two demo users edit one room side by side, both on line 1 at once. `apps/web/e2e/record-demo.ts` records it without GitHub, signing both in with a minted session cookie
- `apps/web/e2e/session.ts` mints that cookie for both the production check and the recording; a non-200 from `/api/auth/session` now points at `AUTH_URL` instead of blaming `AUTH_SECRET`
- `AUTH_URL` is documented as needed by `pnpm start` (README, `.env.example`): a production server otherwise refuses sessions as an untrusted host
- The README's setup was followed from a fresh clone: install, Postgres, migrate, `pnpm dev`, two users syncing in one room, `make verify`

### Shell writes to protected paths are blocked (#62)
- `guard-bash.sh` blocks shell commands that write into `.claude/protected-paths.txt` paths: redirects (`>`, `>>`, `&>`), `tee`, `cp`/`install`/`ln`/`rsync` with a protected destination, `mv`/`rm`/`touch`/`truncate`, `dd of=`, `git rm`/`checkout`/`restore`, `find -delete`, `sed -i`/`perl -i`, and `python`/`node`/`ruby`/`perl` commands that name a protected path; deletes and moves of a parent folder count too. Relative, `./`, absolute and after-`cd` spellings all count, wrappers (`sudo`, `env`, `timeout`) are seen through, and quoted text such as a commit message is data; the parser lives in `.claude/hooks/lib/protected-writes.pl` and runs only when a command names a protected path
- `prisma migrate` (including `diff --script` into a migration), `shadcn add` and `db:migrate` stay allowed, and so do reads
- The block message says to use the generator, or stop and mark the issue blocked; `/next-issue` and CLAUDE.md say never to work around a guard hook. `/next-issue` now treats #13 as deferred
- `.claude/hooks/tests/guard-bash.test.sh` (blocked, allowed and regression cases for the older checks) runs first in `make verify`, so CI enforces it

### Phase 7 — Landing, layout and error states (#37)
- Landing page: hero with a static picture of two people editing (carets in their real presence colours), three feature cards (real-time sync, cursors and presence, persistence), how it works, and a call to action that signs you in or opens your rooms. A favicon and Open Graph metadata
- A footer (stack, source link) on every content page through `PageShell`; not on the full-height room page. The navbar shows only the logo and avatar on phones
- The room's presence sidebar folds away below the `lg` breakpoint behind a "People (n)" toolbar button (Escape closes it); the toolbar fits tablet widths, and on phones the status and "Rooms" words are screen-reader-only
- Room-join refusals carry a typed code (`invalid_room`, `unauthenticated`, `not_found`, `deleted`) from the ticket action through the provider; the room shows readable copy with a way forward (back to your rooms, or sign in and return). An unreachable WS server shows a banner saying edits stay in the tab, with Retry now (`RoomConnection.retry()`: a fresh ticket at once). The reload hint (#43) lives in the same banner
- 404 pages (global, and a room 404 that reads the same for a missing room and a non-member), `error.tsx` with Try again and the error digest, `global-error.tsx`
- Sign-in failures land on `/sign-in?error=<type>` (`pages.error`) with a readable message above the button; the sign-in action turns an Auth.js error into that redirect
- `pnpm --filter @collab-editor/web e2e:prod`: a Playwright check against the production build for console errors and warnings and horizontal scroll at 1280/1024/768/390 px (run by hand; `E2E_SIGNED_OUT_ONLY=1` for the public pages)
- Tests: landing, footer, page shell, navbar, presence toggle, room editor, status banner, provider `retry()`, ticket codes, 404 and error pages, sign-in errors

### Secret invite links (#36)
- Every room has a secret invite token (`Room.inviteToken`, 32 random bytes as 43 base64url characters, unique); the migration backfills existing rooms in the same format
- The room owner's toolbar has a Share button: it copies `/join/<token>` with a toast, shows the link in a dialog, and resets it after a confirmation (the old link stops working, members keep access). Nobody else sees it
- `/join/<token>` requires sign-in and returns to the link afterwards; it shows who invited you to which room, and the Join button (a POST, never on page load) adds you as an EDITOR and opens the room. Malformed, unknown and reset tokens get the same 404
- Both loggers redact `inviteToken` and `inviteUrl` keys (top level and one level down)
- ADR 0003 records the token model; Invariant 2 now says only a valid invite token grants membership
- Tests: token format, room queries, join and reset actions, the invite page, the owner-only prop on the room page, the Share button

### Response objects and near-miss secret keys in logs (#57)
- Both loggers serialize a Node response logged as `res`: status and headers only, never its request, with `set-cookie` redacted
- `cookies` and the Auth.js session cookie names (`authjs.session-token`, `__Secure-authjs.session-token`) are redacted as keys, at the top level and one level down
- A test in each app scans log calls and fails on a raw `request`, `response`, `socket` or `ctx` key; requests are logged as `req`, responses as `res`
- Invariant 6 now covers logs: loggers redact `LOG_REDACT_PATHS`
- Tests: logger output in each app (a `ServerResponse` logged as `res`, the new keys redacted, `err` keeps message and stack)

### Cookie and raw request header redaction (#55)
- Both loggers also redact `cookie` (as a key at the top level or one level down) and `set-cookie` (inside `headers`, at the top level or one level down), lowercase and capitalised, and a request's `rawHeaders` array
- A request logged as `req` goes through pino's standard request serializer: method, url, headers and address only, no socket or `rawHeaders`
- The one-level depth limit of the redact paths is documented as a known limit
- Tests: logger output in each app (cookie and set-cookie redacted, a Node `IncomingMessage` logged as `req` and under another key)

### Log redaction and the middleware boundary check (#54)
- Both loggers redact `ticket`, `token`, `authorization`, `headers.authorization` and the `sec-websocket-protocol` header, lowercase and capitalised (top level and one level down), as `[Redacted]`; the paths are shared as `LOG_REDACT_PATHS` in `@collab-editor/shared`
- The client-boundary test also walks the import graph from `middleware.ts` (edge runtime) and refuses the web logger, `pino` and Node builtins there
- Tests: logger output in each app (redacted fields, kept fields), middleware fixtures and the real app's middleware graph

### Server-side logger in the web app (#51)
- Web server code logs structured JSON through pino (`apps/web/lib/logger.ts`, name `web`) instead of `console`; the room purge sweep logs a failed purge as `warn` with `roomId` and `attempts` (never the ticket) and a failed sweep as `error`
- `LOG_LEVEL` now sets the web app's level too (default `info`); both apps accept the same levels, shared as `LOG_LEVELS` in `@collab-editor/shared`
- The client-boundary test refuses the logger module and `pino` in client code
- Biome's `noConsole` is an error everywhere except `__tests__/` (it was a warning)

### Purge a deleted room's document (#48)
- Deleting a room closes its open sockets at once with the new close code `4003`; clients stop reconnecting and show "Could not join this room: This room was deleted"
- The WS server removes the room's LevelDB document through a new `DELETE /rooms/<id>` route, guarded by the per-IP upgrade limit and a 60 s purge ticket (audience `collab-editor:ws-admin`, bearer header); a room ticket can't be used as a purge ticket, nor the reverse; the route is idempotent
- Pending writes finish before the document is cleared, and the room refuses upgrades for one ticket lifetime plus a minute, so a ticket issued before the delete can't bring the document back
- The web app queues each purge in a new `RoomPurge` table in the delete's transaction and runs it after the response; a failure is retried with backoff (1 min doubling to 1 h) after the next delete or dashboard load (at most once a minute). The delete's answer never depends on it
- New optional web setting `WS_SERVER_URL` for reaching the WS server on a private address; by default it is derived from `NEXT_PUBLIC_WS_URL`
- New migration `room_purge_outbox`: run `db:deploy` when deploying
- Decision recorded as an ADR 0001 addendum
- Tests: purge ticket signing and verification both ways, the purge route end to end (close codes, store cleared, rejoin refused, 401/404/429/500/503, clear after pending writes), `DocumentStore.clear` on LevelDB, `evict` settling, the transactional outbox write, the sweep's backoff and throttle, and the client's 4003 handling

### `.env.example` in sync with the env schemas (#47)
- `.env.example` now lists `WS_TRUSTED_PROXIES` (empty = trust no proxy) and `WS_PERSISTENCE_DIR` (`.leveldb`)
- A test in each app fails, naming the variable, if a key of that app's env schema (except `NODE_ENV`) is missing from `.env.example`; both schemas export `ENV_KEYS`
- Project tooling may read and edit `.env.example` again; a new Read guard hook (`.claude/hooks/guard-reads.sh`) blocks every other `.env*` file and `secrets/`, at any depth, and the deny list names the common env files at any depth

### Room dashboard (#35)
- `/dashboard` lists every room the user is a member of, most recently active first, as cards with name, language, created date and an Owner/Editor badge; an empty state invites creating the first room
- "New room" opens a dialog for a name (1–80 characters, trimmed) and one of the supported languages; invalid input is refused with a message before and after reaching the server, and a created room opens straight away
- Owners can delete a room after a confirmation; editors see no Delete button, and a delete by anyone but the owner is refused with an error ("Only the room's owner can delete it", or "Room not found" for a non-member)
- Server actions `createRoom`, `listRooms` and `deleteRoom` (`actions/room.ts`) return Results; the creator's OWNER membership is written together with the room
- "Last activity" is `Room.updatedAt`, bumped after a member is issued a room ticket, at most once a minute per room, without delaying the ticket
- The navbar links to the dashboard when signed in; the room toolbar links back to it
- shadcn/ui is set up (button, card, dialog, input, label, alert dialog, badge) with dark mode following the OS preference; toasts via sonner
- A deleted room can't be joined (no ticket, 404) and open sockets lose access at ticket expiry; its LevelDB document stays on the WS server until #48
- Tests: input schemas, query shapes and owner scoping, the actions' success, validation, session and database-error paths, the dialog, delete button, card and dashboard states, and that client components get no server values

### Trusted proxies for the upgrade rate limit (#30)
- New WS-server setting `WS_TRUSTED_PROXIES`: comma-separated IP addresses and CIDR ranges of the reverse proxies in front of the server; empty by default, which keeps today's behaviour (`X-Forwarded-For` ignored)
- When the socket peer is a listed proxy, the per-IP upgrade limit keys on the rightmost `X-Forwarded-For` hop that is not itself a trusted proxy, so clients behind one proxy no longer share one bucket; hops a client prepends are never used, and a missing or malformed header falls back to the proxy's own bucket
- Invalid entries (empty, hostname, port, bad prefix, ranges wider than /8, IPv6 ranges that would cover IPv4-mapped peers such as `::/8`) refuse to start with the variable named; IPv6 bucket keys ignore leading zeros and case; the startup log shows the number of trusted proxies, never header contents
- Decision recorded as an ADR 0001 addendum
- Tests: entry parsing, CIDR and IPv4-mapped matching, trusted and untrusted peers, proxy chains, spoofed prefixes, malformed hops, env parsing, and end-to-end buckets through the upgrade handler

### Reload hint after prolonged ticket failures (#43)
- After 8 room ticket fetches in a row have thrown (one to two and a half minutes with the #27 backoff), the room shows a yellow banner: "Having trouble reconnecting. Reloading the page may help." with a Reload button; it helps when every call fails the same way, e.g. a tab left open across a deploy calling a server action that no longer exists
- Retrying continues meanwhile; the banner clears when a fetch returns or the socket connects, and is hidden while a refusal is shown. The page never reloads by itself, because a reload drops unsynced edits
- The banner is a polite live region (`<output>`), not an alert; the button is keyboard reachable
- Switching rooms resets the connection status, error and hint, so none of them carries over from the previous room
- Tests: the hint fires once at the 8th failure and not before, is withdrawn by a success or a refusal, never follows a refusal alone or a short blip, stops on destroy; the provider exposes and resets it; the room view shows it, hides it behind an error, and reloads only on click

### Client-boundary check covers packages and server-to-client props (#24)
- The Invariant 6 import-graph walk now flags server-only packages reached from client code: `@prisma/client`, `@auth/prisma-adapter`, `jose`, `next-auth/providers/*`, `next/headers`, the bare `next-auth` server entry and Node builtins (`node:*`, `crypto`, `fs/promises`, ...); `next-auth/react` and type-only imports stay allowed
- New test helper `__tests__/helpers/client-props.ts` finds non-public env values anywhere in a client component's props; the room page test asserts `RoomEditor` gets exactly its five props, a `user` of `id`, `name`, `image`, and no server value
- Tests only; no production code changed. Checked by adding a Prisma import to the toolbar and a ticket secret to the editor's props: both fail the suite

### Ticket fetch retry (#27)
- A room ticket fetch that throws (network drop, redeploy, database briefly down) is retried with jittered backoff, 1 s doubling to 30 s, until it succeeds or the room is left; before, the room stayed down until reload after a blip at the 5-minute ticket refresh, and local edits stopped syncing
- A refused ticket (not signed in, not a member, bad room id) is still reported in the room and never retried
- The status shows Connecting or Reconnecting while retrying and Disconnected after 3 failures in a row; a transient failure no longer shows "Could not join this room"
- Tests: retry on first connect and after a `4001` refresh (an offline edit resyncs), backoff attempts, the status sequence, no retry of refusals, no retry after destroy, delay doubling, cap and jitter bounds

### Presence cleared when the server closes a connection (#28)
- Every close the WS server starts (1003 invalid frame, 1008 rate or byte limit, 4001 ticket expired, 1011 storage failure, 4002 presence id taken) drops the peer's presence at once, instead of when the client answers the close frame; a client that never answered stayed visible to everyone for `ws`'s 30 s close timeout
- A client that ignores the close handshake is terminated after 5 s, as on shutdown; `shutdownTimeoutMs` is now `closeTimeoutMs` and covers both
- Tests: a client that withholds its close answer after an invalid frame, both clients of a room whose storage fails, and termination after `closeTimeoutMs`

### Phase 6 — Presence and cursors (#9)
- Remote carets and selections in each user's colour (y-codemirror.next with the room's awareness); a name label shows above a remote caret for 3 s after it moves or its user joins, and on hover
- A presence sidebar lists everyone in the room once (several tabs make one entry), this user first and marked, with GitHub avatar or initials ringed in their colour; it updates on join and leave but not on cursor moves
- The toolbar shows the connection: Connecting / Connected / Reconnecting (yellow while a dropped socket or ticket refresh comes back) / Disconnected (red after 3 failed attempts in a row, or when the room can't be joined)
- Colours come from a hash of the user id (`userColor` in `@collab-editor/shared`, 16 colours), so a user has the same colour in every session
- The room page passes the session user to the client; room tickets carry the avatar (https only)
- The room toolbar is server-rendered (shown as Connecting) until the connection exists, instead of appearing after hydration
- Labels sit just above the line (below the caret on line 1, where there is no room above) and a new label is drawn for every caret move, since CodeMirror dropped a reused label next to y-codemirror.next's caret
- Tests: colour stability and spread, presence list ordering and dedup, label timing per user, label position, a label on every step of a caret walking beside its y-codemirror caret, line-1 placement, caret and selection colours, status mapping, the page's user prop
- Checked in a browser with two windows: carets, selections and labels follow every move, labels hide after 3 s, the status goes green → yellow → red when the WS server is killed and back to green when it returns, and a closed window's caret disappears for the other

### Presence ownership and identity (#32)
- The WS server shows the ticket's identity in presence, whatever `user` a client sends
- A connection that reconnected with the same client id owned nothing, so its presence was not cleared when it dropped (a ghost for up to 30 s) and could be overwritten; ownership now follows `updated` as well as `added` ids, and any removal releases it
- Clients re-announce presence with a newer clock on each connect, so it reappears at once after a ticket refresh or network drop instead of up to 15 s later
- One presence per connection (the first id it announces); each id stays bound to its user while the server runs, even across an empty room's teardown (up to 100 per user, forgetting only that user's own unused ids), so another member can't claim it between its owner's disconnect and reconnect; another connection of the same user may take a presence over
- A connection whose first presence uses another user's id (a collision, or an id squatted after a server restart) is closed with `4002`; the web client moves to a new client id, keeping its edits and presence, and reconnects. Bindings unused for an hour are pruned whenever a room is created
- A presence `cursor` must be null or a pair of root-text relative positions, or the frame is refused (1003): a malformed cursor crashed the carets and labels of everyone in the room. The label plugin also skips a cursor it can't place
- After a `4002`, the client resets its presence from the session user instead of copying its local state, which the server may have just overwritten with the squatter's; "(you)" in the presence list comes from the session
- Other entries that would change another user's presence, add a second id or remove a presence that doesn't exist are dropped instead of closing the connection, so an honest client's timeout echo is never punished and unknown ids leave no metadata
- Tests: reconnect and abrupt drop end to end, timeout release, same-user takeover, the one-id rule, same-clock removal echoes, id binding across a reconnect race, bounded metadata and remembered-id eviction, identity rewrite, avatar claim validation

### Test fix
- The short-ticket expiry test signed `exp` one second ahead of the floored clock and could get `401` on a loaded machine; it now leaves at least a second

### Heartbeat (#33)
- The WS server pings every connection every 30 s and terminates one that did not answer the previous ping, so dead sockets stop holding rooms and presences until their ticket expires

### Ticket header and upgrade rate limit (#19)
- The room ticket travels in `Sec-WebSocket-Protocol` (`collab.v1, ticket.<jwt>`, built by `roomTicketProtocols` in `@collab-editor/shared`) instead of the URL, so proxy logs never hold it; the handshake response selects `collab.v1` only and never echoes the ticket
- `?ticket=` in the URL is no longer accepted; a connection without the header ticket gets `401`
- Upgrade attempts are limited per remote IP, IPv6 per /64 (30 burst, 1/s, up to 10,000 addresses remembered, least recently used dropped first) before any parsing or ticket verification; excess attempts get `429`; `X-Forwarded-For` is not trusted (ADR 0001 addendum)
- The web provider connects with the subprotocols and swaps them on every ticket refresh
- Tests: header ticket joins with `collab.v1` selected; the raw handshake response never contains the ticket; missing, invalid, forged, expired, other-room, duplicate or protocol-less tickets and URL-only tickets get `401`; an upgrade flood gets `429` with no extra ticket verifications, bad tickets count toward the limit, and a spoofed `X-Forwarded-For` does not pick a new bucket; the keyed limiter's bounded LRU table and address keys; the ticket never appears in the logs

### Close sockets at ticket expiry (#18)
- The WS server closes each socket with `4001 ticket expired` when its room ticket's `exp` passes; the timer is cleared on any other close
- `TICKET_EXPIRED_CLOSE_CODE` is shared by both apps (`@collab-editor/shared`)
- The web provider fetches a fresh ticket and reconnects on `4001`, whatever expiry it last saw; local edits are kept and resync through Yjs; a refused ticket leaves the connection down with the error shown
- A member removed from a room loses a live connection within one ticket lifetime (≤ 5 minutes); revocation is not pushed (ADR 0001 addendum)
- The expiry delay is capped at the ticket TTL, so a web-app clock running ahead cannot stretch a socket past 5 minutes; a ticket fetch that throws is reported instead of leaving the room silently disconnected (retry is #27)
- Tests: close at expiry, capped lifetime under clock skew, open before expiry and no timer left after a normal disconnect (fake timers); provider refresh and reconnect on `4001`, the offline edit carried in the sync step 2 reply, a throwing ticket fetch reported, and staying down when the fresh ticket is refused

### Byte budget per connection (#22)
- Each WS connection has a second token bucket over inbound bytes (16 MiB burst — two maximum-size frames — refilled at 1 MiB/s) next to the message bucket; exceeding it closes the connection with 1008 (`byte budget exceeded`) before the frame is parsed
- Frames still arriving after a limiter has started closing a connection are dropped; `startServer` refuses a byte budget smaller than the frame cap
- The limits are named constants in `apps/ws-server/src/rate-limit.ts` (`DEFAULT_BYTE_RATE_LIMIT`, `DEFAULT_MAX_PAYLOAD_BYTES`); `ServerOptions.byteRateLimit` overrides them in tests
- Tests: a 40 MiB flood under the message budget is closed with 1008; a fresh connection whose first sync uploads a 10K-line (>1 MB) document stays open

### Client-boundary check (#16, #21)
- The Invariant 6 test walks the import graph from every `"use client"` module, resolving `./`, `../` and `@/` specifiers, and fails if any reached module is server-only (the listed `lib/` modules or any module importing `server-only`); a violation is reported as the import chain
- Static, side-effect, re-export and dynamic imports are followed; type-only imports and the imports of `"use server"` modules are not
- A module that reads a non-`NEXT_PUBLIC_` environment variable directly also counts as server-only; `.js` specifiers resolve to their `.ts` files; a local import that does not resolve fails the check
- Fixture cases cover relative, directive-less and transitive server-only imports; a reachability assertion keeps the walk from passing silently
- Server-only packages and server-to-client props are not covered yet (#24)

### Phase 5 — Real-Time Collaboration (#8)
- The room editor is bound to the room's shared Yjs text with y-codemirror.next; undo and redo use `Y.UndoManager`, so a user only undoes their own edits
- `RoomProvider` creates the Yjs document and a `WebsocketProvider` per room; a room ticket is fetched before connecting and refreshed before a reconnect when it is about to expire; a refused ticket is shown in the room
- WS server speaks the y-websocket protocol on `y-protocols` (ADR 0002): binary frames validated whole before use (bad frame → 1003), sync step 1/2 and incremental updates, awareness relay
- LevelDB persistence (`WS_PERSISTENCE_DIR`, default `.leveldb`): every update is stored before it is broadcast or sent in a sync reply; rooms are restored after a restart; a storage failure closes the room with 1011 (Invariant 4)
- Awareness is kept in memory only and cleared when its connection closes (Invariant 5)
- Frame cap raised to 8 MiB for large documents; shutdown waits for pending writes and closes the store
- Tests: CRDT convergence, persist-before-broadcast, restart restore, reconnect convergence, 10K-line sync, awareness cleanup, ticket refresh
- Replaced the `codemirror` meta package with the individual CodeMirror packages; `y-websocket` is a test-only dependency of the WS server

### Phase 4 — WebSocket Server & Room Architecture (#7)
- HTTP + WebSocket server (`ws`) on `WS_SERVER_PORT` (default 8080); refuses to start with an invalid environment (Zod)
- Connections use `/<roomId>?ticket=<jwt>`; a missing, forged, expired, over-long or wrong-room ticket is rejected with 401 before the socket opens (Invariants 1 and 2)
- Web app `getRoomTicket(roomId)` server action issues a 5-minute HS256 room ticket only to members of the room; new `WS_TICKET_SECRET` in both apps, `.env.example`, turbo build env, CI and test placeholders (ADR 0001 addendum)
- Room manager: room created on first join, clients tracked, empty rooms destroyed after `ROOM_GRACE_PERIOD_MS` (default 30 s)
- Inbound text messages Zod-validated, binary frames reserved for Yjs, 1 MiB frame cap, per-socket token bucket (flood → close 1008)
- `GET /health` returns `{ status, rooms, connections }`; SIGINT/SIGTERM close every connection with 1001 and stop the server
- pino structured logging (`LOG_LEVEL`); the dev script loads `apps/web/.env` so both apps share the ticket secret
- Shared `ClientMessage`, `ServerMessage`, `RoomTicketClaims` and `ROOM_TICKET_TTL_SECONDS`

### Phase 3 — Editor UI (#6)
- `/room/[id]` renders a CodeMirror 6 editor that fills the viewport below the navbar and follows window resizes
- The page returns 404 unless the session user is a member of the room (`lib/rooms.ts`, Invariant 2)
- Toolbar language selector for JavaScript, TypeScript, Python, Go, Rust, Java, C, CSS, HTML and JSON; each grammar is loaded on demand and swapped in place through a compartment, keeping text and undo history
- `basicSetup` keymaps: undo, redo, select all and search; One Dark theme
- Dev-only `db:seed` script creates an idempotent `seed-room` owned by the first user
- Added `codemirror` and `@codemirror/language`; the lockfile keeps a single `@codemirror/state`

### Phase 2 — Database Schema & Authentication (#5)
- Prisma schema: Auth.js adapter models (User, Account, Session), `Room` and `RoomMember` (OWNER/EDITOR membership, keyed by room and user); `init` migration
- Local Postgres 16 via `docker-compose.yml` (host port 5434); `db:migrate`, `db:deploy`, `db:studio` scripts; `prisma generate` on install
- Auth.js v5 with GitHub OAuth and JWT sessions; the token carries user id, name and picture (ADR 0001)
- Edge-safe `lib/auth.config.ts` for middleware; `lib/auth.ts` adds the Prisma adapter
- `middleware.ts` redirects signed-out visitors from `/dashboard/*` and `/room/*` to `/sign-in`
- Sign-in page and server actions; the callback URL is limited to same-origin paths (`lib/redirect.ts`)
- Navbar shows avatar, name and sign-out when signed in, and a sign-in link otherwise; placeholder `/dashboard`
- `lib/env.ts` validates environment variables with Zod when `next.config.ts` loads, so a missing variable fails the build
- Shared `SessionUser` and `AuthTokenClaims` types
- Tailwind CSS 4 wired through `@tailwindcss/postcss`
- Migrations added to `.claude/protected-paths.txt`
- GitHub provider declares its OAuth issuer (`https://github.com/login/oauth`) so the callback's `iss` parameter validates

### Phase 1 — Monorepo Scaffolding & Quality Infrastructure
- Starter-kit harness installed: guard hooks (secrets, protected paths, forbidden terms), workflow rules, review policy, PR template, ADR and spec templates (#1)
- `apps/web/components/ui/*` (generated shadcn components) added to `.claude/protected-paths.txt` so they can't be edited by hand (#4)
- WS server now builds with tsup: `dist/index.js` is emitted with `@collab-editor/shared` inlined, and the build no longer starts the server (#2)
- Regression test `apps/ws-server/__tests__/build.test.ts` checks the build emits a bundle Node can parse (#2)
- CI build job limited to 10 minutes so a build that starts a process fails fast (#2)
- Node 22 pinned via `.nvmrc` and `engines.node >=22`; CI reads the version from `.nvmrc` (#3)

### Phase 0 — Project Initialization
- Project scaffolded with Turborepo monorepo (Next.js 15 + Node.js WS server)
- Quality infrastructure configured (Biome, TypeScript strict, Vitest, commitlint, lefthook git hooks with gitleaks)
- CI/CD pipeline set up via GitHub Actions (2 jobs: verify → build; verify runs `make verify`)
- CLAUDE.md and phase plans created (7 phases)
- Living documentation initialized (architecture, changelog, status)
