# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Collaborative Code Editor

Real-time collaborative code editor where multiple users simultaneously edit a single shared document with live cursor tracking, conflict-free merging via CRDTs, and syntax highlighting.

> **No AI attribution** — Never mention Claude, Anthropic, AI-generated, AI-assisted, or any AI tool names in code, comments, commits, README, or documentation. Exception: model ID strings in SDK calls.

## Status

Phases 1–7 complete. Phase 7 (room management and polish, #10): room dashboard with create, list and delete done (#35); `.env.example` synced with the env schemas (#47); deleting a room purges its WS-server document through an outbox (#48); web server code logs through pino (#51); both loggers redact tickets, authorization headers and cookies, and the boundary test keeps the logger out of middleware (#54, #55); responses, near-miss cookie keys and raw request objects in log calls are covered too (#57); owners share rooms with a secret, resettable invite link that makes signed-in visitors editors (#36, ADR 0003); landing page, footer, tablet-width room (presence folds away below `lg`), typed room-join errors with a way forward, unreachable-server banner with Retry now, 404/error pages, sign-in failure messages and a Playwright production check (#37); the Bash guard blocks shell writes to protected paths (#62); README with a demo GIF recorded by `apps/web/e2e/record-demo.ts`, and an MIT licence (#38). The repository is public and `main` is protected (#1); commits and pushes on `main` are refused locally (#6). History, blockers and local setup: `docs/status.md`.

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Monorepo | Turborepo | 2.x |
| Frontend | Next.js (App Router) | 15.x |
| React | React | 19.x |
| Language | TypeScript (strict) | 5.x |
| Code editor | CodeMirror 6 | 6.x |
| CRDT | Yjs | 13.x |
| Yjs ↔ Editor | y-codemirror.next | latest |
| Yjs ↔ WebSocket | y-websocket (client provider only; server uses y-protocols + lib0) | 2.x |
| WebSocket server | ws (Node.js) | 8.x |
| Document persistence | LevelDB (y-leveldb) | latest |
| Auth | Auth.js v5 (JWT) | 5.x |
| ORM | Prisma | 6.x |
| Database | PostgreSQL | 16 |
| Styling | Tailwind CSS | 4.x |
| Components | shadcn/ui | latest |
| Linter/Formatter | Biome | 2.x |
| Testing | Vitest | 4.x |
| Package manager | pnpm | 10.x |
| Runtime | Node.js (pinned in `.nvmrc`) | 22.x |

## Directory Structure

```
collaborative-code-editor/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── app/                # App Router pages
│   │   ├── components/         # UI components (editor/, room/, layout/, ui/)
│   │   ├── lib/                # Utilities (auth, prisma, env, yjs)
│   │   ├── actions/            # Server Actions
│   │   ├── prisma/             # Schema + migrations
│   │   └── __tests__/          # Vitest tests
│   └── ws-server/              # Custom WebSocket server
│       ├── src/                # Server source (auth/, sync/, rooms/, persistence/, handlers/)
│       └── __tests__/          # Vitest tests
├── packages/
│   └── shared/                 # Shared TypeScript types
├── docs/                       # Living docs + ADRs in docs/adr/ (committed; templates/ local)
├── intent/, specs/             # Artifact chain per change (local, gitignored)
├── plans/                      # PRD, implementation plan, plans/changes/ (gitignored)
├── turbo.json                  # Turborepo config
├── biome.json                  # Biome linter/formatter
└── .github/workflows/ci.yml   # CI pipeline
```

## Commands

```bash
# Development
pnpm dev                    # Start all apps (Next.js on Turbopack + WS server via tsx watch)
docker compose up -d        # Postgres 16 on localhost:5434
cp .env.example apps/web/.env   # one env file: the WS server dev script also reads ../web/.env; WS_SERVER_URL optional
pnpm --filter @collab-editor/web db:migrate   # also db:deploy, db:studio
pnpm --filter @collab-editor/web db:seed      # dev seed; creates /room/seed-room

# Quality
pnpm lint                   # Biome check across workspace
pnpm lint:fix               # Biome auto-fix
pnpm format                 # Biome format (write)
pnpm type-check             # TypeScript check across all apps

# Testing
pnpm test                   # Run all tests
pnpm test:coverage          # Run tests with coverage enforcement (80%)
pnpm --filter @collab-editor/ws-server exec vitest run __tests__/sync/sync-room.test.ts   # one file
pnpm --filter @collab-editor/web exec vitest run __tests__/lib/rooms.test.ts -t "<name>"  # one case
pnpm --filter @collab-editor/web test:watch   # watch mode
E2E_SIGNED_OUT_ONLY=1 pnpm --filter @collab-editor/web e2e:prod   # production console/overflow check, public pages
                            # (needs pnpm build + web start; full run with WS server: see docs/status.md Next Steps)

# Validation — the single gate (hooks, CI and Claude all call this)
make verify                 # wraps pnpm validate: lint + type-check + test:coverage
                            # healthy output ends with: VERIFY OK

# Build / tooling
pnpm build                  # Build all apps (ws-server bundles with tsup)
make doctor                 # checks node, pnpm, jq, git, lefthook, gitleaks
./scripts/issue-loop.sh     # works plans/issues/README.md in order: /next-issue per issue, fresh session each
lefthook install            # once after cloning
pnpm --filter @collab-editor/ws-server rebuild leveldown   # if the native build was skipped (macOS arm64)
```

## Architecture

Three packages: `apps/web` (Next.js), `apps/ws-server` (Node `ws`), `packages/shared` (types, close codes,
`userColor()`; consumed as TS source, no build step).

- **Web app** owns authentication (Auth.js + GitHub OAuth, JWT sessions), rooms and membership (Prisma), and the UI (CodeMirror 6).
- **WS server** owns real-time sync, document persistence (LevelDB) and room lifecycle. It never touches the database.

**Joining a room (read across several files):**
1. `components/room/room-provider.tsx` calls the `getRoomTicket` server action (`actions/room-ticket.ts`), which
   checks membership and signs a short-lived HS256 room ticket (`lib/ws-ticket.ts`, `WS_TICKET_SECRET`; ADR 0001).
2. `lib/yjs/provider.ts` wraps y-websocket's `WebsocketProvider`: the ticket goes in `Sec-WebSocket-Protocol`
   (never the URL), BroadcastChannel is disabled so every edit goes through the server, and a fresh ticket is
   fetched before each reconnect.
3. `ws-server/src/server.ts` handles the upgrade: per-IP upgrade limit (429 before any ticket check), ticket
   verification (`src/auth/ticket.ts`), per-connection message and byte budgets (1008), 30 s ping heartbeat.
4. The server does **not** use y-websocket's server utils (ADR 0002). `src/sync/protocol.ts` decodes and
   validates a whole frame before anything is applied (1003 otherwise). `src/sync/sync-room.ts` holds one
   `Y.Doc` + `Awareness` per room and appends each update to LevelDB (`src/persistence/document-store.ts`)
   *before* broadcasting it. A storage failure closes the room with 1011. `src/rooms/room-manager.ts` tears
   rooms down after a grace period.
5. Presence: the server replaces every awareness `user` with the ticket identity and binds one client id per
   connection. A taken id closes with 4002 and the client picks a new id (ADR 0002 addendum). An expired ticket
   closes with 4001 and the client reconnects with a new ticket. Deleting a room calls `DELETE /rooms/<id>` on the WS
   server with a 60 s purge ticket (`lib/room-purge.ts`, via the `RoomPurge` outbox): its sockets close with 4003 and
   the client does not reconnect (ADR 0001 addendum #48).

Entry point: `src/index.ts` → `src/main.ts` (env via Zod, LevelDB open, start, SIGINT/SIGTERM shutdown).
See `docs/architecture.md` and `docs/adr/` for diagrams and decisions.

## Coding Conventions

- TypeScript strict mode with all advanced flags (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- Zero `any` types — use `unknown` + type narrowing or generics
- Functional components only, Server Components by default
- `"use client"` only when interactivity required (editor, forms, WebSocket)
- All form validation uses Zod `.safeParse()`
- Import env from `lib/env.ts`, never use raw `process.env`
- Use `cn()` from `lib/utils.ts` for conditional Tailwind classes
- Never manually edit `components/ui/` — use `pnpm dlx shadcn@latest add`

## Error Handling

- Result pattern for business logic: `{ success: true, data }` or `{ success: false, error }`
- Never throw in business logic — return Result types
- Server Actions return structured errors surfaced to UI
- WebSocket messages validated server-side with Zod
- Connection errors shown via connection status indicator (green/yellow/red)

## Testing

- **Framework:** Vitest with jsdom (web app), Vitest (WS server)
- **Coverage threshold:** 80% lines/functions/branches/statements (enforced in CI)
- **Test location:** `__tests__/` in each app, mirroring the source path; `*.test.ts` / `*.test.tsx`
- **Helpers:** `apps/ws-server/__tests__/helpers/` (sockets, tickets, stores, Yjs clients, logger)
- **Key suites:** `apps/ws-server/__tests__/collaboration.test.ts` runs the real y-websocket provider against
  the server (protocol drift); `apps/web/__tests__/invariants/client-boundary.test.ts` walks the client import graph (Invariant 6)
- **Harness guards:** `.claude/protected-paths.txt` blocks edits to `apps/web/components/ui/*` and
  `apps/web/prisma/migrations/*`; `guard-bash.sh` also blocks shell writes to protected paths (redirects, `tee`,
  `cp`/`mv`, `rm`, `sed -i`, script writers) but lets `prisma migrate`, `shadcn add` and `db:migrate` through, and
  its tests (`.claude/hooks/tests/guard-bash.test.sh`) run in `make verify`; with `CLAUDE_FIX_MODE=1` test files are read-only.
  `guard-bash.sh` refuses a push to `main`/`master`, named (`origin main`, `HEAD:main`) or implied (a bare push while
  on `main`), unless origin has no such branch yet; lefthook `commit-msg` refuses commits on `main` (`no-commit-on-main.sh`)
- **CI:** GitHub Actions runs `make verify`, then build

## Security

- Environment variables validated at build time via Zod (`lib/env.ts`)
- Never commit `.env` files — only `.env.example` with placeholders
- JWT tokens verified on every WebSocket connection
- All user input validated server-side
- WebSocket messages rate-limited and validated
- GitHub OAuth secrets stored in environment variables
- Gitleaks in the lefthook pre-commit hook for secret scanning

## Git Workflow

- **GitHub account:** `aqasim81`; remote must use the SSH alias `git@github-aqasim81:aqasim81/collaborative-code-editor.git`
- **Branch naming:** `feat/`, `fix/`, `chore/`, `hotfix/` + description or issue number
- **Commits:** Conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- **PR titles:** `type(scope): description (#issue)`
- **Merge strategy:** Squash merge for feature/fix branches
- **`main` is protected:** PRs only; `Verify` and `Build` required and up to date with `main` (`gh pr update-branch <PR>` when behind); admins included; no force pushes or deletions
- **Old numbers:** issue and PR numbers in commits up to `96a1184` (history before this repo went public, #1 was #13 there) refer to the private `collaborative-code-editor-archive` repo
- **One commit per logical change** — commit after each working chunk
- **Git hooks (lefthook):** pre-commit Biome + gitleaks; commit-msg commitlint + no commits on `main`; pre-push `make verify`. Run `lefthook install` after cloning
- **Commit messages:** Enforced by commitlint (conventional format)

## Anti-Patterns

1. **No `any` types** — use `unknown`, generics, or proper type narrowing
2. **No raw `process.env`** — always import from `lib/env.ts`
3. **No `console` in production code** — log through pino on the server (`apps/web/lib/logger.ts`, `apps/ws-server/src/logger.ts`); client code does not log. Biome `noConsole` is an error outside `__tests__/`
4. **No throwing in business logic** — return Result pattern objects
5. **No manual edits to `components/ui/`** — shadcn components are auto-generated
6. **No class components** — functional components only
7. **No unused imports/variables** — enforced by Biome
8. **No hardcoded secrets** — environment variables only
9. **No skipping tests** — 80% coverage enforced in CI
10. **No committing without validation** — run `make verify` first

## Session Workflow

- **Start:** read `docs/status.md`, then `/phase-next` (or `/pm`). Issues are the source of truth for work.
- **End:** update `docs/changelog.md` and `docs/status.md`.

## References

`plans/*` is local and not published; its links resolve only in a working checkout.

- [PRD](plans/prd.md) — Product requirements
- [Implementation Plan](plans/implementation_plan.md) — Full architecture and phase details
- [Checklist](plans/checklist.md) — Phase-by-phase progress tracker
- [Architecture](docs/architecture.md) — System design diagrams and data flow
- [Changelog](docs/changelog.md) — Change history
- [Status](docs/status.md) — Current state and next steps

## Verifying your work

Run `make verify` and paste the tail of its output. Work is not done until it prints `VERIFY OK`.

## Invariants

Rules that must never break. The `invariant-auditor` agent checks changes against these.

1. **The WS server never trusts a client.** Every connection presents a valid, unexpired JWT before it joins a room; every inbound message is validated (Zod) and rate-limited.
2. **Room access is authorised per room.** A user only receives or sends updates for rooms they are a member of; room ID alone grants nothing; only a valid invite token (or creating the room) grants membership (ADR 0003).
3. **Yjs is the only source of document truth.** Edits flow editor → Y.Doc → provider; never write editor state directly or merge text by hand. Every client converges to the same document.
4. **No acknowledged update is lost.** An update the server has broadcast is persisted to LevelDB; restarting the server restores every room's document.
5. **Presence is ephemeral.** Awareness state (cursors, names) is never persisted and is cleared when a client disconnects.
6. **Secrets stay out of the client and out of logs.** Only `NEXT_PUBLIC_*` values reach the browser; everything else goes through `lib/env.ts` on the server; loggers redact `LOG_REDACT_PATHS`.

## Things Claude gets wrong

- `.env.example` is a committed placeholder file and may be read and edited; only real `.env*` files are off limits.
- `apps/web/lib/env.ts` is loaded by `next.config.ts`, whose loader can't resolve `@collab-editor/shared`'s TS
  source: importing the shared package there passes `make verify` but breaks `pnpm build`. Run `pnpm build`
  after touching `lib/env.ts` or anything it imports.
- The Bash guard refuses any command whose *text* mentions `.env` or the Node env object, heredocs and
  grep patterns included. Write or edit such files (e2e setup, docs quoting `--env-file`) with the Edit/Write
  tools, and read them with Read.
- Never work around a guard hook (for example, writing a migration with a shell command after the edit tools were
  blocked). Protected paths change only through their generator (`prisma migrate`, `shadcn add`). If the generator
  can't make the change, stop, comment on the issue and mark it blocked for the owner.
- (Add each repeated mistake here, with the correct behaviour.)

## Workflow
Workflow rules: `.claude/rules/ai-native-workflow.md`. Review policy: `REVIEW.md`.
