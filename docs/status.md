# Project Status

## Current Phase
Phase 4 complete (#7): WebSocket server with room-ticket auth on upgrade, room lifecycle, validated and rate-limited messages, `/health` and graceful shutdown. Next: Phase 5 (Yjs real-time collaboration, #8).

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
```

`apps/web` reads environment variables from `apps/web/.env` (Next.js and Prisma both load it from the app directory).

## Next Steps
1. `implement #8` — Phase 5: real-time collaboration (Yjs), fetching a room ticket before each (re)connect
