# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
