# Collaborative Code Editor

Real-time collaborative code editor where multiple users simultaneously edit a single shared document with live cursor tracking, conflict-free merging via CRDTs, and syntax highlighting.

> **No AI attribution** — Never mention Claude, Anthropic, AI-generated, AI-assisted, or any AI tool names in code, comments, commits, README, or documentation. Exception: model ID strings in SDK calls.

## Status

Phase 5 complete — the room editor is bound to a shared Yjs document synced through the WS server, which speaks the y-websocket protocol on `y-protocols`, validates every frame and stores each update in LevelDB (`WS_PERSISTENCE_DIR`) before broadcasting it (ADR 0002). Room tickets (ADR 0001 addendum) are refreshed before a reconnect. Local DB: `docker compose up -d` (port 5434); dev seed creates `/room/seed-room`. The Invariant 6 test walks the client import graph (#16, #21). Next: follow-ups #22, #18, #19, then Phase 6 (presence and cursors, #9).

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
| Yjs ↔ WebSocket | y-websocket | latest |
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
│       ├── src/                # Server source (rooms/, auth/, persistence/, handlers/)
│       └── __tests__/          # Vitest tests
├── packages/
│   └── shared/                 # Shared TypeScript types
├── docs/                       # Living documentation (committed)
├── plans/                      # PRD, implementation plan, phases (gitignored)
├── turbo.json                  # Turborepo config
├── biome.json                  # Biome linter/formatter
└── .github/workflows/ci.yml   # CI pipeline
```

## Commands

```bash
# Development
pnpm dev                    # Start all apps (Turbopack + WS server)

# Quality
pnpm lint                   # Biome check across workspace
pnpm lint:fix               # Biome auto-fix
pnpm format                 # Biome format (write)
pnpm format:check           # Biome format (check only)
pnpm check:ci               # Biome check (CI mode, no writes)
pnpm type-check             # TypeScript check across all apps

# Testing
pnpm test                   # Run all tests
pnpm test:coverage          # Run tests with coverage enforcement (80%)

# Validation — the single gate (hooks, CI and Claude all call this)
make verify                 # wraps pnpm validate: lint + type-check + test:coverage
                            # healthy output ends with: VERIFY OK

# Build
pnpm build                  # Build all apps
```

## Architecture

Three-component system: Web App (Next.js) + WebSocket Server (Node.js) + Shared Types package.

- **Web app** owns authentication (Auth.js + GitHub OAuth), room CRUD (Prisma), and UI (CodeMirror 6)
- **WS server** owns real-time sync (Yjs + y-websocket), document persistence (LevelDB), room lifecycle
- JWT strategy allows WS server to verify auth without database access
- Yjs CRDT handles conflict-free merging; awareness protocol handles cursors/presence

See `docs/architecture.md` for full diagrams and data flow.

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
- **Test location:** `__tests__/` directory in each app
- **Naming:** `*.test.ts` / `*.test.tsx`
- **Focus:** Test business logic and behavior, not implementation details
- **Mocks:** Shared helpers in `__tests__/helpers/`
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
- **One commit per logical change** — commit after each working chunk
- **Git hooks (lefthook):** pre-commit Biome + gitleaks; pre-push `make verify`. Run `lefthook install` after cloning
- **Commit messages:** Enforced by commitlint (conventional format)

## Anti-Patterns

1. **No `any` types** — use `unknown`, generics, or proper type narrowing
2. **No raw `process.env`** — always import from `lib/env.ts`
3. **No `console.log` in production code** — use structured logger (pino) on server, remove from client
4. **No throwing in business logic** — return Result pattern objects
5. **No manual edits to `components/ui/`** — shadcn components are auto-generated
6. **No class components** — functional components only
7. **No unused imports/variables** — enforced by Biome
8. **No hardcoded secrets** — environment variables only
9. **No skipping tests** — 80% coverage enforced in CI
10. **No committing without validation** — run `make verify` first

## Session Workflow

### Starting a Session
1. Read this CLAUDE.md
2. Read `docs/status.md` for current state
3. Run `/phase-next` to continue development (or `/pm` for autonomous management)

### During Development
- **One task per conversation** — break large features into smaller chunks
- **Use `/clear` between major tasks** — reset context to prevent quality degradation
- **Use `/compact`** when context is long but you need continuity
- **Commit after each logical chunk** — never let a session run without committing

### Development Workflows
- **Single-feature flow:** Research → Plan → Implement → Test
- **Issue-based development:** Use GitHub issues as source of truth
- **Parallel work:** Use git worktrees: `git worktree add ../feature-name feat/feature-name`

### End of Session
- Update `docs/changelog.md` with changes made
- Update `docs/status.md` with current state and next steps
- Ensure all changes are committed and pushed

## References

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
2. **Room access is authorised per room.** A user only receives or sends updates for rooms they are a member of; room ID alone grants nothing.
3. **Yjs is the only source of document truth.** Edits flow editor → Y.Doc → provider; never write editor state directly or merge text by hand. Every client converges to the same document.
4. **No acknowledged update is lost.** An update the server has broadcast is persisted to LevelDB; restarting the server restores every room's document.
5. **Presence is ephemeral.** Awareness state (cursors, names) is never persisted and is cleared when a client disconnects.
6. **Secrets stay out of the client.** Only `NEXT_PUBLIC_*` values reach the browser; everything else goes through `lib/env.ts` on the server.

## Things Claude gets wrong

- (Add each repeated mistake here, with the correct behaviour.)

## Workflow
Workflow rules: `.claude/rules/ai-native-workflow.md`. Review policy: `REVIEW.md`.
