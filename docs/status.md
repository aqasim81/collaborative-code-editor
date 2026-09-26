# Project Status

## Current Phase
Phase 5 complete (#8): real-time collaboration over Yjs with LevelDB persistence before broadcast. Follow-ups done: #16/#21 (the client-boundary test walks the import graph), #22 (per-connection byte budget), #18 (sockets close at ticket expiry) and #19 (ticket in `Sec-WebSocket-Protocol`, per-IP upgrade limit). Phase 6 (#9): remote cursors with name labels, selections, a presence list and a connection indicator, on server-owned presence identity (#32) and a ping heartbeat (#33); presence is dropped as soon as the server starts closing a connection (#28). Next: Phase 7 (room management and polish, #10).

## Accomplishments
- [x] Project spec refined and validated
- [x] Technology stack selected: Next.js 15 + Custom WS Server + Yjs + CodeMirror 6 (Turborepo)
- [x] PRD and implementation plan written (7 phases)
- [x] Phase 1: Turborepo workspace (apps/web, apps/ws-server, packages/shared), Biome, strict TypeScript, Vitest with 80% thresholds, lefthook hooks, CI (verify → build)
- [x] WS server build emits a runnable bundle (#2); Node 22 pinned (#3)
- [x] Harness checked: `make verify` fails on a deliberate type error and a failing test (exit 2), and the protected-path hook blocks edits under `apps/web/components/ui/`
- [x] Roadmap tracked as GitHub issues: phases 2–7 are #5–#10
- [x] Phase 2: Prisma schema (User, Account, Session, Room, RoomMember) + init migration, Auth.js v5 GitHub OAuth with JWT sessions, protected-route middleware, sign-in page, navbar auth state, Zod env validation at build (#5). Sign-in, navbar avatar/name and sign-out checked end to end against a local GitHub OAuth App
- [x] Phase 3: CodeMirror 6 editor on `/room/[id]` (members only, 404 otherwise), on-demand grammars for 10 languages, language toolbar, undo/redo/select-all/search, dev `db:seed` (#6). Layout, highlighting switches (JS → Python → JSON), shortcuts, resize and the non-member 404 checked in a browser
- [x] Phase 5: Yjs sync between the editor and the WS server on `y-protocols` (ADR 0002), updates stored in LevelDB before broadcast, rooms restored after restart, ticket refresh on reconnect, awareness in memory only (#8). Checked in a browser: two tabs sync, content survives a WS server restart with no clients connected, tabs converge after offline edits, undo/redo still work
- [x] WS connections have a byte budget (16 MiB burst, 1 MiB/s) alongside the message budget; a byte flood is closed with 1008, a 10K-line first sync is not (#22)
- [x] Sockets close with 4001 when their room ticket expires; the client fetches a fresh ticket and reconnects without losing edits, so a removed member loses access within 5 minutes (#18)
- [x] The room ticket travels in `Sec-WebSocket-Protocol` and is never echoed or put in the URL; upgrade attempts are limited per IP (429 before any ticket check) (#19). Two tabs checked in a browser: both connect to `/seed-room` with no query string and edits sync both ways
- [x] Client-boundary invariant test follows relative, directive-less and transitive imports from every client component (#16, #21)
- [x] Phase 6: remote carets and selections in each user's colour, name labels for 3 s after a caret moves, a presence sidebar (one entry per user, avatar or initials), and a Connecting/Connected/Reconnecting/Disconnected indicator; colours derive from the user id (#9). Checked in a browser with two windows, including a WS server outage and recovery
- [x] Presence is the ticket's identity; a connection owns one presence, which is cleared on every disconnect, reconnects included; a same-clock null for someone else's presence is refused (#32)
- [x] Dead WS connections are found by a 30 s ping and terminated (#33)
- [x] Every server-initiated close drops the peer's presence at once, and a client that never answers it is terminated after 5 s (#28)
- [x] Phase 4: WS server (`ws` + pino) with HS256 room tickets issued by the web app after a membership check (ADR 0001 addendum), room manager with grace-period cleanup, Zod-validated and rate-limited messages, `GET /health`, graceful shutdown (#7). `/health` and the 401 on a ticketless upgrade checked against the dev server

## Blockers
- `main` has no required status check: GitHub branch protection on a private repo needs a paid plan (#13)

## Local Setup
```bash
nvm use                           # Node 22 from .nvmrc
corepack enable                   # provides the pinned pnpm@10.7.0 for this Node version
pnpm install --frozen-lockfile
lefthook install                  # pre-commit Biome + gitleaks, commit-msg commitlint, pre-push make verify
make verify                       # healthy output ends with VERIFY OK

# Database and auth (Phase 2)
docker compose up -d              # Postgres 16 on localhost:5434
cp .env.example apps/web/.env     # fill in DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID/SECRET, WS_TICKET_SECRET, NEXT_PUBLIC_* URLs
pnpm --filter @collab-editor/web db:migrate
pnpm --filter @collab-editor/web db:seed   # after the first GitHub sign-in: creates /room/seed-room
pnpm dev                          # web on :3000, WS server on :8080 (reads apps/web/.env too)
# Apple Silicon: if the WS server fails to load leveldown, build it once:
pnpm --filter @collab-editor/ws-server rebuild leveldown
```

`apps/web` reads environment variables from `apps/web/.env` (Next.js and Prisma both load it from the app directory).

## Next Steps
1. Add `WS_TICKET_SECRET` (32+ characters, e.g. `openssl rand -hex 32`) to `apps/web/.env` if it is not there yet; local `pnpm dev` and `pnpm build` need it
2. `./scripts/issue-loop.sh` (or `/next-issue` for one issue) — works the open issues in `plans/issues/README.md` order, #27 first; Phase 7 (#10) is #35 → #38
