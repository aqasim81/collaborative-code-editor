> This is a living document. Update it as the architecture evolves during development.

# Architecture

## System Design Overview

The collaborative code editor is a three-component system:

1. **Web App** (Next.js 15) — Authentication, room management, editor UI
2. **WebSocket Server** (Node.js + ws) — Real-time document synchronization, room lifecycle
3. **Shared Types** (TypeScript package) — Type definitions shared between web and server

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │  CodeMirror 6 │  │  Yjs Doc    │  │  Awareness    │  │
│  │  (Editor UI)  │←→│  (CRDT)     │←→│  (Cursors)    │  │
│  └──────────────┘  └──────┬──────┘  └───────┬───────┘  │
│                           │                  │           │
│                    ┌──────┴──────────────────┴──────┐   │
│                    │   y-websocket Provider          │   │
│                    └──────────────┬──────────────────┘   │
└───────────────────────────┬──────────────────────────────┘
                            │ WebSocket (wss://)
                            │
┌───────────────────────────┴──────────────────────────────┐
│                  WebSocket Server (Node.js)               │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐   │
│  │  ws Library   │  │  Room Mgr   │  │  Auth Verify  │   │
│  │  (Transport)  │←→│  (Lifecycle) │  │ (Room Ticket) │   │
│  └──────────────┘  └──────┬──────┘  └───────────────┘   │
│                           │                               │
│                    ┌──────┴──────┐                        │
│                    │  y-websocket │                        │
│                    │  (Yjs Sync)  │                        │
│                    └──────┬──────┘                        │
│                           │                               │
│                    ┌──────┴──────┐                        │
│                    │  LevelDB    │                        │
│                    │  (Doc Store) │                        │
│                    └─────────────┘                        │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  Next.js Web App                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │
│  │  Pages    │  │  Auth.js │  │  Prisma + PostgreSQL   │ │
│  │  (UI)     │  │  (OAuth) │  │  (Users, Rooms, Meta)  │ │
│  └──────────┘  └──────────┘  └────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Data Flow

1. User authenticates via GitHub OAuth → Auth.js creates session + JWT
2. User creates a room on `/dashboard` → the `createRoom` server action creates the room and the creator's `OWNER` membership in PostgreSQL, then the browser opens `/room/<id>`
3. User enters editor → `getRoomTicket(roomId)` server action checks `RoomMember` and returns a 5-minute HS256 room ticket
4. Browser connects to `ws://<ws-server>/<roomId>` offering the subprotocols `collab.v1` and `ticket.<jwt>` → WS server rate-limits the attempt per IP (429 otherwise), then verifies the ticket on upgrade (401 otherwise) → joins the room; the server loads the room's Yjs document from LevelDB and the client and server exchange sync step 1/2
5. User types → CodeMirror → `Y.Text` (y-codemirror.next) → provider sends the update → server appends it to LevelDB, then broadcasts it to the room
6. Remote updates arrive → WS → Yjs merge → CodeMirror re-renders
7. Cursor moves → Awareness protocol → WS server (identity rewritten from the ticket) → broadcast → y-codemirror.next carets and selections, plus a name label for 3 s after each move
8. User disconnects → WS server removes from room, notifies others via awareness

## Key Technology Choices

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CRDT | Yjs | Industry standard, efficient, proven at Notion/Figma scale |
| Editor | CodeMirror 6 | Lightweight, first-class Yjs bindings, extensible |
| WebSocket | ws (Node.js) | Fastest WS library, full control over connection lifecycle |
| Auth | Auth.js v5 (JWT) | JWT strategy allows WS server to verify without DB access |
| Database | PostgreSQL + Prisma | Type-safe ORM, mature ecosystem |
| Doc persistence | LevelDB | Efficient binary storage for Yjs updates, built-in y-leveldb support |
| Monorepo | Turborepo | Fast builds, task caching, well-supported |

## Infrastructure Requirements by Phase

| Phase | Service | Type | Provisioning | Status |
|-------|---------|------|-------------|--------|
| Phase 1 | None | — | — | Ready |
| Phase 2 | PostgreSQL 16 | Local (Docker Compose) | `docker compose up -d` (host port 5434); hosted DB for deploy | Local ready |
| Phase 2 | GitHub OAuth App | External | Manual setup in GitHub Settings | Owner action |
| Phase 3 | None | — | — | Ready |
| Phase 4 | WebSocket Server (ws) | Self-contained | Runs locally / deploy to cloud | Ready |
| Phase 4 | LevelDB (y-leveldb) | Embedded | File-based, bundled with npm package | Ready |
| Phase 5 | Yjs sync (y-websocket protocol on y-protocols) | Self-contained | Implemented in the WS server (ADR 0002) | Ready |
| Phase 6 | None | — | — | Ready |
| Phase 7 | None | — | — | Ready |

**Owner setup for sign-in:**
- **GitHub OAuth App** — Create at GitHub Settings → Developer Settings → OAuth Apps, callback `http://localhost:3000/api/auth/callback/github`
- **Hosted PostgreSQL** — Needed only for deployment (Neon, Supabase, etc.); local development uses Docker Compose

## Data Model

Postgres holds identity and room metadata; document content lives in LevelDB on the WS server.

| Model | Purpose |
|-------|---------|
| `User`, `Account`, `Session` | Auth.js Prisma adapter models (`Session` unused under JWT sessions) |
| `Room` | Room metadata: name, language, creator; `updatedAt` doubles as last activity (bumped when a member is issued a ticket, at most once a minute) |
| `RoomMember` | Membership (`OWNER` / `EDITOR`), keyed by `(roomId, userId)`; grants room access (Invariant 2) |
| `RoomPurge` | Outbox of deleted rooms whose WS-server document still has to be purged (`attempts`, `nextAttemptAt`, `lastError`); no relation, the room is gone (#48) |

## Rooms (#35)

- **Actions** (`apps/web/actions/room.ts`, Result-typed, input checked with the Zod schemas in `lib/room-input.ts`):
  `createRoom({ name, language })` (name trimmed, 1–80 characters; one of the supported languages) creates the room
  and its `OWNER` member in one nested write; `listRooms()` returns the rooms the user is a member of, most recently
  active first; `deleteRoom(id)` deletes only a room the caller owns (a scoped `deleteMany`). An editor is told only
  the owner can delete; a non-member gets "Room not found", the same as for a missing room (Invariant 2).
- **Activity ordering:** document edits never reach Postgres, so `getRoomTicket` bumps `Room.updatedAt` after the
  response (`after()`), skipping the write if it was bumped within the last minute. Every connected client fetches a
  ticket at connect and about every 5 minutes, so `updatedAt` tracks "last in use".
- **Dashboard:** `app/dashboard/page.tsx` (Server Component) lists `RoomCard`s (name, language, created date, role);
  the client components `CreateRoomDialog` and `DeleteRoomButton` (owners only, confirms first, reports with a toast)
  receive only display values. The navbar and the room toolbar link back to it.
- **Deletion:** deleting removes the `Room` and its `RoomMember` rows (cascade) and, in the same transaction, writes a
  `RoomPurge` row. No ticket can be issued for it again and the room URL returns 404. After the response the web app
  sweeps due `RoomPurge` rows (`lib/room-purge.ts`): for each it signs a 60 s purge ticket and calls
  `DELETE /rooms/<id>` on the WS server, which closes the room's sockets at once with 4003 and clears its LevelDB
  document. A failure keeps the row and backs off (1 min doubling to 1 h); dashboard loads retry due rows at most
  once a minute (#48, ADR 0001 addendum).

## Logging (#51)

- **Web app:** server code logs through `apps/web/lib/logger.ts`, a pino logger named `web` (JSON on stdout, no
  transport), at `LOG_LEVEL` from `lib/env.ts` (default `info`). It is server-only: the client-boundary test refuses
  both the module and `pino` in client code (Invariant 6), and it is never imported from `middleware.ts`, which runs
  on the edge runtime. Client code does not log. Log lines never carry tickets or secrets: a failed room purge is
  a `warn` with `roomId`, `attempts` and the error, a failed sweep an `error`.
- **WS server:** pino named `ws-server` (`src/logger.ts`), same `LOG_LEVEL` key.
- **Redaction (#54):** both loggers set pino `redact` to `LOG_REDACT_PATHS` from `@collab-editor/shared`:
  `ticket`, `token`, `authorization`, `headers.authorization` and `headers["sec-websocket-protocol"]` (which carries
  the room ticket), lowercase and capitalised (outgoing `fetch` headers keep their case), at the top level and one
  level down. A matching field prints as `[Redacted]`; an output test in each app
  proves it. This is a safety net: call sites still never pass tickets.
- **Cookies and requests (#55):** the list also covers `cookie` and `headers["set-cookie"]` (the Auth.js session JWT
  travels there), both spellings, and `rawHeaders` (a Node request's header array, which repeats every header;
  paths can't name array entries, so it is redacted whole). Both loggers set `serializers: { req:
  pino.stdSerializers.req }`: log a request as `req` and it prints as `{ id, method, url, headers, remoteAddress,
  remotePort }`, its headers then redacted by the paths above.
- **Responses and near-miss keys (#57):** both loggers also set `res: pino.stdSerializers.res`, so a Node
  `ServerResponse` logged as `res` prints `{ statusCode, headers }` without its request (whose cookie would otherwise
  print through `res.req`); `set-cookie` in those headers is redacted. A fetch `Response` is not one. The paths also
  cover `cookies` and the Auth.js cookie names `authjs.session-token` and `__Secure-authjs.session-token` as keys,
  at the top level and one level down.
- **Call-site guard (#57):** requests are logged as `req` and responses as `res`, never raw under another key. A
  source scan in each app (`__tests__/log-call-sites.test.ts` in the WS server,
  `__tests__/invariants/log-call-sites.test.ts` in the web app) fails on a `<logger>.<level>({ ... })` call (child loggers included) whose
  object has a `request`, `response`, `socket` or `ctx` key, naming the file and line. It is a heuristic: a
  variable passed to the logger escapes it.
- **Known limit: depth.** `*` matches one level, so a secret two levels down (`{ a: { b: { ticket } } }`) prints in
  the clear. Call sites log flat objects; two-level wildcard paths are not added because pino's wildcard redaction
  cost grows with each level.
- **Edge boundary (#54):** the client-boundary test also walks the import graph from `middleware.ts` and refuses
  `lib/logger.ts`, `pino` and Node builtins in it; `lib/auth.config.ts` and `lib/env.ts` are allowed there.
- Both apps validate `LOG_LEVEL` against the same levels (`LOG_LEVELS` in `@collab-editor/shared`; the web app keeps
  a tested copy because `next.config.ts` loads `lib/env.ts`). Biome's `noConsole` is an error outside `__tests__/`.

## Authentication

- `apps/web/lib/auth.config.ts` — edge-safe Auth.js config (GitHub provider, JWT callbacks, `authorized` route check); used by `middleware.ts`
- `apps/web/lib/auth.ts` — adds the Prisma adapter; exports `auth`, `signIn`, `signOut`, `handlers`
- `middleware.ts` redirects signed-out requests for `/dashboard/*` and `/room/*` to `/sign-in?callbackUrl=…`; the sign-in action only follows same-origin callbacks
- The session JWT carries `id`, `name` and `picture`; it is a JWE encrypted with `AUTH_SECRET` (see ADR 0001)
- `apps/web/lib/env.ts` validates environment variables with Zod when `next.config.ts` loads

## WS Server (Phases 4–5)

- **Auth on upgrade:** `/<roomId>` with `Sec-WebSocket-Protocol: collab.v1, ticket.<jwt>` (`roomTicketProtocols` in `@collab-editor/shared`); the response selects `collab.v1` only, so the ticket is never echoed, and the query string is ignored, so tickets stay out of proxy logs (#19). The ticket is HS256, signed with `WS_TICKET_SECRET`, claims `{ sub, aud, name, roomId, iat, exp }` with audience `collab-editor:ws-room`, lifetime ≤ 5 minutes (`ROOM_TICKET_TTL_SECONDS` in `@collab-editor/shared`). It is issued by `apps/web/actions/room-ticket.ts` only after a `RoomMember` check. Missing, forged, wrong-audience, expired, over-long or wrong-room tickets and unparseable request targets get `401` before the socket is accepted; an upgrade whose check finishes after shutdown began gets `503` (ADR 0001 addendums). The WS server never touches Postgres.
- **Upgrade rate limit (#19):** before anything else, each upgrade attempt takes a token from a per-IP bucket (30 burst, 1/s, up to 10,000 addresses, least recently used dropped first; `src/rate-limit.ts`) keyed by the client address, IPv6 by its /64; an empty bucket gets `429` without parsing the request or verifying a ticket. The client address is the socket's remote address, unless that peer is listed in `WS_TRUSTED_PROXIES` (IPs/CIDRs no wider than /8, default none; `src/client-address.ts`): then it is the rightmost `X-Forwarded-For` hop that is not itself a trusted proxy, or the proxy's own address when the header is missing or malformed (#30, ADR 0001 addendum). A deployment behind a reverse proxy lists the proxy's addresses there.
- **Ticket expiry (#18):** a socket lives no longer than its ticket. When the ticket's `exp` passes the server closes it with `4001 ticket expired` (`TICKET_EXPIRED_CLOSE_CODE` in `@collab-editor/shared`), and never later than the ticket TTL after the upgrade, whatever the issuer's clock says; the timer is cleared when the socket closes for any other reason. The client then fetches a fresh ticket and reconnects, so a member removed from the room loses access within one ticket lifetime (≤ 5 minutes). Revocation is not pushed to the WS server.
- **Rooms:** `src/rooms/room-manager.ts` creates a room on first join, tracks its sockets, and destroys it `ROOM_GRACE_PERIOD_MS` (default 30 s) after the last client leaves unless someone rejoins.
- **Messages:** text frames are Zod-validated (`{ type: "ping" }` today) and answered with `{ type: "error" }` otherwise; binary frames carry the Yjs protocol and are validated whole before use (bad frame → close 1003). Each socket has two token buckets covering both kinds of frame: messages (100 burst, 50/s) and bytes (16 MiB burst, 1 MiB/s; `src/rate-limit.ts`). Exceeding either closes the socket with 1008 before the frame is parsed (#22). Frames are capped at 8 MiB so a 10K-line document fits in one sync step; the byte burst is two full frames, so a fresh connection can upload its whole document in the first sync and keep editing.
- **HTTP routes:** `GET /health` and `DELETE /rooms/<id>` (#48). The purge route takes a token from the per-IP
  upgrade bucket (429), needs `Authorization: Bearer <purge ticket>` for that room (audience `collab-editor:ws-admin`,
  ≤ 60 s; 401), then refuses the room's upgrades for one ticket lifetime plus a minute, closes its sockets with
  `4003 room deleted` (`ROOM_DELETED_CLOSE_CODE`), evicts it after its pending writes and clears its document (204;
  500 if the store fails; 503 during shutdown). Anything else is 404.
- **Ops:** `GET /health` → `{ status, rooms, connections }`. SIGINT/SIGTERM close every socket with 1001, clear rooms and stop listening. Any socket the server closes is terminated if it has not answered within 5 s (`closeTimeoutMs`). Logs are pino JSON (`LOG_LEVEL`).
- **Yjs sync (Phase 5, ADR 0002):** each room holds a server-side `Y.Doc` and `Awareness` (`src/sync/sync-room.ts`). On join the server sends sync step 1 and current presence once the document has loaded. Every document update is appended to LevelDB before it is broadcast or included in a sync step 2 reply (Invariant 4); a failed load or write closes the room with 1011 and evicts it. Awareness is relayed and never reaches storage (Invariant 5). Awareness updates are capped at 64 KiB with object-or-null states. The server replaces each state's `user` with the connection's ticket identity (ADR 0002 addendum); a connection speaks for one client id (the first it announces), each id stays bound to its user while the server runs, across room teardowns (up to 100 per user, forgetting only that user's own unused ids), and the presence is cleared when the connection that last set it closes, when the server starts closing that connection (#28), or when the 30 s timeout drops it. A connection whose first presence uses another user's id is closed with 4002 and its client takes a new id; bindings unused for an hour are pruned whenever a room is created. A `cursor` must be null or a pair of root-text relative positions (Zod), or the frame is refused with 1003. Other entries that would change another user's presence, add a second id or remove a presence that doesn't exist are dropped, not punished, since honest y-websocket clients send some of them. Connections that stop answering pings are terminated (#33). A load that throws or finds corrupt bytes fails the room like any storage error. A destroyed room's pending writes finish before a new instance of it loads.
- **Persistence:** `src/persistence/document-store.ts` over `y-leveldb` at `WS_PERSISTENCE_DIR` (default `.leveldb`, relative to the working directory, gitignored). Shutdown waits for pending writes and closes the database.
- **Client:** `apps/web/lib/yjs/provider.ts` wraps `WebsocketProvider` (BroadcastChannel off) and passes the ticket as subprotocols, never in the URL; it fetches a ticket before connecting, after a `4001` close (whatever expiry it last saw, since the server's clock decides), and before any other reconnect when the ticket is within 30 s of expiry. The `Y.Doc` outlives every socket, so edits made while disconnected resync on the next connection. A ticket fetch that throws (network drop, redeploy, database down) is retried with jittered backoff, 1 s doubling to 30 s, until it succeeds or the room is left; the status shows Connecting/Reconnecting, then Disconnected after 3 failures in a row (#27). After 8 thrown fetches in a row (one to two and a half minutes) the room shows a non-blocking yellow hint that reloading the page may help, with a Reload button; retrying continues, and the hint clears when a fetch returns or the socket connects. It never reloads by itself, since a reload drops unsynced edits (#43). A refused ticket (`success: false`) is never retried: it leaves the connection down and is shown in the room. A `4003` close (the room was deleted, #48) also leaves it down, with no ticket fetch, and the room shows "This room was deleted". `components/room/room-provider.tsx` owns the doc and connection for the room page; the editor binds the shared `Y.Text` named `codemirror` with `Y.UndoManager` for undo/redo.
- **Local env:** `pnpm --filter @collab-editor/ws-server dev` loads `apps/web/.env` when it exists, so both apps share one `WS_TICKET_SECRET`; port `WS_SERVER_PORT` (default 8080); `WS_TRUSTED_PROXIES` (default empty, trust no proxy) only matters behind a reverse proxy.

## Component Boundaries

- **Web app** owns: authentication, room CRUD, UI rendering, editor component
- **WS server** owns: real-time sync, document persistence, room lifecycle, presence
- **Shared package** owns: TypeScript type definitions used by both
- The web app and WS server communicate only via WebSocket (no direct DB sharing for document content)
