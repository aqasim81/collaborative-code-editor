# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
