# Pre-public issue and PR history

Before this repository went public, the project was tracked in a private repository. Its history was
rewritten into this one, and commits up to `96a1184` refer to that repository's issue and PR
numbers: `(#8)` in one of those commits means [#8](#old-8) below, not issue #8 here. The one
exception is old #13, which was moved to this repository as [#1](https://github.com/aqasim81/collaborative-code-editor/issues/1).

This page keeps that record. References to internal workflow notes, which are not part of this
repository, are shown as *(internal note)*.

| Old # | Type | Title | State | Opened | Closed | Commit |
|---|---|---|---|---|---|---|
| [#1](#old-1) | PR | chore: install AI-native starter kit harness | merged | 2026-09-25 | 2026-09-25 | [`f2828f4`](https://github.com/aqasim81/collaborative-code-editor/commit/f2828f4) |
| [#2](#old-2) | Issue | fix(ws-server): build script runs the server and emits nothing | closed | 2026-09-25 | 2026-09-25 |  |
| [#3](#old-3) | Issue | chore: pin Node 22 | closed | 2026-09-25 | 2026-09-25 |  |
| [#4](#old-4) | Issue | docs: close out Phase 1 — fix doc drift | closed | 2026-09-25 | 2026-09-25 |  |
| [#5](#old-5) | Issue | feat: Phase 2 — Database Schema & Authentication | closed | 2026-09-25 | 2026-09-25 |  |
| [#6](#old-6) | Issue | feat: Phase 3 — Editor UI (CodeMirror 6) | closed | 2026-09-25 | 2026-09-25 |  |
| [#7](#old-7) | Issue | feat: Phase 4 — WebSocket Server & Room Architecture | closed | 2026-09-25 | 2026-09-25 |  |
| [#8](#old-8) | Issue | feat: Phase 5 — Real-Time Collaboration (Yjs) | closed | 2026-09-25 | 2026-09-26 |  |
| [#9](#old-9) | Issue | feat: Phase 6 — Presence & Cursor Tracking | closed | 2026-09-25 | 2026-09-26 |  |
| [#10](#old-10) | Issue | feat: Phase 7 — Room Management & Polish | closed | 2026-09-25 | 2026-09-27 |  |
| [#11](#old-11) | PR | fix(ws-server): build emits a runnable bundle instead of running the server ([#2](#old-2)) | merged | 2026-09-25 | 2026-09-25 | [`d63a663`](https://github.com/aqasim81/collaborative-code-editor/commit/d63a663) |
| [#12](#old-12) | PR | chore: pin Node 22 ([#3](#old-3)) | merged | 2026-09-25 | 2026-09-25 | [`8c5f9b7`](https://github.com/aqasim81/collaborative-code-editor/commit/8c5f9b7) |
| [#14](#old-14) | PR | docs: close out Phase 1 and fix doc drift ([#4](#old-4)) | merged | 2026-09-25 | 2026-09-25 | [`1bd427c`](https://github.com/aqasim81/collaborative-code-editor/commit/1bd427c) |
| [#15](#old-15) | PR | feat(web): database schema and GitHub auth ([#5](#old-5)) | merged | 2026-09-25 | 2026-09-25 | [`5767405`](https://github.com/aqasim81/collaborative-code-editor/commit/5767405) |
| [#16](#old-16) | Issue | test: client-boundary check misses relative and transitive server imports | closed | 2026-09-25 | 2026-09-26 |  |
| [#17](#old-17) | PR | feat(web): editor UI with CodeMirror 6 ([#6](#old-6)) | merged | 2026-09-25 | 2026-09-25 | [`cec19bc`](https://github.com/aqasim81/collaborative-code-editor/commit/cec19bc) |
| [#18](#old-18) | Issue | feat(ws-server): close sockets when the room ticket expires or membership is revoked | closed | 2026-09-25 | 2026-09-26 |  |
| [#19](#old-19) | Issue | chore(ws-server): rate-limit upgrade attempts and keep tickets out of proxy logs | closed | 2026-09-25 | 2026-09-26 |  |
| [#20](#old-20) | PR | feat(ws-server): WebSocket server with room-ticket auth ([#7](#old-7)) | merged | 2026-09-25 | 2026-09-25 | [`a8a2831`](https://github.com/aqasim81/collaborative-code-editor/commit/a8a2831) |
| [#21](#old-21) | Issue | test: client-boundary check misses server-only modules imported indirectly | closed | 2026-09-25 | 2026-09-26 |  |
| [#22](#old-22) | Issue | feat(ws-server): rate-limit inbound bytes, not only messages | closed | 2026-09-25 | 2026-09-26 |  |
| [#23](#old-23) | PR | feat(collab): real-time collaboration with Yjs and LevelDB persistence ([#8](#old-8)) | merged | 2026-09-25 | 2026-09-26 | [`7de93b4`](https://github.com/aqasim81/collaborative-code-editor/commit/7de93b4) |
| [#24](#old-24) | Issue | test: client-boundary check misses server-only packages and server-to-client props | closed | 2026-09-26 | 2026-09-26 |  |
| [#25](#old-25) | PR | test(web): walk the client import graph in the boundary check ([#16](#old-16), [#21](#old-21)) | merged | 2026-09-26 | 2026-09-26 | [`a7d03ea`](https://github.com/aqasim81/collaborative-code-editor/commit/a7d03ea) |
| [#26](#old-26) | PR | feat(ws-server): per-connection byte budget ([#22](#old-22)) | merged | 2026-09-26 | 2026-09-26 | [`654ae09`](https://github.com/aqasim81/collaborative-code-editor/commit/654ae09) |
| [#27](#old-27) | Issue | feat(web): retry a room ticket fetch that fails transiently | closed | 2026-09-26 | 2026-09-26 |  |
| [#28](#old-28) | Issue | fix(ws-server): drop a peer's presence immediately when the server closes its socket | closed | 2026-09-26 | 2026-09-26 |  |
| [#29](#old-29) | PR | feat(ws-server): close sockets when the room ticket expires ([#18](#old-18)) | merged | 2026-09-26 | 2026-09-26 | [`88b7190`](https://github.com/aqasim81/collaborative-code-editor/commit/88b7190) |
| [#30](#old-30) | Issue | feat(ws-server): trusted-proxy setting for the upgrade rate limit | closed | 2026-09-26 | 2026-09-27 |  |
| [#31](#old-31) | PR | feat(ws-server): ticket in Sec-WebSocket-Protocol and per-IP upgrade limit ([#19](#old-19)) | merged | 2026-09-26 | 2026-09-26 | [`0acc3e7`](https://github.com/aqasim81/collaborative-code-editor/commit/0acc3e7) |
| [#32](#old-32) | Issue | fix(ws-server): awareness ownership, spoofing and presence caps | closed | 2026-09-26 | 2026-09-26 |  |
| [#33](#old-33) | Issue | fix(ws-server): detect dead connections with a ping heartbeat | closed | 2026-09-26 | 2026-09-26 |  |
| [#34](#old-34) | PR | feat(presence): cursors, presence list and connection status ([#9](#old-9)) | merged | 2026-09-26 | 2026-09-26 | [`279d335`](https://github.com/aqasim81/collaborative-code-editor/commit/279d335) |
| [#35](#old-35) | Issue | feat(web): create, list and delete rooms on a dashboard | closed | 2026-09-26 | 2026-09-27 |  |
| [#36](#old-36) | Issue | feat(web): share rooms with a secret invite link | closed | 2026-09-26 | 2026-09-27 |  |
| [#37](#old-37) | Issue | feat(web): landing page, responsive layout and error states | closed | 2026-09-26 | 2026-09-27 |  |
| [#38](#old-38) | Issue | docs: README with demo GIF, setup and architecture | closed | 2026-09-26 | 2026-09-27 |  |
| [#39](#old-39) | PR | docs(claude-md): refresh commands and architecture | merged | 2026-09-26 | 2026-09-26 | [`e00eb1d`](https://github.com/aqasim81/collaborative-code-editor/commit/e00eb1d) |
| [#40](#old-40) | PR | fix(ws-server): drop presence at once when the server closes a socket ([#28](#old-28)) | merged | 2026-09-26 | 2026-09-26 | [`e21bcaf`](https://github.com/aqasim81/collaborative-code-editor/commit/e21bcaf) |
| [#41](#old-41) | PR | chore: add issue autopilot (/next-issue and issue-loop script) | merged | 2026-09-26 | 2026-09-26 | [`5828682`](https://github.com/aqasim81/collaborative-code-editor/commit/5828682) |
| [#42](#old-42) | PR | feat(web): retry a room ticket fetch that fails transiently ([#27](#old-27)) | merged | 2026-09-26 | 2026-09-26 | [`c7bcf53`](https://github.com/aqasim81/collaborative-code-editor/commit/c7bcf53) |
| [#43](#old-43) | Issue | feat(web): suggest a reload after prolonged ticket fetch failures | closed | 2026-09-26 | 2026-09-26 |  |
| [#44](#old-44) | PR | test(web): client-boundary denylist and server-to-client props ([#24](#old-24)) | merged | 2026-09-26 | 2026-09-26 | [`6c4bf08`](https://github.com/aqasim81/collaborative-code-editor/commit/6c4bf08) |
| [#45](#old-45) | PR | feat(web): suggest a reload after prolonged ticket fetch failures ([#43](#old-43)) | merged | 2026-09-26 | 2026-09-26 | [`80066b0`](https://github.com/aqasim81/collaborative-code-editor/commit/80066b0) |
| [#46](#old-46) | PR | feat(ws-server): trusted-proxy setting for the upgrade rate limit ([#30](#old-30)) | merged | 2026-09-27 | 2026-09-27 | [`26be1e0`](https://github.com/aqasim81/collaborative-code-editor/commit/26be1e0) |
| [#47](#old-47) | Issue | chore: document WS_TRUSTED_PROXIES in .env.example | closed | 2026-09-27 | 2026-09-27 |  |
| [#48](#old-48) | Issue | feat(ws-server): purge a deleted room's document | closed | 2026-09-27 | 2026-09-27 |  |
| [#49](#old-49) | PR | feat(web): create, list and delete rooms on a dashboard ([#35](#old-35)) | merged | 2026-09-27 | 2026-09-27 | [`6412a39`](https://github.com/aqasim81/collaborative-code-editor/commit/6412a39) |
| [#50](#old-50) | PR | chore: document WS_TRUSTED_PROXIES in .env.example ([#47](#old-47)) | merged | 2026-09-27 | 2026-09-27 | [`66b4eb4`](https://github.com/aqasim81/collaborative-code-editor/commit/66b4eb4) |
| [#51](#old-51) | Issue | feat(web): server-side structured logger (pino) instead of console | closed | 2026-09-27 | 2026-09-27 |  |
| [#52](#old-52) | PR | feat(ws-server): purge a deleted room's document ([#48](#old-48)) | merged | 2026-09-27 | 2026-09-27 | [`6e85093`](https://github.com/aqasim81/collaborative-code-editor/commit/6e85093) |
| [#53](#old-53) | PR | feat(web): server-side structured logger (pino) instead of console ([#51](#old-51)) | merged | 2026-09-27 | 2026-09-27 | [`0d7477d`](https://github.com/aqasim81/collaborative-code-editor/commit/0d7477d) |
| [#54](#old-54) | Issue | chore: redact secrets in logs and keep the logger out of middleware | closed | 2026-09-27 | 2026-09-27 |  |
| [#55](#old-55) | Issue | chore: redact cookies and raw request headers in logs | closed | 2026-09-27 | 2026-09-27 |  |
| [#56](#old-56) | PR | chore: redact secrets in logs and keep the logger out of middleware ([#54](#old-54)) | merged | 2026-09-27 | 2026-09-27 | [`2bf6f72`](https://github.com/aqasim81/collaborative-code-editor/commit/2bf6f72) |
| [#57](#old-57) | Issue | chore: redact response objects and near-miss secret keys in logs | closed | 2026-09-27 | 2026-09-27 |  |
| [#58](#old-58) | PR | chore: redact cookies and raw request headers in logs ([#55](#old-55)) | merged | 2026-09-27 | 2026-09-27 | [`556906b`](https://github.com/aqasim81/collaborative-code-editor/commit/556906b) |
| [#59](#old-59) | PR | chore: redact response objects and near-miss secret keys in logs ([#57](#old-57)) | merged | 2026-09-27 | 2026-09-27 | [`dc06a9d`](https://github.com/aqasim81/collaborative-code-editor/commit/dc06a9d) |
| [#60](#old-60) | PR | feat(web): share rooms with a secret invite link ([#36](#old-36)) | merged | 2026-09-27 | 2026-09-27 | [`1908527`](https://github.com/aqasim81/collaborative-code-editor/commit/1908527) |
| [#61](#old-61) | PR | feat(web): landing page, responsive layout and error states ([#37](#old-37)) | merged | 2026-09-27 | 2026-09-27 | [`5d09f47`](https://github.com/aqasim81/collaborative-code-editor/commit/5d09f47) |
| [#62](#old-62) | Issue | chore: guard-bash blocks shell writes to protected paths | closed | 2026-09-27 | 2026-09-27 |  |
| [#63](#old-63) | PR | chore: guard-bash blocks shell writes to protected paths ([#62](#old-62)) | merged | 2026-09-27 | 2026-09-27 | [`134a863`](https://github.com/aqasim81/collaborative-code-editor/commit/134a863) |
| [#64](#old-64) | Issue | chore: /next-issue follows the per-issue checklist format | closed | 2026-09-27 | 2026-09-27 |  |
| [#65](#old-65) | PR | docs(readme): README with demo GIF, setup and architecture ([#38](#old-38)) | merged | 2026-09-27 | 2026-09-27 | [`757d481`](https://github.com/aqasim81/collaborative-code-editor/commit/757d481) |
| [#66](#old-66) | PR | chore: /next-issue follows the per-issue checklist format ([#64](#old-64)) | merged | 2026-09-27 | 2026-09-27 | [`95897ca`](https://github.com/aqasim81/collaborative-code-editor/commit/95897ca) |
| [#67](#old-67) | Issue | chore: the docs-only audit skip must not cover CLAUDE.md or .claude/ | closed | 2026-09-27 | 2026-09-27 |  |
| [#68](#old-68) | PR | chore: the docs-only audit skip must not cover CLAUDE.md or .claude/ ([#67](#old-67)) | merged | 2026-09-27 | 2026-09-27 | [`6d648cd`](https://github.com/aqasim81/collaborative-code-editor/commit/6d648cd) |
| [#69](#old-69) | PR | chore: keep internal workflow files out of the published tree ([#13](https://github.com/aqasim81/collaborative-code-editor/issues/1)) | merged | 2026-09-27 | 2026-09-27 | [`96a1184`](https://github.com/aqasim81/collaborative-code-editor/commit/96a1184) |

<a id="old-1"></a>

## #1 chore: install AI-native starter kit harness

*PR · merged · opened 2026-09-25 · closed 2026-09-25 · commit [`f2828f4`](https://github.com/aqasim81/collaborative-code-editor/commit/f2828f4)*

##### Summary
- Installs the starter kit harness: guard hooks, workflow rules, invariant auditor agent, REVIEW.md, PR/ADR/spec templates
- `make verify` is the single gate (wraps `pnpm validate`); CI's quality + test jobs collapse into one `verify` job, build still runs after it
- Replaces husky + lint-staged with lefthook: pre-commit Biome + gitleaks, commit-msg commitlint, pre-push `make verify`
- Moves MCP servers from `.claude/settings.json` to `.mcp.json`; drops the old hook that ran the test suite after every edit
- CLAUDE.md: `## Invariants`, "Verifying your work", correct GitHub account alias
- Also carries the pending `docs/architecture.md` infrastructure table

##### Verification
- `make verify` → `VERIFY OK`
- Deliberate type error in `packages/shared` → `make verify` fails (TS2322), reverted → green again
- Commit went through lefthook (biome, gitleaks, commitlint); push ran pre-push `make verify`

<a id="old-2"></a>

## #2 fix(ws-server): build script runs the server and emits nothing

*Issue · closed · opened 2026-09-25 · closed 2026-09-25 · labels: bug, infra*

##### Problem
`apps/ws-server/package.json` has `"build": "tsc && tsx src/index.ts"`.

- The root `tsconfig.json` sets `noEmit: true`, so `tsc` type-checks but emits nothing into `dist/`.
- `tsx src/index.ts` then **starts the server** as part of the build. That works today only because `src/index.ts` is a comment. Once Phase 4 adds a listener, `pnpm build` and the CI build job will hang.
- Even if `tsc` did emit, `moduleResolution: bundler` (extensionless imports) plus the TS-source `@collab-editor/shared` package would not run under plain Node, so `start: node dist/index.js` can't work.

##### Fix
- Build with tsup: `tsup src/index.ts --format esm --target node22 --clean`. This bundles `@collab-editor/shared` and outputs `dist/index.js`.
- Add a `lint` script (`biome check .`) to match `apps/web`.
- Keep `type-check` as `tsc --noEmit`.

##### Acceptance criteria
- [ ] `pnpm build` terminates (does not start the server)
- [ ] `apps/ws-server/dist/index.js` exists and `node apps/ws-server/dist/index.js` runs
- [ ] `make verify` prints `VERIFY OK`
- [ ] CI build job green

<a id="old-3"></a>

## #3 chore: pin Node 22

*Issue · closed · opened 2026-09-25 · closed 2026-09-25 · labels: infra*

##### Problem
CI runs Node 22 (`.github/workflows/ci.yml`), but nothing pins the version locally, so a dev machine on Node 20 can drift from CI.

##### Fix
- Add `.nvmrc` containing `22`
- Add `"engines": { "node": ">=22" }` to the root `package.json`

##### Acceptance criteria
- [ ] `.nvmrc` and `engines` present
- [ ] `make verify` prints `VERIFY OK` on Node 22

<a id="old-4"></a>

## #4 docs: close out Phase 1 — fix doc drift

*Issue · closed · opened 2026-09-25 · closed 2026-09-25 · labels: documentation*

Depends on [#2](#old-2) and [#3](#old-3).

##### Problem
Phase 1 (monorepo scaffolding and quality infrastructure) is built and CI is green on `main`, but the docs don't match what's in the repo:

- `docs/changelog.md` says Husky + lint-staged and a 3-job CI. The repo actually uses lefthook (pre-commit Biome + gitleaks, commit-msg commitlint, pre-push `make verify`) and 2 CI jobs (verify → build).
- `CLAUDE.md` Status and `docs/status.md` still say Phase 0.

##### Tasks
- [ ] `docs/changelog.md`: add a Phase 1 entry and correct the tooling description
- [ ] `docs/status.md`: Phase 1 complete, next is Phase 2; keep the blockers (PostgreSQL, GitHub OAuth App)
- [ ] `CLAUDE.md` Status: "Phase 1 complete — next: Phase 2 (Database Schema & Authentication)"
- [ ] Tick Phase 1 in the local checklist

##### Phase 1 acceptance (verify while closing out)
- [ ] `pnpm install` succeeds from root
- [ ] `pnpm lint`, `pnpm type-check`, `pnpm test` run across all apps
- [ ] `pnpm build` builds the Next.js app
- [ ] CI pipeline passes on GitHub

**Comment, 2026-09-25:**

Notes carried over before starting this:

- **Branch already exists:** `chore/4-phase-1-close-out` has one commit (`chore: protect shadcn ui components from manual edits`, which adds `apps/web/components/ui/*` to `.claude/protected-paths.txt`). It was cut before [#11](#old-11) and [#12](#old-12) merged, so **rebase onto `main` first**.
- **Changelog should also cover** [#2](#old-2) (ws-server now builds with tsup, plus a regression test for the build output and a CI build timeout) and [#3](#old-3) (Node 22 pinned via `.nvmrc`/`engines`; CI reads `.nvmrc`).
- **Harness checks already done:** the gate was shown to fail (a type error → exit 2; a failing test → exit 2; `VERIFY OK` after reverting), and the protected-path hook blocks edits under `components/ui/`. Worth one line in `docs/status.md`.
- **Local dev setup to document** (status or README): run `nvm use` (Node 22); pnpm on Node 22 comes from `corepack enable`, which uses the pinned `pnpm@10.7.0`.
- (internal note) and the local checklist still mention Husky/lint-staged; the repo uses lefthook.

<a id="old-5"></a>

## #5 feat: Phase 2 — Database Schema & Authentication

*Issue · closed · opened 2026-09-25 · closed 2026-09-25 · labels: blocked: external, enhancement, phase*

##### Goal
Set up PostgreSQL with Prisma, define the data model, and implement GitHub OAuth authentication with protected routes.

**Blocked on external setup (owner):** provision a PostgreSQL 16 database and create a GitHub OAuth App (callback `http://localhost:3000/api/auth/callback/github`). Put the values in `.env` (see `.env.example`).

**Depends on:** [#2](#old-2), [#3](#old-3), [#4](#old-4) (Phase 1 close-out)

##### Scope
- Prisma schema (User, Account, Session, Room) + initial migration
- Auth.js v5 with GitHub OAuth + JWT strategy (JWT carries user id and name so the WS server can verify without DB access)
- Environment validation with Zod in `lib/env.ts`
- Protected routes middleware
- Sign-in page and navbar auth state

##### Acceptance criteria
- [ ] Database migrations run successfully
- [ ] GitHub OAuth sign-in flow works end-to-end
- [ ] Protected routes redirect unauthenticated users to sign-in
- [ ] Navbar shows user avatar and name when signed in
- [ ] JWT contains user ID and name
- [ ] Environment validation catches missing variables at build time

##### Done when
- [ ] Every acceptance criterion above holds
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] `docs/changelog.md`, `docs/status.md` and CLAUDE.md Status updated

**Comment, 2026-09-25:**

Notes for when this starts:

- **Postgres MCP:** the `postgres` server in `.mcp.json` currently fails to connect (no database yet). Once PostgreSQL is provisioned, check it connects so schema/migration work can be inspected.
- **Protect migrations:** once `apps/web/prisma/migrations/` exists, add `apps/web/prisma/migrations/*` to `.claude/protected-paths.txt` (migrations are append-only; generate new ones and never hand-edit applied ones).
- **Coverage gate turns real here:** `apps/web` coverage includes `lib/**`, `components/**`, `actions/**`. Until now it has passed vacuously because those folders are empty, so this phase is the first where the 80% threshold bites.

<a id="old-6"></a>

## #6 feat: Phase 3 — Editor UI (CodeMirror 6)

*Issue · closed · opened 2026-09-25 · closed 2026-09-25 · labels: enhancement, phase*

##### Goal
Integrate CodeMirror 6 with syntax highlighting, language selection, and a polished editor layout — no real-time collaboration yet.

**Depends on:** [#5](#old-5)

##### Scope
- CodeMirror 6 wrapper component (`"use client"`)
- Syntax highlighting for 10+ languages
- Language selector toolbar
- Room page layout (full-viewport editor)

##### Acceptance criteria
- [ ] CodeMirror renders in the room page with full viewport height
- [ ] Syntax highlighting works for JS, TS, Python, Go, Rust, Java, C, CSS, HTML, JSON
- [ ] Language selector dropdown changes highlighting mode
- [ ] Keyboard shortcuts work (undo, redo, select all, search)
- [ ] Editor is responsive and handles window resize

##### Done when
- [ ] Every acceptance criterion above holds
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] `docs/changelog.md`, `docs/status.md` and CLAUDE.md Status updated

<a id="old-7"></a>

## #7 feat: Phase 4 — WebSocket Server & Room Architecture

*Issue · closed · opened 2026-09-25 · closed 2026-09-25 · labels: enhancement, phase*

##### Goal
Build the custom Node.js WebSocket server with room-based connection management, JWT authentication, and health monitoring.

**Depends on:** [#5](#old-5) (JWT), [#2](#old-2) (ws-server build must not start the server)

##### Scope
- HTTP + WebSocket server with `ws`
- Room manager (create, join, leave, destroy lifecycle)
- JWT authentication on upgrade
- Health check endpoint
- Graceful shutdown
- Structured logging (pino)

##### Invariants to uphold
1. The WS server never trusts a client: valid, unexpired JWT before joining; every inbound message Zod-validated and rate-limited.
2. Room access is authorised per room: room ID alone grants nothing.

##### Acceptance criteria
- [ ] WS server starts on configured port
- [ ] Connections without valid JWT are rejected with 401
- [ ] Room created on first connection with room ID
- [ ] Multiple clients join the same room
- [ ] Clients removed from room on disconnect
- [ ] Empty rooms cleaned up after grace period
- [ ] Health endpoint returns `{ status, rooms, connections }`
- [ ] Graceful shutdown closes all connections

##### Done when
- [ ] Every acceptance criterion above holds
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] `docs/changelog.md`, `docs/status.md` and CLAUDE.md Status updated

<a id="old-8"></a>

## #8 feat: Phase 5 — Real-Time Collaboration (Yjs)

*Issue · closed · opened 2026-09-25 · closed 2026-09-26 · labels: enhancement, phase*

##### Goal
Wire Yjs into both the CodeMirror editor and the WebSocket server to enable real-time collaborative editing with document persistence.

**Depends on:** [#6](#old-6) (editor), [#7](#old-7) (WS server)

##### Scope
- Yjs document + WebSocket provider (`room-provider.tsx`)
- y-codemirror.next binding to CodeMirror
- LevelDB document persistence on the WS server
- Sync protocol (initial + incremental updates)
- Reconnection with state recovery

##### Invariants to uphold
3. Yjs is the only source of document truth: editor → Y.Doc → provider; every client converges.
4. No acknowledged update is lost: broadcast updates are persisted to LevelDB; restart restores every room.

##### Acceptance criteria
- [ ] Two browser tabs editing the same room sync in real time
- [ ] Edits appear on remote clients within 200ms
- [ ] Concurrent edits at the same position merge correctly (CRDT guarantee)
- [ ] Document persists — closing all tabs and reopening restores content
- [ ] Large documents (10K+ lines) sync without noticeable lag
- [ ] Disconnect and reconnect restores sync state

##### Done when
- [ ] Every acceptance criterion above holds
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] `docs/changelog.md`, `docs/status.md` and CLAUDE.md Status updated

<a id="old-9"></a>

## #9 feat: Phase 6 — Presence & Cursor Tracking

*Issue · closed · opened 2026-09-25 · closed 2026-09-26 · labels: enhancement, phase*

##### Goal
Implement the Yjs awareness protocol to show remote cursors, selections, and a live user presence list.

**Depends on:** [#8](#old-8)

##### Scope
- Yjs awareness protocol integration
- Remote cursor overlay (colored carets + name labels)
- Selection highlighting
- Presence list sidebar (avatars, names, colors)
- Connection status indicator (green/yellow/red)

##### Invariants to uphold
5. Presence is ephemeral: awareness state is never persisted and is cleared when a client disconnects.

##### Acceptance criteria
- [ ] Remote cursors visible with distinct colors and name labels
- [ ] Cursor positions update in real time
- [ ] Text selections shown as colored highlights
- [ ] Presence list shows all active users with avatars
- [ ] Users appear/disappear from presence list on join/leave
- [ ] Connection status accurately reflects WebSocket state
- [ ] Colors are consistent for the same user across sessions

##### Done when
- [ ] Every acceptance criterion above holds
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] `docs/changelog.md`, `docs/status.md` and CLAUDE.md Status updated

<a id="old-10"></a>

## #10 feat: Phase 7 — Room Management & Polish

*Issue · closed · opened 2026-09-25 · closed 2026-09-27 · labels: enhancement, phase*

##### Goal
Build room creation, sharing and the dashboard, and polish the overall UX for portfolio presentation.

**Depends on:** [#9](#old-9)

##### Scope
- Room creation dialog and dashboard
- Room CRUD Server Actions
- Share button (copy URL to clipboard)
- Polished landing page
- Error states and edge cases
- README with demo GIF and architecture docs

##### Acceptance criteria
- [ ] Users can create rooms with a name and language
- [ ] Dashboard lists all rooms created by the user
- [ ] Share button copies room URL to clipboard
- [ ] Landing page looks polished and communicates the product
- [ ] Responsive layout works on desktop and tablet
- [ ] Error states handled gracefully
- [ ] No console errors or warnings in production build
- [ ] README with demo GIF, setup instructions, architecture overview

##### Done when
- [ ] Every acceptance criterion above holds
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] `docs/changelog.md`, `docs/status.md` and CLAUDE.md Status updated

**Comment, 2026-09-26:**

Split into sub-issues, to be done one at a time in this order:
1. [#35](#old-35) create, list and delete rooms on a dashboard
2. [#36](#old-36) share rooms with a secret invite link (decided 2026-09-27: a per-room random token at /join/<token>, resettable by the owner; the room id alone still grants nothing, Invariant 2)
3. [#37](#old-37) landing page, responsive layout and error states
4. [#38](#old-38) README with demo GIF, setup and architecture

This issue closes when all four are merged.

**Comment, 2026-09-26:**

##### Implementation plan

Umbrella issue with no branch of its own. Its phases are the sub-issues, done one at a time, each on its own branch with its own plan and checklist:

1. [#35](#old-35) create, list and delete rooms on a dashboard (`feat/35-room-dashboard`)
2. [#36](#old-36) share rooms with a secret invite link (`feat/36-invite-link`)
3. [#37](#old-37) landing page, responsive layout and error states (`feat/37-landing-polish`)
4. [#38](#old-38) README with demo GIF, setup and architecture (`chore/38-readme`)

Every acceptance criterion above is mapped to one sub-issue. After [#38](#old-38) merges: confirm the criteria, mark Phase 7 complete in status and CLAUDE.md, and close this issue with the four PRs listed.

Overall order: [#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → **[#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38)** → aqasim81/collaborative-code-editor#1

**Comment, 2026-09-27:**

Phase 7 is complete. Its four issues merged: [#35](#old-35) (room dashboard, PR [#49](#old-49)), [#36](#old-36) (secret invite links, PR [#60](#old-60)), [#37](#old-37) (landing page, responsive layout and error states, PR [#61](#old-61)), and [#38](#old-38) (README with demo GIF, setup and architecture, PR [#65](#old-65)). Closed by PR [#65](#old-65).

<a id="old-11"></a>

## #11 fix(ws-server): build emits a runnable bundle instead of running the server ([#2](#old-2))

*PR · merged · opened 2026-09-25 · closed 2026-09-25 · commit [`d63a663`](https://github.com/aqasim81/collaborative-code-editor/commit/d63a663)*

##### What changed

Closes [#2](#old-2). The ws-server now builds with tsup (`tsup.config.ts`), which outputs `dist/index.js` with the TypeScript-only `@collab-editor/shared` package inlined. I also added a `lint` script, a regression test, and a 10-minute time limit on the CI build job.

##### Why

The old script was `tsc && tsx src/index.ts`. The root tsconfig sets `noEmit: true`, so `tsc` emitted nothing, and `tsx` then **started the server** as part of the build. That only worked because `src/index.ts` is still a stub. Once Phase 4 adds a listener, `pnpm build` and the CI build job would hang, and `start: node dist/index.js` could never work.

##### How it was tested

- The regression test `apps/ws-server/__tests__/build.test.ts` runs the real build (60s timeout), then asserts that `dist/index.js` exists, that Node can parse it (`node --check`), and that it doesn't import `@collab-editor/shared` at runtime.
- The test was committed first and failed against the old script (3/3 failing), then passed after the fix (3/3).
- `pnpm run build` finishes in about 4ms, and `node dist/index.js` exits 0.

- [x] `make verify` passes locally (`VERIFY OK`)
- [x] Invariants in CLAUDE.md still hold (no runtime logic changed)

##### Deliberately left out

- Node version pinning is tracked in [#3](#old-3).
- The shared-bundling check becomes meaningful once Phase 4 ([#7](#old-7)) adds a runtime import from `@collab-editor/shared`. The test already covers that case.

<a id="old-12"></a>

## #12 chore: pin Node 22 ([#3](#old-3))

*PR · merged · opened 2026-09-25 · closed 2026-09-25 · commit [`8c5f9b7`](https://github.com/aqasim81/collaborative-code-editor/commit/8c5f9b7)*

##### What changed

Closes [#3](#old-3). Node 22 is now pinned in `.nvmrc`, and `engines.node` is set to `>=22` in the root `package.json`. CI reads the version from `.nvmrc` (`node-version-file`) instead of hard-coding it, so there's one source of truth. The stack table in CLAUDE.md now lists the runtime.

##### Why

CI ran Node 22, but nothing pinned the local version, so a machine on Node 20 could pass or fail differently from CI.

##### How it was tested

- On Node 22.23.3: `pnpm install --frozen-lockfile` is clean, `make verify` gives `VERIFY OK`, and `pnpm build` succeeds (2/2 tasks).
- On Node 20.19.2: `pnpm install` now warns `Unsupported engine: wanted: {"node":">=22"}`.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (no runtime code changed)

##### Deliberately left out

- `engine-strict` isn't on, so an older Node warns instead of failing. That keeps installs working while machines move to 22.

<a id="old-14"></a>

## #14 docs: close out Phase 1 and fix doc drift ([#4](#old-4))

*PR · merged · opened 2026-09-25 · closed 2026-09-25 · commit [`1bd427c`](https://github.com/aqasim81/collaborative-code-editor/commit/1bd427c)*

##### What changed

Closes [#4](#old-4). This closes out Phase 1 (Monorepo Scaffolding & Quality Infrastructure):

- `docs/changelog.md`: new Phase 1 entry ([#1](#old-1), [#2](#old-2), [#3](#old-3), protected paths). The Phase 0 entry now says lefthook + gitleaks instead of Husky, and 2 CI jobs (verify → build) instead of 3.
- `docs/status.md`: Phase 1 complete, next is Phase 2 ([#5](#old-5)). Adds the harness check result, the branch-protection blocker ([#13](https://github.com/aqasim81/collaborative-code-editor/issues/1)), and a Local Setup section (`nvm use`, `corepack enable`, `lefthook install`, `make verify`).
- `CLAUDE.md` Status updated.
- `.claude/protected-paths.txt`: `apps/web/components/ui/*` (generated shadcn components) can't be edited by hand.

##### Why

The docs described tooling the repo doesn't use (Husky, lint-staged, 3 CI jobs) and still said Phase 0. The shadcn components are generated, and CLAUDE.md already says never to edit them by hand. The hook now enforces that.

##### How it was tested

Phase 1 acceptance criteria on Node 22.23.3, all exit 0: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build`, `make verify`. CI on `main` is green.

- The gate can fail: a deliberate type error and a failing test each made `make verify` exit 2, and it printed `VERIFY OK` after reverting.
- The protected-path hook blocked a write to `apps/web/components/ui/probe.tsx`.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (docs and harness config only)

##### Deliberately left out

- The local plan files ((internal note), gitignored) were updated alongside this PR: Phase 1 is ticked and the Husky/lint-staged references are replaced with lefthook.
- `main` branch protection is tracked separately in aqasim81/collaborative-code-editor#1.

<a id="old-15"></a>

## #15 feat(web): database schema and GitHub auth ([#5](#old-5))

*PR · merged · opened 2026-09-25 · closed 2026-09-25 · commit [`5767405`](https://github.com/aqasim81/collaborative-code-editor/commit/5767405)*

##### What changed

This PR sets up the database and sign-in for Phase 2:
- **Schema:** Prisma models User, Account, Session, Room and RoomMember, plus the `init` migration.
- **Sign-in:** Auth.js v5 with GitHub OAuth and JWT sessions.
- **Protected routes:** middleware guards `/dashboard/*` and `/room/*`.
- **UI:** a sign-in page, and a navbar that shows who is signed in.
- **Env validation:** Zod checks when `next.config.ts` loads, so a missing variable fails the build.
- **Local dev:** Postgres 16 runs from `docker-compose.yml` on host port 5434.

Closes [#5](#old-5) · (internal notes) ADR `docs/adr/0001-jwt-sessions-for-ws-auth.md`

##### Why

Every later phase needs a signed-in user and stored room metadata. JWT sessions let the WS server (Phase 4) check who a user is without touching the database. Room access will come from membership rows in `RoomMember`, per Invariant 2. The ADR covers the trade-offs: tokens are encrypted JWE, and they can't be revoked server-side.

##### How it was tested

- `make verify` passes: `VERIFY OK`, 60 web tests, 100% statements/branches/functions/lines on `lib/`, `actions/` and `components/`.
- `prisma migrate dev --name init` ran against the Compose database, and `prisma migrate status` reports the schema is up to date.
- `next build` with `AUTH_SECRET` unset fails with `Invalid environment variables: AUTH_SECRET: Required`. With a full env, the build succeeds.
- Dev server, signed out: `/dashboard` and `/room/abc` return 307 to `/sign-in?callbackUrl=…`. The sign-in page renders, with Tailwind styles applied.
- Clicking "Continue with GitHub" reaches GitHub's authorize page with `redirect_uri=http://localhost:3000/api/auth/callback/github` and PKCE.
- The invariant-auditor found no violations. It did find a latent open redirect: `http://host//evil.com` passed the callback guard as `//evil.com`. That's fixed, with the regression test committed first. I also took two of its hardening suggestions:
  - a test that fails if a client component imports `lib/env`, `lib/auth` or `lib/prisma`
  - a session check inside the dashboard page itself
- code-simplifier: no changes suggested.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run)

**End to end with a real GitHub OAuth App:**
- The first sign-in failed with `unexpected "iss" (issuer) response parameter value`. GitHub now sends `iss=https://github.com/login/oauth` on the callback, but the Auth.js GitHub provider has no issuer set. The provider now declares it; the regression test is committed first.
- After the fix, sign-in lands on `/dashboard`, and the navbar shows the avatar and name.
- The database has 1 `User`, 1 GitHub `Account` and 0 `Session` rows, which is expected with JWT sessions.
- Sign-out returns to `/` with "Sign in" shown again.

**CI:** the Build job first failed with `Invalid environment variables: DATABASE_URL: Required …`. Turbo 2's strict env mode hid the job's env vars from `next build`. They are now declared on the `build` task in `turbo.json`, and Verify and Build both pass.

##### Deliberately left out

- **Room CRUD Server Actions and the dashboard room list:** Phase 7 ([#10](#old-10)). Creating a room there must also write the creator's `OWNER` membership in the same transaction.
- **Membership checks on `/room/[id]` and in the WS server:** Phase 4/7. Right now middleware only checks that the user is signed in; it doesn't check the room.
- **How the browser hands the session token to the WS server:** Phase 4 ([#7](#old-7)). The cookie is `httpOnly` and cross-origin; ADR 0001 lists the options.
- **Not using the `server-only` package:** `next.config.ts` imports `lib/env` in plain Node, where `server-only` throws. The client-boundary test guards Invariant 6 instead.
- **Database seed:** nothing needs seed data yet.

<a id="old-16"></a>

## #16 test: client-boundary check misses relative and transitive server imports

*Issue · closed · opened 2026-09-25 · closed 2026-09-26 · labels: enhancement*

##### Problem
`apps/web/__tests__/invariants/client-boundary.test.ts` guards Invariant 6, but it has two blind spots:

- It only matches `@/lib/...` import specifiers. A relative import such as `../../lib/env` from a client component isn't caught.
- It only inspects files that start with `"use client"`. A module without the directive becomes client code when a client component imports it (for example `components/editor/toolbar.tsx` via `room-editor.tsx`). A server-only import there isn't caught.

Found during the invariant audit for [#6](#old-6). No violation exists today.

##### Proposed fix
- Resolve relative specifiers before comparing them against the server-only list.
- Walk the import graph from each `"use client"` entry point and check every module it reaches.

##### Done when
- [ ] The test fails for a relative server-only import in a client component.
- [ ] The test fails for a server-only import in a directive-less module that a client component imports.
- [ ] `make verify` prints `VERIFY OK`.

<a id="old-17"></a>

## #17 feat(web): editor UI with CodeMirror 6 ([#6](#old-6))

*PR · merged · opened 2026-09-25 · closed 2026-09-25 · commit [`cec19bc`](https://github.com/aqasim81/collaborative-code-editor/commit/cec19bc)*

##### What changed

`/room/[id]` now shows a full-height CodeMirror 6 editor for members of the room. A toolbar selector switches highlighting between 10 languages. A dev seed creates a room to open.

Closes [#6](#old-6) · (internal notes) 

##### Why

Phase 3 of the roadmap. The room page is the surface the Yjs binding (Phase 5) plugs into. Per Invariant 2, only a `RoomMember` row grants access: the page 404s for a room that doesn't exist and for a room the user isn't a member of.

##### How it was tested

- `make verify` prints `VERIFY OK`: 87 web tests, coverage 98.8% lines. `pnpm build` exits 0.
- New tests:
  - Every language id loads the expected CodeMirror grammar (C uses the C++ grammar).
  - The selector lists all 10 languages and reports changes.
  - The editor mounts once, swaps grammars in place without losing text, ignores stale loads and cleans up on unmount.
  - `findRoomForMember` filters by membership.
  - The room page redirects when signed out, 404s for non-members and renders for members.
- Checked in a browser, signed in, on `/room/seed-room`:
  - The editor fills the viewport below the navbar at 1200×698 and 700×500, with no page scroll.
  - JS → Python → JSON changes the token colours.
  - Cmd+A, Cmd+Z, Cmd+Shift+Z and Cmd+F (search panel) work.
- A room without membership and an unknown room both return HTTP 404. Signed out, the page redirects to sign-in.
- `db:seed` run twice gives the same result.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run: no violations)

##### Deliberately left out

- Saving the selected language to the room: Phase 7 room settings.
- Real-time sync and document persistence: Phases 4 and 5.
- A gap in the client-boundary invariant test (relative and transitive imports), found during the audit and filed as [#16](#old-16).

<a id="old-18"></a>

## #18 feat(ws-server): close sockets when the room ticket expires or membership is revoked

*Issue · closed · opened 2026-09-25 · closed 2026-09-26 · labels: enhancement*

##### Problem
The WS server checks the room ticket only on upgrade ([#7](#old-7)). A socket stays connected after the ticket's `exp` passes or after the user is removed from the room, until it closes.

##### Proposed outcome
Bound the lifetime of an authenticated socket, e.g. close sockets at ticket expiry with a code that makes the client fetch a fresh ticket and reconnect, or push membership removals to the WS server.

##### Notes
Found by the invariant audit of [#7](#old-7) (Invariant 2). Not a violation of the agreed design (ADR 0001 addendum), but a gap worth closing before production.

<a id="old-19"></a>

## #19 chore(ws-server): rate-limit upgrade attempts and keep tickets out of proxy logs

*Issue · closed · opened 2026-09-25 · closed 2026-09-26 · labels: enhancement*

##### Problem
- Upgrade attempts are not rate-limited: each one costs an HMAC verification (no database call).
- The room ticket travels in the query string (`/<roomId>?ticket=`), where reverse proxies may log it. It lives at most 5 minutes and is bound to one room.

##### Proposed outcome
- Per-IP rate limiting of upgrade attempts on the WS server.
- Decide whether to move the ticket to the `Sec-WebSocket-Protocol` header or a first message, or accept the query string and document log scrubbing for the deployment (Phase 7).

##### Notes
Found by the invariant audit of [#7](#old-7) (Invariant 1).

<a id="old-20"></a>

## #20 feat(ws-server): WebSocket server with room-ticket auth ([#7](#old-7))

*PR · merged · opened 2026-09-25 · closed 2026-09-25 · commit [`a8a2831`](https://github.com/aqasim81/collaborative-code-editor/commit/a8a2831)*

##### What changed

The WS server now has authenticated rooms. Each connection must present a short-lived room ticket, issued by the web app only to members of the room. The server also validates and rate-limits messages, exposes `GET /health` and shuts down gracefully.

Closes [#7](#old-7) · (internal notes) (local) · ADR 0001 addendum

##### Why

Phase 4. Invariants 1 and 2 require that no connection joins a room without a valid, unexpired credential for that room.

The Auth.js session cookie can't do this job: it is an `httpOnly` JWE on another origin, and it carries no membership. So the web action `getRoomTicket(roomId)` checks `RoomMember` and signs a 5-minute HS256 ticket `{ sub, aud, name, roomId, iat, exp }` with the new `WS_TICKET_SECRET`. The WS server verifies the ticket on upgrade and never touches Postgres. See the addendum in `docs/adr/0001-jwt-sessions-for-ws-auth.md`.

What's in it:
- **`apps/ws-server`**
  - `ws` + pino server on `WS_SERVER_PORT`, with a Zod-validated env.
  - Upgrades to `/<roomId>?ticket=` (the y-websocket URL shape). A missing, forged, wrong-audience, expired, over-long or wrong-room ticket gets `401`, and so does a malformed room id or an unparseable request target.
  - Room manager: a room is created on first join, tracks its clients, and is destroyed after `ROOM_GRACE_PERIOD_MS` (default 30 s).
  - Messages:
    - text frames are Zod-validated;
    - binary frames are reserved for Yjs ([#8](#old-8)) and rejected for now;
    - frames are capped at 1 MiB;
    - a per-socket token bucket closes a flooding socket with 1008.
  - `GET /health` returns `{ status, rooms, connections }`.
  - SIGINT/SIGTERM close every socket with 1001 (terminated after 5 s) and stop the server.
  - The dev script loads `apps/web/.env`, so both apps share one secret.
- **`apps/web`**: `lib/ws-ticket.ts`, `actions/room-ticket.ts`, `WS_TICKET_SECRET` in `lib/env.ts`, and `jose` as a dependency.
- **`packages/shared`**: `ClientMessage`, `ServerMessage`, `RoomTicketClaims`, and the TTL and audience constants.
- **Env plumbing**: `.env.example`, turbo build env, CI build placeholders and the vitest placeholders.

##### How it was tested

- [x] `make verify` passes locally (`VERIFY OK`; ws-server has 58 tests at 95.9% line coverage, web has 99 tests).
- [x] Invariants in CLAUDE.md still hold. I ran the invariant-auditor, and its findings are fixed in this branch:
  - a malformed request line crashed the process;
  - an upgrade could finish after shutdown had started;
  - tickets had no audience.
- Tests cover every case in the brief:
  - no ticket, another room's ticket and an expired ticket each get 401;
  - a valid ticket joins the room;
  - two clients in the same room are both tracked;
  - a disconnect removes the client;
  - an empty room is destroyed after the grace period (fake timers);
  - an invalid message is rejected;
  - a flood is rate-limited;
  - graceful shutdown closes every connection;
  - SIGINT and SIGTERM wiring works.
- Checked by hand:
  - `pnpm --filter @collab-editor/ws-server dev` then `curl localhost:8080/health` returns `{"status":"ok","rooms":0,"connections":0}`;
  - a ticketless upgrade gets 401;
  - SIGTERM logs `shutdown complete`.
- `pnpm build` exits 0 with a placeholder `WS_TICKET_SECRET`.

##### Deliberately left out

- Yjs sync, awareness and LevelDB persistence, and fetching the ticket from the browser: [#8](#old-8).
- Closing live sockets at ticket expiry or when membership is revoked: [#18](#old-18).
- Rate-limiting upgrade attempts, and keeping the ticket out of proxy logs: [#19](#old-19).

<a id="old-21"></a>

## #21 test: client-boundary check misses server-only modules imported indirectly

*Issue · closed · opened 2026-09-25 · closed 2026-09-26 · labels: enhancement*

The invariant test `apps/web/__tests__/invariants/client-boundary.test.ts` (Invariant 6) only scans direct imports of files marked `"use client"`. A server-only import added to a module without a directive that a client component imports (e.g. `lib/yjs/provider.ts`, imported by `components/room/room-provider.tsx`) would not be caught.

Fix: follow the import graph from each client component, or mark server-only modules with the `server-only` package so the bundler fails.

Found by the invariant audit for [#8](#old-8).

<a id="old-22"></a>

## #22 feat(ws-server): rate-limit inbound bytes, not only messages

*Issue · closed · opened 2026-09-25 · closed 2026-09-26 · labels: enhancement*

The per-connection token bucket counts messages (100 burst, 50/s) while frames may be up to 8 MiB (raised in [#8](#old-8) for large documents). A member could push up to ~400 MiB/s through validation and `Y.applyUpdate`.

Proposal: add a byte budget per connection (e.g. a second token bucket over bytes) and close with 1008 when it is exceeded, keeping enough headroom for a first sync of a 10K-line document.

Found by the invariant audit for [#8](#old-8) (Invariant 1).

<a id="old-23"></a>

## #23 feat(collab): real-time collaboration with Yjs and LevelDB persistence ([#8](#old-8))

*PR · merged · opened 2026-09-25 · closed 2026-09-26 · commit [`7de93b4`](https://github.com/aqasim81/collaborative-code-editor/commit/7de93b4)*

##### What changed

The room editor is now bound to a shared Yjs document that syncs through the WS server, and every update is persisted to LevelDB before it is broadcast. Closes [#8](#old-8) · (internal notes) (local) · ADR 0002

- **ws-server:** implements the y-websocket protocol on `y-protocols`:
  - binary frames are validated in full before use; a bad frame closes the connection with 1003;
  - each room keeps its own `Y.Doc` and `Awareness`;
  - each update is appended to the store, then broadcast; sync step 2 replies wait behind pending writes;
  - a storage failure closes the room with 1011 and evicts it;
  - awareness lives only in memory, is capped and checked for ownership, and is cleared when a client disconnects;
  - LevelDB store at `WS_PERSISTENCE_DIR` (default `.leveldb`); shutdown waits for pending writes;
  - frame cap raised to 8 MiB.
- **web:**
  - `connectRoom` wraps `WebsocketProvider` with BroadcastChannel disabled; it fetches a ticket before connecting and a new one before a reconnect when the current ticket is about to expire;
  - `RoomProvider` provides the room's context; the editor uses `yCollab` with `Y.UndoManager`;
  - an error banner shows when a ticket is refused.

##### Why

Phase 5 needs real-time collaboration with persistence. `y-websocket`'s bundled server broadcasts before it persists (Invariant 4) and cannot validate a frame before applying it (Invariant 1). ADR 0002 records the decision to implement our own server.

##### How it was tested

- `make verify` → `VERIFY OK` (ws-server 104 tests, 96% statements; web 114 tests, 98.7% statements); `pnpm build` exits 0.
- ws-server tests, using real `y-websocket` clients:
  - concurrent inserts at the same position converge, both between plain Y.Docs and through the server;
  - an update is stored before it is broadcast, and sync replies wait for pending writes;
  - a room is restored from LevelDB after a restart;
  - clients converge after a disconnect and reconnect;
  - a 10K-line document syncs;
  - an edit arrives in under 200 ms;
  - awareness is cleared on disconnect and never stored;
  - an attempt to spoof another client's presence is rejected;
  - a load that fails or throws fails the room;
  - binary frames are rate-limited.
- Browser (Playwright, two tabs on `/room/seed-room`):
  - text typed in tab A appears in tab B;
  - after edits in both tabs while the WS server was down, both converge on restart;
  - after all clients left and the server restarted, reopening the room restored the content from LevelDB;
  - Cmd+Z and Cmd+Shift+Z still work.
- The `invariant-auditor` found two problems, both fixed on this branch: awareness ownership, and an unhandled exception during load. `verify-app` passed; `code-simplifier` found nothing to change.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- Remote cursors, the presence list and the connection status indicator (Phase 6, [#9](#old-9)).
- A byte-based rate limit ([#22](#old-22)), and indirect imports in the client-boundary test ([#21](#old-21)).
- Syncing the language selection between clients.

<a id="old-24"></a>

## #24 test: client-boundary check misses server-only packages and server-to-client props

*Issue · closed · opened 2026-09-26 · closed 2026-09-26 · labels: enhancement*

The Invariant 6 test (`apps/web/__tests__/invariants/client-boundary.test.ts`) now walks the client import graph ([#16](#old-16), [#21](#old-21)), but two leak paths are still outside what it checks:

- **Server-only packages imported directly by client code.** Package imports are not followed, so a client module that imports `@prisma/client` (as a value), `@auth/prisma-adapter`, the `next-auth` server entry, or `jose`'s `SignJWT` would pass.
- **Secrets passed as props from a Server Component to a Client Component.** Today only `NEXT_PUBLIC_WS_URL` (`app/room/[id]/page.tsx`) and a `{ id, name, image }` session user (`app/layout.tsx`) cross the boundary, but no test guards this.

Found by the invariant audit for [#16](#old-16)/#21. No violation exists today.

##### Proposed fix
- Add a denylist of server-only packages to the graph walk.
- Add a test that renders `RoomPage` and asserts the only environment value passed to `RoomEditor` is `NEXT_PUBLIC_WS_URL`.

##### Done when
- [ ] The walk flags a client module importing a denylisted package.
- [ ] A test fails if a Server Component passes a non-public value to a client component.
- [ ] `make verify` prints `VERIFY OK`.

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `chore/24-client-boundary-gaps` · Order: 3 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **Package denylist**: The import-graph walk flags server-only packages imported by client code.
2. **Props guard**: A test fails when a Server Component passes a non-public value to a client component.

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

<a id="old-25"></a>

## #25 test(web): walk the client import graph in the boundary check ([#16](#old-16), [#21](#old-21))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`a7d03ea`](https://github.com/aqasim81/collaborative-code-editor/commit/a7d03ea)*

##### What changed

The Invariant 6 client-boundary test now walks the import graph from every `"use client"` module, resolving `./`, `../` and `@/` specifiers, and fails if any reached module is server-only. Violations are reported as the import chain from the entry point.

Closes [#16](#old-16)
Closes [#21](#old-21)

Artifacts: (internal notes) (local, gitignored)

##### Why

The old test only matched `@/lib/...` specifiers in files that start with `"use client"`. A relative import (`../../lib/env`), or a server-only import in a directive-less module that a client component imports (`components/editor/toolbar.tsx`, `lib/yjs/provider.ts`), would have reached the client bundle unnoticed.

##### How it was tested

- Fixture cases (in-memory graphs) fail as expected for:
  - an `@/` server-only import;
  - a relative server-only import in a client component ([#16](#old-16));
  - a server-only import in a directive-less module a client component imports ([#16](#old-16), [#21](#old-21));
  - a transitive chain through a re-export ([#21](#old-21));
  - `import "server-only"` combined with a dynamic `import()`;
  - a direct non-public env read, a `.js` specifier and an unresolved local import.
- Negative case: type-only imports and the imports of a `"use server"` module are not followed.
- The real codebase passes. A reachability assertion confirms that `toolbar.tsx` and `lib/yjs/provider.ts` are in the client graph.
- Injecting `import { env } from "../../lib/env"` into `components/editor/toolbar.tsx` made the real-codebase test fail with `components/editor/room-editor.tsx -> components/editor/toolbar.tsx -> lib/env.ts`. The change was reverted.
- `pnpm build` exits 0 with CI placeholder values.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run: no violations; its hardening suggestions were applied)

##### Deliberately left out

- Server-only packages imported directly by client code, and secrets passed as props from Server to Client Components. Both are tracked in [#24](#old-24).
- Adding the `server-only` package to server modules. The graph walk covers this without it.

<a id="old-26"></a>

## #26 feat(ws-server): per-connection byte budget ([#22](#old-22))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`654ae09`](https://github.com/aqasim81/collaborative-code-editor/commit/654ae09)*

##### What changed

Each WS connection now has a byte token bucket next to the message bucket; a connection that exceeds it is closed with 1008 (`byte budget exceeded`) before the frame is parsed.

Closes [#22](#old-22) · (internal notes) 

##### Why

The message bucket (100 burst, 50/s) combined with the 8 MiB frame cap let a member push up to ~400 MiB/s through validation and `Y.applyUpdate` (invariant audit for [#8](#old-8), Invariant 1).

The byte budget is 16 MiB burst (two maximum-size frames) refilled at 1 MiB/s: a fresh connection can upload a whole large document in its first sync and keep editing, while a flood is capped at ~1 MiB/s. The limits are named constants in `apps/ws-server/src/rate-limit.ts` with the headroom explained; `ServerOptions.byteRateLimit` overrides them in tests. `tryConsume` takes an optional cost so one token-bucket implementation serves both budgets.

##### How it was tested

- Unit: cost-based consumption and refill; a single cost above capacity is refused.
- Server: 40 x 1 MiB valid sync frames (under the message budget) are closed with 1008 under the default limits.
- Server: a frame sent right after the closing one is not applied (invariant-audit finding); a byte budget below the frame cap is refused at start.
- Collaboration: a fresh connection whose first sync uploads a 10K-line (>1 MB encoded, typed line by line) document stays open; a follow-up edit is applied and persisted.
- The new tests were committed first and failed before the implementation.
- `make verify` -> VERIFY OK; `pnpm build` exits 0.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- Ticket expiry on open sockets ([#18](#old-18)) and upgrade-attempt rate limiting / ticket header ([#19](#old-19)): separate issues.

<a id="old-27"></a>

## #27 feat(web): retry a room ticket fetch that fails transiently

*Issue · closed · opened 2026-09-26 · closed 2026-09-26 · labels: enhancement*

##### Problem
`connectRoom` (apps/web/lib/yjs/provider.ts) stays down after any failed ticket fetch. Since [#18](#old-18) every client refetches about every 5 minutes, so a brief network drop or server restart at that moment leaves the room disconnected until reload (local edits are kept in the Y.Doc but don't sync).

##### Proposed outcome
Retry with backoff after a thrown or transient failure; stay down only on a real refusal (not signed in, not a member).

##### Notes
Found by the invariant audit of [#18](#old-18) (Invariant 3 risk).

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `feat/27-ticket-fetch-retry` · Order: 2 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **Retry transient ticket failures**: Thrown ticket fetches retry with capped, jittered backoff; refusals stay final
2. **Docs and PR**: Record the retry behaviour in the living docs, audit, verify and open the PR

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Open decisions (defaults assumed unless the owner says otherwise)
- Retries never stop while the page is open. Transient failures only turn the status red; they never show the "Could not join this room" alert.
- Anything thrown counts as transient; `success: false` counts as a real refusal (true of `getRoomTicket` today).

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

<a id="old-28"></a>

## #28 fix(ws-server): drop a peer's presence immediately when the server closes its socket

*Issue · closed · opened 2026-09-26 · closed 2026-09-26 · labels: enhancement*

##### Problem
When the server closes a socket (1003, 1008, 4001 ticket expired), the peer is removed only on the `close` event. A client that never answers the close handshake keeps its presence visible to others for up to 30 s (the `ws` close timeout). No document data flows in that window.

##### Proposed outcome
Terminate after a short timeout (as shutdown does) or remove the peer from the room at once when the server initiates the close.

##### Notes
Found by the invariant audit of [#18](#old-18) (Invariant 5).

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `fix/28-drop-presence-on-close` · Order: 1 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **Failing regression tests**: Prove presence and the socket linger after a server-initiated close that the client never acknowledges
2. **Drop presence and terminate on server close**: Every server-initiated close clears the peer's presence at once and terminates the socket after `closeTimeoutMs`

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Open decisions (defaults assumed unless the owner says otherwise)
- `shutdownTimeoutMs` is folded into one `closeTimeoutMs` (5 s) used for shutdown and every server-initiated close. The alternative is two separate options.

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

<a id="old-29"></a>

## #29 feat(ws-server): close sockets when the room ticket expires ([#18](#old-18))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`88b7190`](https://github.com/aqasim81/collaborative-code-editor/commit/88b7190)*

##### What changed

The WS server closes each socket with `4001 ticket expired` when its room ticket's `exp` passes, and the web provider answers that code by fetching a fresh ticket and reconnecting, keeping the Y.Doc so no edit is lost. The expiry delay is capped at the ticket TTL (issuer clock skew), and a ticket fetch that throws is reported instead of stalling silently.

Closes [#18](#old-18) · (internal notes) (local)

##### Why

The ticket was checked only on upgrade, so a socket outlived its ticket and a member removed from the room kept a live connection. Now a removed member is refused the fresh ticket and loses access within one ticket lifetime (at most 5 minutes). Revocation is deliberately not pushed to the WS server (ADR 0001 addendum).

##### How it was tested

- WS server, fake timers: closed with 4001 at `exp`; still open (and answering) before it; closed at `exp` for a ticket expiring a second after the upgrade; no expiry timer left after a normal disconnect (mutation-checked: removing `clearTimeout` fails the test).
- WS server: a ticket from an issuer clock 100 s ahead is still closed after 300 s.
- Web provider: on a 4001 close it fetches a fresh ticket and reconnects with it even when the last ticket still looked fresh; an edit made while disconnected is carried in the sync step 2 reply to the server; a throwing ticket fetch is reported; a refused fresh ticket is reported and the connection stays down.
- End to end (throwaway script, not committed): real server with LevelDB, real provider over `ws`, 2-second tickets; two forced expiries (both 4001), edits made while disconnected reached the server and were restored after a restart. - `pnpm build` exits 0 with CI placeholder values; verify-app started the built WS server and `/health` answered.
- A browser check was skipped: it needs a GitHub OAuth sign-in with local credentials.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- Pushing membership revocation from the web app to the WS server (owner decision).
- Retrying a transiently failed ticket fetch ([#27](#old-27)) and dropping presence immediately on a server-initiated close ([#28](#old-28)), both found by the invariant audit.
- Ticket transport in the subprotocol header and upgrade rate limiting ([#19](#old-19)).

<a id="old-30"></a>

## #30 feat(ws-server): trusted-proxy setting for the upgrade rate limit

*Issue · closed · opened 2026-09-26 · closed 2026-09-27 · labels: enhancement*

##### Problem
The WS server's per-IP upgrade limit ([#19](#old-19)) keys on the socket's remote address and ignores `X-Forwarded-For`. Behind a reverse proxy or load balancer (Phase 7 deployment), every client shares the proxy's address, so all users share one bucket (30 burst, 1/s).

##### Proposed outcome
- An explicit trusted-proxy setting (with a safe default of "none") on the WS server; only when the peer is a trusted proxy is the client address taken from `X-Forwarded-For` (rightmost untrusted hop).
- Tests for trusted and untrusted peers.

##### Notes
Found while implementing [#19](#old-19); see the ADR 0001 addendum for [#19](#old-19). Needed before deploying the WS server behind a proxy.

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `feat/30-trusted-proxy` · Order: 4 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **Trusted-proxy parsing and client address**: `client-address.ts` and `WS_TRUSTED_PROXIES` in the env schema, fully unit-tested, not yet wired
2. **Wire into the upgrade limit**: The upgrade bucket is keyed by the forwarded client address only when the socket peer is a trusted proxy
3. **ADR addendum and docs**: Record the trusted-proxy decision and the deployment setting; audit, verify and open the PR

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Open decisions (defaults assumed unless the owner says otherwise)
- `0.0.0.0/0` and `::/0` are refused. `X-Forwarded-For` entries with a port fall back to the proxy's shared bucket. If the Phase 7 load balancer appends ports, parse them.

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

<a id="old-31"></a>

## #31 feat(ws-server): ticket in Sec-WebSocket-Protocol and per-IP upgrade limit ([#19](#old-19))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`0acc3e7`](https://github.com/aqasim81/collaborative-code-editor/commit/0acc3e7)*

##### What changed

The room ticket moves from `?ticket=` to `Sec-WebSocket-Protocol`: the client offers `collab.v1` and `ticket.<jwt>` (`roomTicketProtocols` in `@collab-editor/shared`), the server reads the ticket only from that header, and the handshake response selects `collab.v1` and never echoes the ticket. The query string is no longer accepted. Every upgrade attempt first takes a token from a per-IP bucket (burst 30, 1/s, IPv6 per /64, up to 10,000 addresses kept, least recently used dropped first). An empty bucket gets `429` before any parsing or ticket verification.

Closes [#19](#old-19) · (internal notes) (local)

##### Why

Reverse proxies log request lines, so a ticket in the URL could end up in logs and be replayed against its room for up to 5 minutes. Upgrade attempts were also unlimited, and each one cost an HMAC verification. The owner's decisions are recorded in the ADR 0001 addendum for [#19](#old-19).

##### How it was tested

- WS server: a ticket in the header joins and `ws.protocol` is `collab.v1`. The raw handshake response contains `Sec-WebSocket-Protocol: collab.v1` and never the ticket. These all get `401`: missing, invalid, forged, expired and other-room tickets, a ticket without `collab.v1`, two tickets, and a ticket only in the URL. The ticket never appears in the server logs, whether the connection is accepted or rejected.
- Upgrade limit: 3 accepted, then a flood of 10 gets `429` with no further ticket verifications (the verifier is spied on). Bad tickets count toward the limit. A spoofed `X-Forwarded-For` does not get a new bucket.
- Keyed limiter: separate buckets per key; refilled buckets are dropped when the table is full; LRU eviction; IPv4, IPv4-mapped and IPv6 /64 keys.
- Web provider: the socket URL has no query string and offers `roomTicketProtocols(ticket)`, including after a ticket refresh and a `4001` reconnect.
- Browser (Playwright, throwaway `AUTH_SECRET`/`WS_TICKET_SECRET` in the shell with a minted session cookie): two tabs on `/room/seed-room` both connect to `ws://localhost:8080/seed-room` with no query string, and edits sync in both directions.
- `pnpm build` exits 0 with CI placeholder values.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- A trusted-proxy setting so the limit can key on `X-Forwarded-For` behind a reverse proxy ([#30](#old-30), needed for Phase 7 deployment).
- Per-user or global upgrade limits.

<a id="old-32"></a>

## #32 fix(ws-server): awareness ownership, spoofing and presence caps

*Issue · closed · opened 2026-09-26 · closed 2026-09-26 · labels: bug*

##### Problem
The WS server's awareness relay (`apps/ws-server/src/sync/sync-room.ts`) has four gaps, found while planning [#9](#old-9):

1. **Ownership lost on reconnect (Invariant 5).** Only `added` ids are recorded as a connection's own. A client that reconnects with the same clientID (every ticket refresh, [#18](#old-18), and every network blip) resends its state at the same clock, which the server ignores; the next renew is applied as `updated`, so the new connection never controls its id. Presence is invisible for up to 15 s after the reconnect, is not cleared when that connection closes (ghost until the 30 s timeout), and other peers can overwrite it.
2. **Same-clock null removes another peer's presence.** y-protocols applies `null` at an equal clock as a removal; `changesOthersPresence` only rejects newer clocks.
3. **No cap on presences per connection.** One socket can register any number of client ids, each broadcast to every peer.
4. **Presence identity is self-reported (Invariant 1).** A member can show up under another user's name or avatar; the server never checks awareness `user` against the ticket.

##### Fix
Track `added` and `updated` ids for the origin peer and release removed ids from every peer (including timeout removals); the client bumps its awareness clock on each connect; reject same-clock nulls for others' ids; one client id per connection; the server rewrites `user` from the ticket claims.

Fixed together with [#9](#old-9).

<a id="old-33"></a>

## #33 fix(ws-server): detect dead connections with a ping heartbeat

*Issue · closed · opened 2026-09-26 · closed 2026-09-26 · labels: bug*

##### Problem
The WS server never pings its clients. A connection that dies without a close frame (laptop sleep, Wi-Fi drop, killed process) stays open on the server until its ticket expires (up to 5 minutes, [#18](#old-18)): it keeps a room slot and counts as a connection in `/health`. It also still owns its awareness client id, so the same client coming back on a new socket can be refused as if it were another connection's presence.

##### Fix
Ping every connection on an interval; terminate one that hasn't answered the previous ping. Found while implementing [#9](#old-9); fixed in the same PR.

<a id="old-34"></a>

## #34 feat(presence): cursors, presence list and connection status ([#9](#old-9))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`279d335`](https://github.com/aqasim81/collaborative-code-editor/commit/279d335)*

##### What changed

Phase 6: remote carets and selections in each user's colour, name labels that show for 3 s after a caret moves, a presence sidebar (one entry per user, with avatar or initials), and a Connecting / Connected / Reconnecting / Disconnected indicator. The WS server now owns presence identity and ownership, and drops dead connections.

Closes [#9](#old-9) · Closes [#32](#old-32) · Closes [#33](#old-33) · (internal notes) ADR 0002 addendum

##### Why

- **[#9](#old-9):** collaborators couldn't see each other, and a dropped connection went unnoticed.
- **[#32](#old-32):** the awareness relay trusted clients. A reconnecting client lost ownership of its own presence, so it was left as a ghost on disconnect (Invariant 5). Any member could also appear as anyone, remove others' presence, or register unlimited presences (Invariant 1).
  - The server now rewrites `user` from the ticket, binds each connection to one client id and each id to its user, and drops (rather than punishes) entries that break these rules, since honest clients send some of them.
  - An id held by another user gets `4002`, and the client moves to a new id.
- **[#33](#old-33):** half-open sockets held their room slot and presence until the ticket expired. A 30 s ping now terminates them.

##### How it was tested

- [x] `make verify` passes locally (VERIFY OK; ws-server 155 tests, 97% lines; web 162 tests, 97% lines)
- [x] Invariants in CLAUDE.md still hold: invariant-auditor ran three rounds. Its findings (id hijack during reconnect, false-positive closes on timeout echoes, metadata growth, eviction pressure, bindings lost on room teardown or restart, exact-clock squat) each got a failing test first and then a fix.
- `pnpm build` exits 0.
- **ws-server tests:**
  - Presence reappears after a reconnect and is cleared when the socket drops abruptly (end to end).
  - Spoofed identity is replaced by the ticket's.
  - One id per connection; same-user takeover.
  - Id bindings survive churn, room teardown and exact-clock squats.
  - Heartbeat terminates a silent socket and keeps a live one.
- **Web tests:**
  - Colour stability and spread.
  - Presence list ordering and deduplication.
  - Cursor-label timing and position.
  - Caret and selection colours.
  - Status mapping, including no red during a ticket refresh.
  - Clock bump on reconnect; new id on `4002`.
- Also fixed a flaky ticket-expiry test that assumed at least 1 s remained before `exp`.
- **Browser check, two windows on `/room/seed-room`:**
  - Carets, selections and labels follow every move; labels hide after 3 s, and on line 1 they sit below the caret.
  - The status goes green → yellow → red with the WS server killed, then green again when it returns, with no reload.
  - A closed window's caret disappears for the other window.
  - It found two label bugs, fixed here with tests: a label lost when CodeMirror reused the widget next to y-codemirror's caret, and a label drawn over the text or clipped on line 1.

##### Deliberately left out

- Typing indicators (F19) and following another user's viewport.
- Colours are hashed from the user id, so two users can share one; this is the cost of keeping colours stable across sessions.

<a id="old-35"></a>

## #35 feat(web): create, list and delete rooms on a dashboard

*Issue · closed · opened 2026-09-26 · closed 2026-09-27 · labels: enhancement*

Part of [#10](#old-10) (Phase 7).

##### Goal
Signed-in users can create rooms and see and delete their rooms on a dashboard.

##### Scope
- Server Actions in `apps/web/actions/room.ts`: `createRoom` (name, language; the creator becomes the OWNER member), `listRooms` (rooms the user is a member of, most recently updated first), `deleteRoom` (owner only). Zod `.safeParse()` on every input; Result pattern.
- `apps/web/app/dashboard/page.tsx` (protected) with room cards (name, language, created date, role) and a create-room dialog.
- After sign-in, land on the dashboard; the room page links back to it.
- Deleting a room also deletes its LevelDB document? Decide in the spec (the WS server owns persistence; at minimum, a deleted room can no longer be joined, since tickets need membership).

##### Invariants
2 (room access per member: list and delete are scoped to membership/ownership), 6 (no server-only imports in client components).

##### Acceptance criteria
- [ ] A user can create a room with a name and one of the supported languages, and lands in it
- [ ] The dashboard lists every room the user is a member of, newest activity first
- [ ] Only the owner can delete a room; others get an error, not a silent no-op
- [ ] Invalid input (empty or overlong name, unknown language) is refused with a message

##### Done when
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] `docs/changelog.md`, `docs/status.md` and CLAUDE.md Status updated

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `feat/35-room-dashboard` · Order: 5 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **shadcn setup**: shadcn/ui is initialised with the components the dashboard needs, and existing pages look the same.
2. **Room actions**: `createRoom`, `listRooms` and `deleteRoom` work with validation, membership checks and activity ordering.
3. **Dashboard UI**: The dashboard lists the user's rooms and lets them create rooms and (owners) delete them; the room page links back.
4. **Docs and follow-up**: Docs describe room management, the LevelDB purge is tracked as a follow-up issue, and the flow is checked in a browser.

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Open decisions (defaults assumed unless the owner says otherwise)
- "Newest activity first": `Room.updatedAt` is updated when a ticket is issued (at most once a minute per room), because document edits never reach Postgres.
- Deleting a room's LevelDB document is deferred to a follow-up issue. Once a room is deleted, no new ticket can be issued for it, and ids are never reused.

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

<a id="old-36"></a>

## #36 feat(web): share rooms with a secret invite link

*Issue · closed · opened 2026-09-26 · closed 2026-09-27 · labels: enhancement*

Part of [#10](#old-10) (Phase 7). Decision (owner, 2026-09-27): sharing uses a secret invite link.

##### Goal
An owner can share a room with a link that lets signed-in people join it, without making the room id itself grant access (Invariant 2).

##### Scope
- `Room.inviteToken`: a random, unguessable token (unique), created with the room and backfilled for existing rooms by migration.
- Share button (owner only) copies `/join/<token>` to the clipboard, with a confirmation toast.
- `/join/[token]`: requires sign-in (callback back to the link), adds the user as an EDITOR member if they aren't one, then redirects to the room. An unknown token gets a 404 that says nothing about which rooms exist.
- The owner can reset the token, which invalidates the old link (existing members stay).

##### Invariants
2 (the token grants membership, the room id alone never does), 1 (unchanged: WS access still needs a ticket issued after the membership check).

##### Acceptance criteria
- [ ] Share copies the invite link; a second signed-in user who opens it joins the room as an editor and can edit
- [ ] A non-member opening `/room/<id>` still gets 404
- [ ] Resetting the token makes the old link 404; members keep access
- [ ] Only the owner sees Share and Reset

##### Done when
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] Docs (changelog, status, CLAUDE.md Status, ADR if the token model warrants one) updated

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `feat/36-invite-link` · Order: 6 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **Invite token model**: Every room, new and existing, has a unique random invite token generated and validated in one place.
2. **Join flow**: `/join/<token>` sends signed-out users through sign-in and back, lets them join as EDITOR with one click, and 404s unknown tokens.
3. **Share and reset UI**: The room owner copies the invite link from the toolbar and can reset it; nobody else sees either control.
4. **ADR and docs**: The invite-link model is recorded in ADR 0003, the docs match, and the two-account flow is checked in a browser.

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Open decisions (defaults assumed unless the owner says otherwise)
- Opening an invite link shows a one-click Join form rather than joining on open, so link previews and prefetches can't create memberships.
- Resetting the link keeps existing members. Removing a member is out of scope.

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

<a id="old-37"></a>

## #37 feat(web): landing page, responsive layout and error states

*Issue · closed · opened 2026-09-26 · closed 2026-09-27 · labels: enhancement*

Part of [#10](#old-10) (Phase 7).

##### Goal
The product looks finished: a landing page that explains it, layouts that work on desktop and tablet, and graceful error states.

##### Scope
- Landing page (`apps/web/app/page.tsx`): hero, feature highlights (real-time sync, cursors and presence, persistence), CTA to sign in or go to the dashboard.
- Footer.
- Responsive layout for desktop and tablet (phones: readable, not a goal for editing); the presence sidebar folds away on narrow screens.
- Error states: room not found, WS server unreachable (the connection indicator plus a readable message), ticket refused, sign-in failure; `error.tsx`/`not-found.tsx` where missing.
- No console errors or warnings in the production build (`pnpm build && pnpm start`, checked in a browser).

##### Acceptance criteria
- [ ] Landing page communicates the product and looks polished
- [ ] Desktop and tablet widths work without horizontal scrolling
- [ ] Every error state above shows a clear message and a way forward
- [ ] Production build: no console errors or warnings

##### Done when
- [ ] Tests for the new code; coverage ≥ 80%
- [ ] `make verify` prints `VERIFY OK`
- [ ] Docs updated

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `feat/37-landing-polish` · Order: 7 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **Shell and landing**: A footer and page shell on content pages, a navbar that fits every width, and a polished landing page.
2. **Responsive room**: The room works at desktop and tablet widths: the presence sidebar folds away below `lg` behind a toggle and the toolbar fits.
3. **Error states**: Every error state (room not found, WS unreachable, ticket refused, sign-in failure, unexpected error) shows a clear message and a way forward.
4. **Production check**: A repeatable Playwright check proves the production build logs no console errors or warnings and has no horizontal scroll at desktop and tablet widths; docs updated.

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Open decisions (defaults assumed unless the owner says otherwise)
- The production console and overflow check (Playwright against `pnpm start`) is run by hand, not in CI, until the app is deployed.

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

<a id="old-38"></a>

## #38 docs: README with demo GIF, setup and architecture

*Issue · closed · opened 2026-09-26 · closed 2026-09-27 · labels: enhancement*

Part of [#10](#old-10) (Phase 7). Do last, after the other Phase 7 issues.

##### Goal
A README that shows the project off and gets someone running locally.

##### Scope
- Demo GIF: two windows editing together, carets and presence visible.
- What it is, features, stack, architecture overview (link `docs/architecture.md`, ADRs), invariants in one paragraph.
- Local setup (Node 22, pnpm, Docker Postgres, GitHub OAuth app, env vars from `.env.example`, `make verify`).

##### Acceptance criteria
- [ ] README with demo GIF, setup instructions and architecture overview
- [ ] Setup steps work from a fresh clone

##### Done when
- [ ] `make verify` prints `VERIFY OK`
- [ ] Phase 7 checklist and status updated; [#10](#old-10) can close

**Comment, 2026-09-26:**

##### Implementation plan

Branch: `chore/38-readme` · Order: 8 of 9 (see the order below).

###### Phases
All phases run on the one branch, and each phase ends in a commit. After the last phase: one PR, review, squash merge.

1. **README and licence**: A root README in the (internal note) order, an MIT LICENSE, and a complete setup section grounded in the env schemas.
2. **Demo GIF and fresh-clone check**: Record the two-window demo GIF, prove the README's setup from a fresh clone, and close out the Phase 7 docs.

###### Per-phase loop
1. Plan the phase · 2. Review and improve the plan · 3. Implement with tests · 4. Update or add tests · 5. `/simplify` · 6. `make verify` → `VERIFY OK` · 7. Fix · 8. PR · 9. `/code-review` and fix · 10. Merge (CI green) · 11. Update checklist · 12. Close issue · 13. `/clear`, next issue

###### Open decisions (defaults assumed unless the owner says otherwise)
- The licence would be MIT under the owner's name.
- Which second GitHub account appears in the demo GIF?

###### Order across open issues
[#28](#old-28) → [#27](#old-27) → [#24](#old-24) → [#30](#old-30) → [#35](#old-35) → [#36](#old-36) → [#37](#old-37) → [#38](#old-38) → aqasim81/collaborative-code-editor#1

**Comment, 2026-09-27:**

Progress on `chore/38-readme` (pushed, no PR yet):

**Done (Phase 1, commit `docs: README with setup, architecture and licence`)**
- `README.md` with the 10 sections in (internal note) order: pitch, CI and MIT badges, demo image reference, a 5-command quickstart, features, a Mermaid architecture diagram with the data flow, three key decisions linking ADRs 0001–0003, quality and invariants, setup (OAuth app, every env variable, seed, hooks, Apple Silicon leveldown, production run), status and roadmap, licence.
- `LICENSE` (MIT, 2026, Ahmad Qasim, same text as the other portfolio repos).
- `docs/status.md` Local Setup now points to the README. `.env.example` already listed every variable, so it is unchanged.
- `make verify`: 688 tests (428 web, 260 WS server), VERIFY OK.

**Fresh-clone check (partial).** Cloned the branch into a scratch directory, then ran `nvm use`, `corepack enable`, `pnpm install --frozen-lockfile`, `docker compose up -d` and `db:migrate` exactly as the README gives them. All worked (3 migrations applied). The WS server's `/health` answered OK. The web app served `/` and `/sign-in` (200), redirected `/dashboard` to sign-in, and gave `/nope` a 404. `make verify` in the clone printed VERIFY OK. No README gaps found so far.

**Blocked on the owner.** Two steps need a person with GitHub accounts, and they can't be done from an unattended session:
1. **Demo GIF** (`docs/media/demo.gif`, which the README already references). It needs two Chrome windows signed in as two different GitHub users in one room (join via invite link), recorded with Cmd+Shift+5 and converted with `ffmpeg` + `gifski`. Steps are in (internal note). Target: ≤ 5 MB, 960 px wide.
2. **Signed-in part of the fresh-clone check.** GitHub sign-in, creating a room and opening it in a second window. This needs the real OAuth values in the clone's `apps/web/.env`, and the session is not allowed to read or write real env files.

Once the GIF is committed to the branch, the rest of Phase 2 (docs wrap-up, PR with `Closes [#38](#old-38)` / `Closes [#10](#old-10)`, merge) can resume with `/next-issue`.

<a id="old-39"></a>

## #39 docs(claude-md): refresh commands and architecture

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`e00eb1d`](https://github.com/aqasim81/collaborative-code-editor/commit/e00eb1d)*

##### What changed

CLAUDE.md gains single-test, database and tooling commands and a step-by-step room-join flow (ticket → provider → upgrade → sync room → presence, with close codes). The y-websocket stack row is corrected (client only; the server uses y-protocols + lib0) and the status section now points to `docs/status.md` instead of repeating it. No issue.

##### Why

The file had drifted from the code (ADR 0002) and duplicated `docs/status.md`, and it lacked the commands and cross-file architecture a new session needs first.

##### How it was tested

- The documented single-file test commands run: `sync-room.test.ts` (27 passed), `rooms.test.ts` (2 passed)
- Every referenced path, close code and export checked against the source

- [x] `make verify` passes locally (pre-push hook)
- [x] Invariants in CLAUDE.md still hold (unchanged; docs only)

##### Deliberately left out

Invariants, anti-patterns, conventions, Git workflow and security sections are unchanged.

<a id="old-40"></a>

## #40 fix(ws-server): drop presence at once when the server closes a socket ([#28](#old-28))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`e21bcaf`](https://github.com/aqasim81/collaborative-code-editor/commit/e21bcaf)*

##### What changed

Every close the WS server starts now goes through one `closeConnection` in `onConnection`. It removes the peer's presence at once, sends the close frame and terminates the socket after `closeTimeoutMs` (5 s) if the client never answers. That covers 1003 invalid frame, 1008 rate/byte limit, 4001 ticket expiry, `Peer.close` from the sync room (1011 storage failure, 1003, 4002), and shutdown (1001). `shutdownTimeoutMs` is renamed `closeTimeoutMs`. Closes [#28](#old-28)

##### Why

Presence was only removed on the socket's `close` event. A client that withheld its close answer stayed visible to everyone for `ws`'s own 30 s close timeout, which breaks Invariant 5 (presence cleared when a client disconnects). Found by the invariant audit of [#18](#old-18).

- `sync-room.ts`: `fail()` iterates a copy of `peers`, since closing a peer now removes it; `removePeer` returns early for a peer already gone, since the server removes it when it starts closing and again on `close`.
- Shutdown uses the same per-connection close, so there is one close/terminate mechanism.
- `rooms.leave` stays on `close`: the socket is counted until it is really gone (at most `closeTimeoutMs`).

##### How it was tested

Regression tests committed first (df4fe04), each failing on `main` with "condition not met in time":
- a Y client sends an invalid frame and pauses, so it never answers: its presence is gone for the other client and the server room within 2 s
- storage fails while both clients are paused: neither presence remains in the evicted room
- a raw client that ignores the handshake is terminated after `closeTimeoutMs: 50`

- [x] `make verify` passes locally (`VERIFY OK`; ws-server coverage 97.6% lines, 164 tests; web 166 tests); `pnpm build` exits 0
- [x] Invariants in CLAUDE.md still hold (invariant-auditor: no violations for 1, 3/4, 5)

##### Deliberately left out

- A queued-but-not-yet-applied update from a peer the server is closing is now dropped (it was never broadcast, so Invariant 4 holds; the client resends it on reconnect). No test pins this down.
- No test asserts the close timer is cleared when the client does answer the close; tests were read-only for the fix.
- A client-initiated close that never completes is still bounded only by `ws`'s 30 s timeout (unchanged; the heartbeat covers dead sockets).

<a id="old-41"></a>

## #41 chore: add issue autopilot (/next-issue and issue-loop script)

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`5828682`](https://github.com/aqasim81/collaborative-code-editor/commit/5828682)*

##### Summary
- `/next-issue` command: picks the next open issue from the local issue plan, follows its checklist from start to squash merge with green CI, then stops.
- `scripts/issue-loop.sh`: runs `/next-issue` in a fresh headless session per issue and stops at the first issue that is not closed, merged and green on `main`. Supports `MAX_ISSUES` and `DRY_RUN`.
- `logs/` gitignored; CLAUDE.md commands and `docs/status.md` next steps point to the loop.

##### Test plan
- [x] `bash -n` and `shellcheck` clean
- [x] `DRY_RUN=1 ./scripts/issue-loop.sh` picks [#27](#old-27)
- [x] `make verify` → VERIFY OK

<a id="old-42"></a>

## #42 feat(web): retry a room ticket fetch that fails transiently ([#27](#old-27))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`c7bcf53`](https://github.com/aqasim81/collaborative-code-editor/commit/c7bcf53)*

##### What changed

A room ticket fetch that throws is now retried with jittered backoff (1 s doubling to 30 s) until it succeeds or the room is left. A refused ticket (`success: false`) is still reported and never retried. Closes [#27](#old-27)

##### Why

Since [#18](#old-18) every client refetches its ticket about every 5 minutes. A network drop, redeploy or brief database outage at that moment left the room disconnected until reload, and local edits stopped syncing (Invariant 3 risk). The split is: thrown = transient, returned refusal = final, so `RoomTicketResult` and `getRoomTicket` are unchanged. The ADR 0001 [#18](#old-18) addendum gains one consequence line.

##### How it was tested

- `apps/web/__tests__/lib/yjs/provider.test.ts`: retry on first connect; retry after a `4001` refresh, where an edit made during the outage resyncs; backoff attempts 1, 2, 3; statuses Connecting → Disconnected after 3 failures, then Connected; Reconnecting while a refresh keeps failing; refusals are never retried (first attempt, and after a failed fetch); no retry after `destroy()`, including a rejection that lands after destroy; `ticketRetryDelayMs` doubling, cap and jitter bounds
- `make verify` → `VERIFY OK` (provider.ts 87.5% branches); `pnpm build` exits 0
- invariant-auditor: no violations of Invariants 1, 2, 3 or 6. Its suggested throw-then-refusal test was added
- Not checked in a browser: the Playwright browser was held by another session. The fake-socket tests cover the same flows

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- Retrying at once on the browser `online` event (the 30 s cap bounds the wait); can be a follow-up
- A permanent server fault that throws (e.g. a missing `WS_TICKET_SECRET`) is retried at most once per 30 s per tab and shows red, with no message

**Comment, 2026-09-26:**

Code review: one plausible finding. A ticket fetch that keeps throwing (e.g. a tab kept open across a deploy, whose Server Action id is gone, or a misconfigured `WS_TICKET_SECRET`) is retried forever and only shows the red status, with no message. Kept as is: the issue asks that transient failures don't show the "Could not join this room" alert, and `onError` stays for refusals. This case is already listed under "Deliberately left out". A self-clearing "reload the page" hint is filed as [#43](#old-43).

<a id="old-43"></a>

## #43 feat(web): suggest a reload after prolonged ticket fetch failures

*Issue · closed · opened 2026-09-26 · closed 2026-09-26 · labels: enhancement*

##### Problem
Since [#27](#old-27) a room ticket fetch that throws is retried forever (backoff capped at 30 s) and only the red "Disconnected" status is shown. Some failures repeat on every call: a tab left open across a deploy calls a Server Action id that no longer exists, or `signRoomTicket` fails because `WS_TICKET_SECRET` is misconfigured. The user sees a red light but no hint that a reload would help.

##### Proposed outcome
After prolonged ticket failures (e.g. several attempts at the 30 s cap), show a non-blocking hint such as "Having trouble reconnecting — reload the page" that clears itself when a retry succeeds. Keep retrying meanwhile, and keep `onError` for refusals only.

##### Notes
Raised in the code review of [#42](#old-42) ([#27](#old-27)).

<a id="old-44"></a>

## #44 test(web): client-boundary denylist and server-to-client props ([#24](#old-24))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`6c4bf08`](https://github.com/aqasim81/collaborative-code-editor/commit/6c4bf08)*

##### What changed

The Invariant 6 client-boundary check now also flags server-only packages reached from client code and guards the props the room page passes to its client editor. Closes [#24](#old-24).

##### Why

The import-graph walk dropped package imports, so a client module importing `@prisma/client`, `@auth/prisma-adapter`, the bare `next-auth` entry, `jose` or a Node builtin passed. Nothing checked Server → Client props either. No violation exists today, but [#35](#old-35) and [#36](#old-36) will add new server-to-client props, so the guard lands first.

- `client-boundary.test.ts`: a denylist (`@prisma/client`, `@auth/prisma-adapter`, `jose`, `next-auth/providers/*`, `next/headers`, exact `next-auth`, `node:*` and `builtinModules`) checked on every package import the walk reaches. The violation shows the chain, e.g. `components/editor/room-editor.tsx -> components/editor/toolbar.tsx -> package "@prisma/client"`.
- `__tests__/helpers/client-props.ts`: `findServerValues(props, extra?)` returns the names of non-public env values, plus any extra named secrets, found anywhere in a client component's props, including nested objects, arrays, elements and substrings.
- `room-page.test.tsx`: `RoomEditor` must receive exactly `{ roomId, roomName, initialLanguage, serverUrl, user: { id, name, image } }`, with no server value.

##### How it was tested

- New fixtures: Prisma value import, transitive `jose`, `@auth/prisma-adapter`, bare `next-auth`, `next-auth/providers/github`, `node:crypto`, `crypto`, `fs/promises` are flagged; `next-auth/react`, `next/navigation`, `yjs`, `zod` and `import type` from `@prisma/client` are not. The two flagging tests fail without the walk change.
- A deliberate `import { PrismaClient } from "@prisma/client"` in `components/editor/toolbar.tsx` fails the real-codebase test, naming the chain (reverted).
- Putting `env.WS_TICKET_SECRET` into the room page's `serverUrl` prop fails `room-page.test.tsx` with `WS_TICKET_SECRET` (reverted).
- Helper self-tests: nested, element and substring leaks are found, extra named secrets are found, and public values and functions are ignored.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (tests-only change; widens what Invariant 6's check sees)

##### Deliberately left out

- `app/layout.tsx` → `Navbar`: `Navbar` is a Server Component, so nothing crosses the boundary there. If it becomes a client component, its test should get the same assertion.
- `@collab-editor/shared` is not walked; it holds types and pure constants today.
- No production code changes.

<a id="old-45"></a>

## #45 feat(web): suggest a reload after prolonged ticket fetch failures ([#43](#old-43))

*PR · merged · opened 2026-09-26 · closed 2026-09-26 · commit [`80066b0`](https://github.com/aqasim81/collaborative-code-editor/commit/80066b0)*

##### What changed

After 8 room ticket fetches in a row have thrown, the room shows a non-blocking yellow banner, "Having trouble reconnecting. Reloading the page may help.", with a Reload button. Retrying continues, and the banner clears when a fetch returns or the socket connects. Closes [#43](#old-43)

##### Why

Since [#27](#old-27) a thrown ticket fetch is retried forever (backoff capped at 30 s) and the only signal is the red "Disconnected" status. Some failures repeat on every call, for example a tab left open across a deploy calling a server action id that no longer exists. Only a reload fixes that, and nothing told the user.

- `connectRoom` gains `onReloadHint(show)`. It is edge triggered at the 8th failure (1 to 2.5 minutes with the backoff) and withdrawn when any answer comes back. A refusal is shown through `onError` instead, so a streak that ends in a refusal withdraws the hint too.
- Counting failures was chosen over a wall-clock timer (no second clock) and over a new `ConnectionStatus` value (the indicator's status union stays the same).
- The page never reloads by itself, because a reload drops unsynced edits (Invariant 3). The user decides.

##### How it was tested

- `provider.test.ts`: the hint fires exactly once, at the 8th failure, while retries keep going; a success after the hint withdraws it and connects with the new ticket; a refusal after the hint withdraws it; a 2-failure blip gives no hint; a refusal alone gives no hint; nothing fires after `destroy()`
- `room-provider.test.tsx`: `reloadHint` follows the callback and is reset by `connected`
- `room-editor.test.tsx`: the banner is a status region (`<output>`) with a Reload button; it is hidden while a refusal alert shows; `location.reload` is called only on click
- `make verify` → `VERIFY OK` (provider.ts 98.6% lines); `pnpm build` exits 0
- invariant-auditor: all six invariants pass
- Not checked in a browser: the check needs a GitHub OAuth sign-in and a two-minute outage, which can't run unattended. The fake-socket and component tests cover the same flows, as they did for [#27](#old-27)

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- The banner doesn't warn that unsynced edits would be lost on reload (the auditor suggested it); the copy follows the plan, which says "may help" and leaves the choice to the user. A `beforeunload` guard for unsynced edits could be a follow-up

**Comment, 2026-09-26:**

Code review: one finding. `RoomProvider` is reused across rooms, so the previous room's reload hint (and error and status) carried over after a room switch. Fixed in the latest commit: the effect cleanup resets all three, with a regression test in `room-provider.test.tsx`.

<a id="old-46"></a>

## #46 feat(ws-server): trusted-proxy setting for the upgrade rate limit ([#30](#old-30))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`26be1e0`](https://github.com/aqasim81/collaborative-code-editor/commit/26be1e0)*

##### What changed

New WS-server setting `WS_TRUSTED_PROXIES` (comma-separated IPs/CIDRs, default empty). When the socket peer is a listed proxy, the per-IP upgrade limit keys on the rightmost `X-Forwarded-For` hop that is not itself a trusted proxy; otherwise it keys on the socket address, as before. Closes [#30](#old-30).

- `apps/ws-server/src/client-address.ts` (new): entry parsing, `BlockList`-backed matching (IPv4-mapped peers match IPv4 rules), right-to-left header walk
- `env.ts`: `WS_TRUSTED_PROXIES` validated at startup; invalid entries refuse to start with the variable named
- `server.ts` / `main.ts`: `trustedProxies` option wired into the upgrade handler; startup log shows the count only
- `rate-limit.ts`: shares address normalisation; IPv6 bucket keys are canonical (leading zeros, case)
- ADR 0001 addendum, architecture, changelog, status

##### Why

Behind a reverse proxy every client arrives from the proxy's address, so all users shared one upgrade bucket (30 burst, 1/s). The [#19](#old-19) addendum named an explicit trusted-proxy setting as the prerequisite for deploying behind a proxy. An explicit list was chosen over a boolean or hop count, which would trust the client itself when the server is exposed directly.

##### How it was tested

- Unit: entry parsing (IPv4/IPv6, CIDR, mapped, zone ids; rejects empty, hostnames, ports, bad prefixes, ranges wider than /8, IPv6 ranges covering IPv4-mapped peers such as `::/8` or `::ffff:0:0/96`), CIDR/exact/mapped matching, trusted and untrusted peers, proxy chains, spoofed prefixes, malformed hops, repeated headers, env parsing
- Integration (`upgrade-rate-limit.test.ts`): separate buckets per forwarded client behind a trusted peer; client-prepended hops ignored; header ignored from an untrusted peer; no header → proxy bucket; the raw header never reaches the logs; the default (no trusted proxies) still ignores the header
- `main`: refuses to start with `WS_TRUSTED_PROXIES=0.0.0.0/0`
- Manual: server with `WS_TRUSTED_PROXIES=127.0.0.1`; 31 curl upgrades each with `X-Forwarded-For: 10.0.0.1` and then `10.0.0.2` → 30×401 + 1×429 for each client (separate buckets); startup log shows `trustedProxies: 1`; `WS_TRUSTED_PROXIES=0.0.0.0/0` refuses to start naming the variable
- `pnpm build` exits 0
- Code review follow-up: IPv4-mapped addresses in hex or expanded form (`::ffff:102:304`) are unwrapped to IPv4 in peers, hops and entries, so they no longer share one IPv6 /64 bucket

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run: no violations; its hardening findings on broad ranges and IPv6 key forms are fixed here)

##### Deliberately left out

- RFC 7239 `Forwarded` and `X-Real-IP` are not read; proxies that append `host:port` entries fall back to the proxy bucket (documented in the ADR)
- The root `.env.example` still needs a `WS_TRUSTED_PROXIES=` line (empty = trust none); it could not be edited from this session

<a id="old-47"></a>

## #47 chore: document WS_TRUSTED_PROXIES in .env.example

*Issue · closed · opened 2026-09-27 · closed 2026-09-27*

[#30](#old-30) (PR [#46](#old-46)) added the WS-server setting `WS_TRUSTED_PROXIES` (comma-separated IPs/CIDRs of the reverse proxies in front of the WS server; empty = trust none). The root `.env.example` could not be edited in that change, so it still lacks the line.

Add:
```
#### Reverse proxies in front of the WS server (comma-separated IPs/CIDRs, no wider than /8). Empty = trust none.
WS_TRUSTED_PROXIES=
```
See the ADR 0001 addendum for [#30](#old-30).

<a id="old-48"></a>

## #48 feat(ws-server): purge a deleted room's document

*Issue · closed · opened 2026-09-27 · closed 2026-09-27*

Follow-up from [#35](#old-35).

##### Problem
Deleting a room ([#35](#old-35)) removes its `Room` and `RoomMember` rows, so no new ticket can be issued and open sockets lose access at ticket expiry (within 5 minutes). The room's Yjs document in LevelDB on the WS server stays on disk, orphaned: the web app can't reach LevelDB, and the WS server never reads Postgres (ADR 0001). Room ids are cuids and never reused, so the document can't resurface, but it takes disk space forever.

##### Sketch
- The web app signs a short-lived HS256 purge ticket with `WS_TICKET_SECRET` (`aud: "collab-editor:ws-admin"`, `roomId`, 60 s expiry), separate from room tickets so one can't be used as the other.
- `deleteRoom` calls a new `DELETE /rooms/<id>` on the WS server with that ticket after the database delete succeeds.
- The WS server verifies the ticket, closes the room's sockets with a new close code (added to `packages/shared`), evicts the room from the room manager and calls `persistence.clearDocument(roomId)` (y-leveldb).
- ADR 0001 addendum: this is the first web → WS server call.
- If the WS server is down, retry the purge (e.g. an outbox table of pending purges swept on the next delete or on a schedule); a failed purge never blocks the delete.

Rejected: a periodic sweep in the WS server, which would need Postgres access.

##### Acceptance criteria
- [ ] Deleting a room removes its LevelDB document and disconnects its open sockets at once
- [ ] A room ticket can't be used as a purge ticket, and vice versa
- [ ] A purge that fails because the WS server is down is retried

<a id="old-49"></a>

## #49 feat(web): create, list and delete rooms on a dashboard ([#35](#old-35))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`6412a39`](https://github.com/aqasim81/collaborative-code-editor/commit/6412a39)*

##### What changed

Signed-in users can create rooms, see the rooms they belong to on `/dashboard` and, as owners, delete them. Closes [#35](#old-35) · part of [#10](#old-10).

- shadcn/ui set up in `apps/web` (button, card, dialog, input, label, alert dialog, badge; toasts via `sonner`), with dark mode still following the OS preference
- Server actions `createRoom`, `listRooms`, `deleteRoom` (`actions/room.ts`), Zod `.safeParse()` input (`lib/room-input.ts`), Result pattern (`lib/result.ts`)
- Dashboard with room cards (name, language, created date, role), a create-room dialog and an owner-only delete with confirmation; links to the dashboard from the navbar and the room toolbar
- `Room.updatedAt` tracks last activity: bumped after a ticket is issued (`after()`), at most once a minute per room
- Docs: architecture (Rooms section), changelog, status, CLAUDE.md status, ADR 0001 note on room deletion

##### Why

Rooms only existed through the dev seed. Phase 7 needs real room management before invite links ([#36](#old-36)).

Deletion removes the room and its members in Postgres, so no new ticket can be issued; open sockets lose access at ticket expiry (≤ 5 minutes, as ADR 0001 already accepts for removed members) and the room URL returns 404. The LevelDB document stays on the WS server until [#48](#old-48) adds a purge.

##### How it was tested

- `make verify` → `VERIFY OK` (web coverage 98% statements, 91.7% branches); `pnpm build` passes
- Unit tests: input schemas (empty, blank, overlong names, unknown languages); query shapes (membership filter, activity ordering, display-only fields, OWNER-scoped delete, conditional activity bump); actions (success, invalid input before auth, signed out, editor vs non-member vs owner delete, lost race, database errors); ticket activity recorded after the response
- Component tests: create dialog (validation, pending state, server error, navigation), delete button (confirm, cancel, toasts), room card (link, label, date, role, owner-only delete), dashboard (redirect, empty, list order, error, no server values in client props)
- Invariant auditor: 2 and 6 hold; the ≤ 5-minute live-socket window after deletion is the accepted ADR 0001 behaviour, closed by [#48](#old-48)
- Browser: sign-in page in light and OS-dark mode; signed-out `/dashboard` and `/room/*` redirect to sign-in. The signed-in flow needs a GitHub OAuth login and was not clicked through here.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- Purging a deleted room's LevelDB document and closing its sockets immediately: [#48](#old-48)
- Invites and adding members: [#36](#old-36)

<a id="old-50"></a>

## #50 chore: document WS_TRUSTED_PROXIES in .env.example ([#47](#old-47))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`66b4eb4`](https://github.com/aqasim81/collaborative-code-editor/commit/66b4eb4)*

##### What changed

`.env.example` now lists `WS_TRUSTED_PROXIES` (empty = trust none) and `WS_PERSISTENCE_DIR` (`.leveldb`). A test in each app keeps `.env.example` in sync with that app's env schema. The project's read-deny rules now allow `.env.example` and still block every real env file. Closes [#47](#old-47)

##### Why

[#30](#old-30) added `WS_TRUSTED_PROXIES`, but `.env.example` couldn't be edited in that change: the deny rule `Read(./.env.*)` also matched `.env.example`. Nothing checked that `.env.example` matched the schemas, which is how `WS_PERSISTENCE_DIR` went missing too.

- Both env modules export `ENV_KEYS`, taken from the Zod schema's shape.
- `apps/*/__tests__/**/env-example.test.ts` fails and names each schema key missing from the root `.env.example`. `NODE_ENV` is exempt because the runtime sets it.
- `.claude/settings.json`: `Read(./.env)` and `Read(./.env.*)` are replaced by named patterns at any depth: `.env`, `.env.local`, `.env.*.local`, `.env.development`, `.env.production` and `.env.test`. Deny rules can't express "except `.env.example`" (deny beats allow), so the new `.claude/hooks/guard-reads.sh` (PreToolUse on Read) blocks every other `.env*` file and `secrets/`, using the same path rule as `guard-edits.sh`. Real files, including `apps/web/.env`, which the old root-only rule missed, stay unreadable.
- `.claude/commands/next-issue.md`: a `.env.example` exception to the env rule, and a step 0 "Intake" that plans new open issues, as in (internal note).

##### How it was tested

- The ws-server sync test failed before the `.env.example` edit, naming `WS_PERSISTENCE_DIR, WS_TRUSTED_PROXIES`, and passes after it. The web test passes; it guards future keys.
- `pnpm build` exited 0.
- `guard-reads.sh` fed paths directly: `.env.example` and `apps/web/.env.example` pass; `.env`, `.env.e`, `.env.export`, `apps/web/.env.local` and `secrets/x` are blocked.
- invariant-auditor (Invariant 6): no violations. `ENV_KEYS` holds names only, and `lib/env.ts` is already on the client-boundary denylist.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

The two sync tests are near copies (14 lines each). There is no shared test-helper package to put a common helper in.

<a id="old-51"></a>

## #51 feat(web): server-side structured logger (pino) instead of console

*Issue · closed · opened 2026-09-27 · closed 2026-09-27 · labels: enhancement*

##### Problem
The web app has no structured logger. CLAUDE.md (Anti-Patterns [#3](#old-3)) says: no `console.log` in production code; use a structured logger (pino) on the server and remove logging from the client. [#48](#old-48) needs server-side diagnostics in the web app (the room purge call and its outbox retries), so it uses `console` with `biome-ignore` comments as a stopgap.

##### Proposed outcome
- A server-only logger module in `apps/web` (e.g. `lib/logger.ts`, guarded with `import "server-only"`) that uses pino, like `apps/ws-server/src/logger.ts` (`createLogger(level)`).
- Log level from `lib/env.ts` (e.g. `LOG_LEVEL`, default `info`), listed in `.env.example`; the env-example sync test from [#47](#old-47) then covers it.
- Replace every `console.*` call and its `biome-ignore` comment in `apps/web` production code (Server Actions, route handlers, `lib/`) with the logger, starting with the ones [#48](#old-48) added.
- Client code keeps no logging. The client-boundary test (Invariant 6, [#24](#old-24)) should reject importing the logger from a `"use client"` module, for example by adding it or `pino` to the server-only denylist.
- Biome's `noConsole` stays an error for `apps/web` production code, so no new `console` calls get in.

##### Notes
Raised during [#48](#old-48). Uses the same pino version as the WS server.

<a id="old-52"></a>

## #52 feat(ws-server): purge a deleted room's document ([#48](#old-48))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`6e85093`](https://github.com/aqasim81/collaborative-code-editor/commit/6e85093)*

##### What changed

Deleting a room now closes its open sockets at once and removes its LevelDB document from the WS server. Closes [#48](#old-48) · ADR 0001 addendum ([#48](#old-48))

- **WS server:** new `DELETE /rooms/<id>`, guarded by the per-IP upgrade bucket (429) and a 60 s HS256 purge ticket in `Authorization: Bearer` (audience `collab-editor:ws-admin`, 401). On success:
  - the room's upgrades are refused for one ticket lifetime plus a minute;
  - its sockets close with the new code `4003`;
  - the room is evicted, and its pending writes finish first;
  - its document is cleared (y-leveldb `clearDocument`).

  The route answers 204, 500 when the store fails, and 503 during shutdown. It is idempotent.
- **Web app:**
  - `deleteOwnedRoom` writes a `RoomPurge` outbox row in the delete's transaction (new migration `room_purge_outbox`).
  - `deleteRoom` sweeps due rows after its response, and dashboard loads do the same at most once a minute.
  - A failure keeps the row and backs off from 1 min, doubling up to 1 h. The delete's answer never depends on the purge.
- **Client:** a 4003 close stops reconnecting, fetches no ticket, and shows "Could not join this room: This room was deleted".
- **Config:** new optional `WS_SERVER_URL`, for reaching the WS server on a private address. By default it is derived from `NEXT_PUBLIC_WS_URL` (`ws:` → `http:`). The unused `WS_SERVER_URL` line in `.env.example` now documents it.

##### Why

Before this, a deleted room's document stayed on disk forever, and its sockets kept the room open for up to 5 minutes. The web app can't reach LevelDB and the WS server never reads Postgres, so this adds the first web → WS server call. The design and the alternatives we rejected (a WS-server sweep, an admin port, cron) are in the ADR 0001 addendum.

##### How it was tested

- [x] `make verify` passes locally (`VERIFY OK`)
- [x] Invariants in CLAUDE.md still hold. The invariant-auditor found no violations. Following its gap report, I added a test for a purge that lands mid ticket check (`room-purge-race.test.ts`).

**Automated tests:**
- Purge vs room ticket, both ways.
- The purge route end to end: close codes, store emptied, rejoin refused, 401/404/429/500/503.
- The clear runs after a held append. A mutation test showed this test fails without the `await`.
- `DocumentStore.clear` on real LevelDB, and `evict` settling.
- The transactional outbox write.
- The sweep's backoff, throttle and no-overlap guard.
- The client's 4003 handling. A mutation test showed this test fails without `shouldConnect = false`.

**Checked by hand:**
- `curl -X DELETE localhost:8080/rooms/abc` → 401; `GET /health` → 200.
- `pnpm build` exits 0.
- A throwaway script against local Postgres, a real WS server and LevelDB:
  - With the WS server down, the `RoomPurge` row stays with `attempts: 1`, `lastError: "fetch failed"` and a 60 s backoff.
  - With it up, the next sweep removes the row, the open socket closes with 4003, the stored text is empty, and a rejoin with the pre-delete ticket gets 401. The WS log shows "room purged".
- **Not done:** the two-tab browser check, because the Playwright browser was held by another session. The client side is covered by the provider tests above.

**Deploy note:** run `pnpm --filter @collab-editor/web db:deploy` for the new migration.

##### Deliberately left out

- **Persisted tombstones.** They live in memory. A WS server restart within 6 minutes of a purge could let a client that was reconnecting with a pre-delete ticket write a new orphan document. The window is narrow, the result is the orphan [#35](#old-35) already accepted, and it is documented in the ADR.
- **Scheduled sweeps (cron).** They wait until a deployment target is chosen ([#37](#old-37)/#38).

**Comment, 2026-09-27:**

Code review follow-up:
- **Purge URL dropped a base-path prefix** (`new URL('/rooms/<id>', base)`): fixed in the latest commit. `roomPurgeUrl` now appends to the base, with a regression test for `https://host/collab`.
- **In-memory tombstone across a WS server restart**: this is a known and accepted limit, not changed here. See the ADR 0001 addendum ([#48](#old-48)) and "Deliberately left out". The window is a restart within about 6 minutes of a purge, and the worst case is the orphan document [#35](#old-35) already accepted.

<a id="old-53"></a>

## #53 feat(web): server-side structured logger (pino) instead of console ([#51](#old-51))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`0d7477d`](https://github.com/aqasim81/collaborative-code-editor/commit/0d7477d)*

##### What changed

Web server code logs through a server-only pino logger (`apps/web/lib/logger.ts`, name `web`, level from `LOG_LEVEL`) instead of `console`. Closes [#51](#old-51) · plan: (internal note)

- `lib/room-purge.ts`: a failed purge is `logger.warn({ roomId, attempts, err }, "room purge failed")` and a failed sweep is `logger.error({ err }, "room purge sweep failed")`. The ticket is never logged, and both `biome-ignore` comments are gone.
- `LOG_LEVEL` is in the web env schema (default `info`). Both apps accept the same levels: `LOG_LEVELS` in `@collab-editor/shared` is used by the WS server. The web app keeps a copy, checked by a test, because `next.config.ts` loads `lib/env.ts` and its loader can't resolve the shared package's TS source.
- Client-boundary test: `lib/logger.ts` added to the server-only modules and `pino` to the server-only packages (Invariant 6).
- Biome's `noConsole` is now an error repo-wide and stays a warning in `__tests__/`. No production code in any package calls `console`.
- `.env.example`: the `LOG_LEVEL` comment now covers both apps.

##### Why

CLAUDE.md anti-pattern 3: no `console` in production code, and server code logs through pino. [#48](#old-48) added two `console.error` calls as a stopgap.

##### How it was tested

- New tests: the logger's name and level follow env; `LOG_LEVEL` accepts every level, refuses `verbose`, defaults to `info`, and matches the shared list; room-purge logs `warn`/`error` with exact structured fields (logger mocked); a client importing the logger or `pino` is flagged.
- A temporary `console.log` in `apps/web/lib/` and `apps/ws-server/src/` fails `biome lint` (error); in `__tests__/` it is a warning.
- `git grep -n "console\." -- apps/web ':!**/__tests__/**'` → no matches.
- `pnpm build` exits 0 (pino is in Next 15's default `serverExternalPackages`).

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- A shared `createLogger` in `packages/shared`: client code imports that package, so pino there would put it in client bundles.
- The client-boundary test doesn't walk the import graph from `middleware.ts` (edge runtime). The middleware doesn't log today; the logger's doc comment states the rule.

<a id="old-54"></a>

## #54 chore: redact secrets in logs and keep the logger out of middleware

*Issue · closed · opened 2026-09-27 · closed 2026-09-27 · labels: enhancement*

##### Problem
Raised by the invariant audit on [#51](#old-51) (PR [#53](#old-53)). Two parts of Invariant 6 and build safety rely on convention, not checks:

1. **No secrets in logs** is only enforced for the room-purge warning, by exact-argument tests. A future log call in the web app or the WS server could include a ticket, an `Authorization` header or a Prisma error's `meta`, and nothing would remove it.
2. **The web logger never runs on the edge.** `apps/web/lib/logger.ts` says it must never be imported from `middleware.ts` (edge runtime, where pino's Node dependencies don't exist), but the client-boundary test only walks the graphs that start at `"use client"` files.

##### Proposed outcome
- Both loggers (`apps/web/lib/logger.ts`, `apps/ws-server/src/logger.ts`) set pino `redact` paths for ticket and authorization fields (for example `*.ticket`, `*.authorization`, `*.headers.authorization`). One test per app logs such a field and checks the output shows `[Redacted]`.
- The client-boundary test also walks the import graph that starts at `middleware.ts`, and refuses `lib/logger.ts` and `pino` in it.

##### Notes
Neither is a violation today: the middleware imports only `lib/auth.config.ts`, and no current log call carries a secret.

<a id="old-55"></a>

## #55 chore: redact cookies and raw request headers in logs

*Issue · closed · opened 2026-09-27 · closed 2026-09-27*

##### Problem
Raised by the invariant audit on [#54](#old-54). `LOG_REDACT_PATHS` (in `packages/shared/src/logging.ts`) covers tickets, tokens, `Authorization` and the `Sec-WebSocket-Protocol` header, at the top level and one level down. It does not cover:

1. **Cookies.** The Auth.js session JWT travels in `headers.cookie` / `set-cookie`, and neither is redacted.
2. **`rawHeaders`.** If someone logs a raw `IncomingMessage`, its `rawHeaders` array carries `Sec-WebSocket-Protocol, collab.v1, ticket.<jwt>`. Redact paths can't match array entries by header name.
3. **Depth.** `*` matches one level only, so a secret two levels down (`{ a: { b: { ticket } } }`) prints in the clear.

No current log call does any of these, so none is a live leak.

##### Proposed outcome
- Add cookie paths (`*.headers.cookie`, `*.headers["set-cookie"]` and their top-level forms) to `LOG_REDACT_PATHS`.
- Add a pino `req` serializer (or `rawHeaders` redact paths) in both apps so a logged request never carries raw headers.
- Decide whether two-level paths are worth adding, or record depth as a known limit in `docs/architecture.md`.
- Output tests in each app's logger test.

<a id="old-56"></a>

## #56 chore: redact secrets in logs and keep the logger out of middleware ([#54](#old-54))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`2bf6f72`](https://github.com/aqasim81/collaborative-code-editor/commit/2bf6f72)*

##### What changed

Both pino loggers now redact ticket, token and authorization fields. The client-boundary test also walks the import graph from `middleware.ts` and refuses the web logger, `pino` and Node builtins there. Closes [#54](#old-54)

- `LOG_REDACT_PATHS` in `@collab-editor/shared` holds the shared list: `ticket`, `token`, `authorization`, `headers.authorization` and `headers["sec-websocket-protocol"]`, each lowercase and capitalised, at the top level and one level down. `apps/ws-server/src/logger.ts` and `apps/web/lib/logger.ts` pass it to pino `redact`.
- `createLogger(level, destination?)` (ws-server) and the new `createWebLogger(level, destination?)` (web) take an optional stream so tests can capture output.
- `client-boundary.test.ts`: the walk is now generic (`walkGraph(files, entries, rule)`), with a client rule (unchanged) and a middleware rule.

##### Why

The audit on [#51](#old-51) found two parts of Invariant 6 that relied on convention alone: nothing stopped a future log call from printing a ticket, and nothing checked that the logger stays off the edge runtime. Redaction is a safety net only; call sites still never log secrets.

##### How it was tested

- Output tests in each app log a top-level ticket, a bearer token, a nested `Authorization` header in either case and the ticket subprotocol header. Each prints `[Redacted]`, unrelated fields (`roomId`, `host`) are kept, and the word "secret" appears nowhere in the output.
- Boundary test fixtures: a middleware that reaches the logger through a helper, `pino` or `node:crypto` is flagged; `lib/auth.config.ts` and `lib/env.ts` are allowed. A real-app walk reaches `lib/auth.config.ts` with no violations.
- I added `import "@/lib/logger"` to `middleware.ts` temporarily. The boundary test failed with `middleware.ts -> lib/logger.ts`, then I reverted it.
- `pnpm build` exits 0 (`lib/logger.ts` imports the shared package, but `next.config.ts` doesn't load it).

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

Cookies (`headers.cookie`, which carries the session JWT), a raw request's `rawHeaders` array, and secrets nested two or more levels deep. No current log call hits any of them; filed as [#55](#old-55).

<a id="old-57"></a>

## #57 chore: redact response objects and near-miss secret keys in logs

*Issue · closed · opened 2026-09-27 · closed 2026-09-27*

Follow-up from the invariant audit on [#55](#old-55). None of these is a live leak: no current call site logs a request, response or nested header object. They are gaps in the log-redaction safety net.

##### Gaps
1. **Node responses and nested requests.** A logged `{ res }` (a `ServerResponse`) prints its request's cookie through `res.req`, and `{ ctx: { req } }` prints headers two levels down. Add `res: pino.stdSerializers.res` (and consider `err: pino.stdSerializers.err`) in both loggers.
2. **Requests under keys other than `req`.** Its `rawHeaders` and one-level headers are redacted ([#55](#old-55)), but the socket and the rest of the object still print. Add a guard, such as a test that scans `logger.*(` call sites for raw request/response objects, or document that requests are only logged as `req`.
3. **Near-miss names.** `cookies` (plural) and Auth.js cookie names (`authjs.session-token`, `__Secure-authjs.session-token`) as keys are not redacted.
4. **Invariant wording.** CLAUDE.md Invariant 6 covers the browser only. Add "and out of logs (`LOG_REDACT_PATHS`)" so the auditor checks log leaks as an invariant.

##### Done when
- Output tests in both apps prove each new path or serializer
- `make verify` prints `VERIFY OK` and `pnpm build` exits 0

<a id="old-58"></a>

## #58 chore: redact cookies and raw request headers in logs ([#55](#old-55))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`556906b`](https://github.com/aqasim81/collaborative-code-editor/commit/556906b)*

##### What changed

Both loggers now also redact `cookie` / `set-cookie` headers and a request's `rawHeaders`, and they log a request under `req` through pino's standard request serializer. Closes [#55](#old-55)

##### Why

The [#54](#old-54) invariant audit found that `LOG_REDACT_PATHS` did not cover the Auth.js session cookie. It also found that a logged Node `IncomingMessage` carries `rawHeaders`, a flat array that repeats `Sec-WebSocket-Protocol: collab.v1, ticket.<jwt>`, and redact paths can't name entries in that array. Neither gap leaks anything today, since no call site logs a request. This change closes both in the safety net.

- `packages/shared/src/logging.ts`: `cookie`, `*.cookie`, `*.headers.cookie`, `headers["set-cookie"]`, `*.headers["set-cookie"]` in both spellings, plus `rawHeaders` / `*.rawHeaders`, which is redacted whole so it is covered under any key
- `apps/ws-server/src/logger.ts`, `apps/web/lib/logger.ts`: `serializers: { req: pino.stdSerializers.req }`, so a logged `req` prints method, url, headers and address, with no socket and no `rawHeaders`
- `docs/architecture.md`: the one-level depth of the redact paths is recorded as a known limit

##### How it was tested

- Logger output tests in each app:
  - `cookie` and `set-cookie` headers print `[Redacted]` at the top level and one level down, in both spellings
  - a Node `IncomingMessage` logged as `req` has no `rawHeaders` and its ticket, authorization and cookie headers are redacted
  - the same request logged under another key has `rawHeaders: "[Redacted]"`
  - the [#54](#old-54) cases still pass
- `make verify` → `VERIFY OK` (ws-server 255 tests, web 312 tests, coverage above 90%)
- `pnpm build` → exit 0

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run: no violations)

##### Deliberately left out

- Two-level wildcard paths: pino's wildcard redaction cost grows with each level, and call sites log flat objects. This is documented as a known limit.
- A `res` serializer, near-miss keys (`cookies`, Auth.js cookie names) and wording Invariant 6 to cover logs are all audit follow-ups, filed as [#57](#old-57).

<a id="old-59"></a>

## #59 chore: redact response objects and near-miss secret keys in logs ([#57](#old-57))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`dc06a9d`](https://github.com/aqasim81/collaborative-code-editor/commit/dc06a9d)*

##### What changed

Both loggers serialize a Node response logged as `res` (status and headers, no request). `cookies` and the Auth.js session cookie names are now redacted as keys. A source scan in each app refuses raw `request`, `response`, `socket` or `ctx` objects in log calls, and Invariant 6 now names logs. Closes [#57](#old-57)

##### Why

These are follow-ups from the [#55](#old-55) invariant audit. None of them was a live leak. A logged `{ res }` printed its request's cookie through `res.req`, near-miss keys (`cookies`, `authjs.session-token`) printed in the clear, and nothing stopped a raw request from being logged under a key other than `req`.

##### How it was tested

- Logger output tests in both apps:
  - a `ServerResponse` logged as `res` has no `req` and its `set-cookie` is redacted;
  - `cookies`, `authjs.session-token` and `__Secure-authjs.session-token` are redacted at the top level and one level down;
  - `err` still prints its message and stack;
  - the [#54](#old-54)/#55 cases still pass. One [#55](#old-55) case used `res` as a generic key for a plain object, and it now uses `reply`, because `res` goes through the response serializer by design.
- Guard tests: they pass on the current source. A fixture shows they flag named, shorthand, multi-line and nested (`ctx: { req }`) keys.
- The web source walker moved from `client-boundary.test.ts` to `__tests__/helpers/source-files.ts` so both invariant tests read the same file set.
- `pnpm build` exits 0.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run if core logic changed)

##### Deliberately left out

- **Two-level wildcard paths:** still a known limit from [#55](#old-55).
- **A top-level `formatters.log` hook:** it would serialize any `IncomingMessage`/`ServerResponse`/`Socket` whatever its key. The plan chose the convention plus a guard test instead. Worth revisiting if the guard proves too weak.
- **Chunked Auth.js cookies (`authjs.session-token.0`) and CSRF cookie names:** these are covered when logged inside a `cookies` object, but not when spread as top-level keys.

<a id="old-60"></a>

## #60 feat(web): share rooms with a secret invite link ([#36](#old-36))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`1908527`](https://github.com/aqasim81/collaborative-code-editor/commit/1908527)*

##### What changed

Room owners can share a room with a secret invite link. Closes [#36](#old-36) (part of [#10](#old-10)).

- `Room.inviteToken`: 32 random bytes, base64url (43 chars), unique; created with each room; the migration backfills existing rooms in the same format.
- Owner-only **Share** button in the room toolbar: copies `/join/<token>` with a toast, shows the link in a dialog, and **Reset link** (after a confirmation) rotates the token.
- `/join/<token>`: protected (sign-in and back via `callbackUrl`); renders a confirmation and never writes; the **Join room** POST (`joinRoomAction`) upserts an `EDITOR` membership and redirects to the room. Malformed, unknown and reset tokens get the same 404.
- Both loggers redact `inviteToken` and `inviteUrl`.
- ADR 0003; Invariant 2 wording, architecture, changelog, status.

##### Why

Rooms could be created ([#35](#old-35)), but only their creator was a member, so nobody could collaborate. The owner chose secret invite links (2026-09-27). The room id still grants nothing (Invariant 2), and WS access still needs a ticket issued after the membership check (Invariant 1). Decisions and rejected alternatives are in `docs/adr/0003-secret-invite-links.md`.

##### How it was tested

- [x] `make verify` passes locally (`VERIFY OK`; web coverage 98.1% lines / 92.4% branches)
- [x] Invariants in CLAUDE.md still hold (invariant-auditor: no violations; its log-redaction suggestion is applied)
- `pnpm build` exits 0 (`/join/[token]` route present)
- Migration on local Postgres: backfilled tokens all match `^[A-Za-z0-9_-]{43}$` (0 mismatches); `prisma migrate dev` again reports "Already in sync"
- New and extended tests: token format and uniqueness, room queries (OWNER-scoped rotation, EDITOR upsert never downgrades), `acceptInvite`/`joinRoomAction`/`resetInviteLink`, the invite page (signed-out redirect without a DB lookup, 404s, member redirect, no write on render), owner-only `inviteUrl` prop plus the [#24](#old-24) props guard, Share button (clipboard, fallback, reset), toolbar slot, `/join` protected, log redaction
- Dev server: signed-out `GET /join/<token>` → 307 to `/sign-in?callbackUrl=…/join/<token>`
- **Not done:** the two-account browser check (needs two GitHub OAuth sign-ins, which this environment can't do). It should be run by hand before relying on the feature: share → second account joins and edits → reset → old link 404s, member keeps access

##### Deliberately left out

- Removing members (reset doesn't evict someone who joined), link expiry or use limits: out of the decided scope (ADR 0003).
- `findRoomForMember` (used by `getRoomTicket`) still returns the full room row, `inviteToken` included, server-side only; tightening it touches the ticket path and is left for a follow-up.
- A shared owner-only refusal helper for `deleteRoom`/`resetInviteLink`: two callers so far.
- The new migration was hand-written (nullable column → backfill → NOT NULL → unique index) as the plan specified; `prisma migrate dev --create-only` can't run non-interactively when a required unique column is added.

<a id="old-61"></a>

## #61 feat(web): landing page, responsive layout and error states ([#37](#old-37))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`5d09f47`](https://github.com/aqasim81/collaborative-code-editor/commit/5d09f47)*

##### What changed

Closes [#37](#old-37) (part of [#10](#old-10)). The product now looks finished and fails gracefully:

- **Landing and shell:** a landing page (hero, a static two-cursor editor preview in real presence colours, three feature cards, how it works, and a CTA that signs you in or opens your rooms), a footer on every content page via `PageShell`, a navbar that fits phones, a favicon and Open Graph metadata.
- **Responsive room:** the presence sidebar folds away below `lg` behind a "People (n)" toolbar button (Escape closes it). The toolbar fits tablet widths, and on phones the status and "Rooms" words are screen-reader-only. `usePresence` now runs once in `RoomView`, and `PresenceList` takes its entries.
- **Error states:** room-join refusals carry a typed `RoomJoinErrorCode` (`invalid_room`, `unauthenticated`, `not_found`, `deleted`) from `getRoomTicket` through the provider to a `RoomStatusBanner`. The banner shows fixed copy plus a way forward: back to your rooms, or sign in and return to the room. When the WS server is unreachable, a banner says edits stay in the tab and offers **Retry now** (`RoomConnection.retry()`: skip the backoff, fresh ticket at once). The [#43](#old-43) reload hint lives in the same banner. There are 404 pages (global, plus a room 404 worded identically for a missing room and a non-member), `error.tsx` with Try again and the digest, and `global-error.tsx`. Sign-in failures land on `/sign-in?error=<type>` (`pages.error`) with a readable message and keep their destination: the action passes `callbackUrl` along, and after a failed GitHub callback the page falls back to Auth.js's `callback-url` cookie. That fix came from code review; the action still only follows same-origin paths.
- **Production check:** `pnpm --filter @collab-editor/web e2e:prod`, a Playwright check against `pnpm build && pnpm start`. It fails on any console error or warning and on horizontal scroll at 1280/1024/768/390 px. For the signed-in pages it mints a session for the seed room's owner and verifies that the server accepts it.

##### Why

Before this, the landing page was an unstyled heading and there was no footer. Presence was unreachable below `md`. A refused ticket showed a raw action string with no way forward. A down WS server showed only a red dot, and GitHub sign-in failures landed on Auth.js's built-in page.

##### How it was tested

- [x] `make verify` passes locally (`VERIFY OK`; web coverage 98.3% statements, 93.0% branches)
- [x] Invariants in CLAUDE.md still hold. The invariant auditor found no violations: `retry()` always reconnects with a freshly fetched ticket (1); the room 404 and the `not_found` banner share one wording for a missing room and a non-member (2); no editor-state writes (3); the new client components import only UI, routes and the import-free `room-errors` (6). Its one gap note: nothing but review keeps app code from importing `e2e/`

- New and extended Vitest suites: landing page CTA per session, footer, page shell, navbar, presence toggle (aria-expanded, Escape), room editor (panel folds and opens), status banner (every code's copy and link; unreachable → Retry; reload hint; nothing while connected), provider `retry()` (fresh ticket and no extra socket, skips a pending ticket backoff, no-op while connected, fetching or destroyed), ticket failure codes, 404 and error pages, sign-in messages, `AuthError` → redirect while other throws pass through, `pages.error`.
- `pnpm build`: succeeds with no warnings from `next build`.
- Production check, signed-out half (`E2E_SIGNED_OUT_ONLY=1 pnpm --filter @collab-editor/web e2e:prod` against `pnpm start`): **8 passed**. `/`, `/sign-in`, `/sign-in?error=AccessDenied` and `/does-not-exist` have a clean console, and `/` fits 1280, 1024, 768 and 390 px.
- Checked in a browser (Playwright screenshots, dev build): the landing page at 1280/768/390, the 404 page, the sign-in error, and the room toolbar and presence panel at 1280/1024/768/390 (no sideways scroll; the panel opens and Escape closes it), plus the signed-out room banner.
- **Not run here:** the signed-in half of the production check (dashboard, a connected room, the room 404, their widths) and the hand checks that need a signed-in session (WS server stopped → banner → Retry now; non-member room URL). They need the web app's `AUTH_SECRET` in the check's process. This session may not load the app's secret file, and the secret exported in the shell isn't the app's. Global setup now detects that case and says so instead of silently testing the sign-in redirect. To run it: `cd apps/web && node --env-file=.env ./node_modules/.bin/playwright test` with the web app (`pnpm start`) and the WS server running (docs/status.md, Next Steps).
- Screenshots aren't attached: `gh` can't upload images from the CLI.

##### Deliberately left out

- The check stays out of CI: it needs a database with a signed-in user and a running WS server. Revisit once the app is deployed.
- No `unavailable` error code: a thrown ticket fetch is already retried with backoff ([#27](#old-27)) and never reaches `onError`; the unreachable banner covers that state.

<a id="old-62"></a>

## #62 chore: guard-bash blocks shell writes to protected paths

*Issue · closed · opened 2026-09-27 · closed 2026-09-27*

##### Problem
`.claude/protected-paths.txt` protects `apps/web/components/ui/*` and `apps/web/prisma/migrations/*`, but only `guard-edits.sh` enforces it, and that hook watches only the Edit/Write/MultiEdit tools. A shell command can still write there. During [#36](#old-36) a session wrote a migration SQL file with a shell command because the edit tools were blocked, so a protected path changed without the owner's approval (PR [#60](#old-60)).

##### Proposed outcome
- `guard-bash.sh` blocks shell commands that write into a protected path: redirection (`>`, `>>`), `tee`, `cp`/`mv`/`install` with a protected destination, `sed -i`/`perl -i`, and here-doc or script writers (`python`, `node`, `cat <<`) that name a protected path. It reads the same `.claude/protected-paths.txt`.
- The sanctioned generators stay allowed: `prisma migrate dev --create-only` / `prisma migrate diff --script` (for migrations) and `shadcn add` (for `components/ui`), as CLAUDE.md prescribes.
- `/next-issue` and CLAUDE.md ("Things Claude gets wrong"): if a protected path needs a change the generators can't make (e.g. a hand-edited migration backfill), the session stops, comments on the issue and marks it blocked. It never works around a guard.
- Tests for the hook: blocked and allowed command examples, run as part of `make verify`.

##### Notes
Raised after [#36](#old-36) (PR [#60](#old-60)).

<a id="old-63"></a>

## #63 chore: guard-bash blocks shell writes to protected paths ([#62](#old-62))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`134a863`](https://github.com/aqasim81/collaborative-code-editor/commit/134a863)*

##### What changed

`guard-bash.sh` now blocks shell commands that write into the paths listed in `.claude/protected-paths.txt`. Hook tests run in `make verify`. `/next-issue` and CLAUDE.md now say never to work around a guard hook. Closes [#62](#old-62)

- Blocked: redirects (`>`, `>>`, `&>`), `tee`, `cp`/`install`/`ln`/`rsync` into a protected path, `mv`/`rm`/`touch`/`truncate`, `dd of=`, `git rm`/`checkout`/`restore` and `find -delete` on one (or, for deletes and moves, on a parent folder), `sed -i`/`perl -i`, and `python`/`node`/`ruby`/`perl` commands that name one (including heredoc scripts). A path counts whether it is written relative, as `./…`, absolute, or as its last components after a `cd`.
- Allowed: `prisma migrate …` (including `diff --script` into a migration), `shadcn add`, `db:migrate`, and reads (`cat`, `ls`, `grep`, `git diff`, `cp` out of a protected path). Quoted text (commit messages, PR bodies) is data, and wrappers such as `sudo`, `env` and `timeout` are seen through.
- The parser lives in `.claude/hooks/lib/protected-writes.pl`. The hook starts it only when the command names a protected path, so ordinary commands start no extra process.
- `/next-issue` now treats aqasim81/collaborative-code-editor#1 as deferred (the owner's decision of 2026-09-27).

##### Why

In [#36](#old-36) (PR [#60](#old-60)), a migration file was written with a shell command after the edit tools refused it, so a protected path changed without the owner's approval. `guard-edits.sh` only covers Edit/Write/MultiEdit.

##### How it was tested

- `.claude/hooks/tests/guard-bash.test.sh`: 40 blocked and 25 allowed commands, including regression cases for the older checks (force-push, push to main, reading env files, the prod-deploy gate). The new blocked cases failed before the change.
- `make verify` → `hook tests OK` … `VERIFY OK`; `pnpm build` exits 0.

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (harness only; no app code changed)

##### Deliberately left out

- An env-var escape hatch: a session could set it itself.
- Writes through a path held in a variable, and a one-component path after a `cd` (`cd …/components && rm -rf ui`). The hook is a guardrail, not a sandbox; the never-work-around rule covers these.

<a id="old-64"></a>

## #64 chore: /next-issue follows the per-issue checklist format

*Issue · closed · opened 2026-09-27 · closed 2026-09-27*

##### Problem
The owner changed the per-issue checklist on 2026-09-27 to make the loop faster ((internal note), local):
- Per phase: plan, review, implement, tests, **the touched packages' tests only**, commit.
- Once per issue: `/simplify` on the whole diff, the invariant audit (**skipped for docs-only diffs**), the full `make verify`, PR, code review, merge.

`.claude/commands/next-issue.md` (committed) still describes the old format by step number ("Step 5: simplify", "Step 6/7: make verify", "Step 9: code-review", "Step 10: merge", "Step 13"), so the command and new checklists disagree.

##### Proposed outcome
- Section 3 of `/next-issue` describes the new format by name, not number: per-phase targeted tests and commit; issue-end `/simplify`, the invariant audit (with the docs-only skip rule: only `docs/**`, `*.md`, `README.md`, `LICENSE`, `docs/media/**`), full `make verify`, PR, code review, merge and `main` CI, checklist and README updates, confirming the issue is closed, intake, `ISSUE <N> DONE`.
- It still accepts older checklists: tick the equivalent boxes.
- `.claude/rules/ai-native-workflow.md` "Fresh eyes": note that `invariant-auditor` is skipped for docs-only changes.
- `docs/changelog.md` gets an entry.

<a id="old-65"></a>

## #65 docs(readme): README with demo GIF, setup and architecture ([#38](#old-38))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`757d481`](https://github.com/aqasim81/collaborative-code-editor/commit/757d481)*

##### What changed

A root `README.md` (pitch, badges, demo GIF, quickstart, features, Mermaid architecture, key decisions linking ADRs 0001–0003, quality and invariants, full setup, roadmap), an MIT `LICENSE`, and a demo GIF (`docs/media/demo.gif`, 960 px, ~12 s, 292 KB) recorded by a committed Playwright script, `apps/web/e2e/record-demo.ts`. The session-cookie minting from [#37](#old-37)'s production check moved to `apps/web/e2e/session.ts` so the check and the recording share it. Phase 7 docs are wrapped up (changelog, status, CLAUDE.md Status).

Closes [#38](#old-38)
Closes [#10](#old-10)

##### Why

The repo had no front door. For a portfolio piece the README has to show the product working, explain how it's built, and get a stranger from a fresh clone to a running app. The GIF is recorded automatically (owner decision), so it can be re-made without two real GitHub accounts.

##### How it was tested

- [x] `make verify` passes locally (VERIFY OK, also after merging `main` for [#62](#old-62))
- [x] Invariants in CLAUDE.md still hold (no app code changed; the README restates all six)

- **Recording:** production build + WS server with throwaway secrets in the shell and a separate `collab_demo` database (no real env file read). Frames checked by eye: two panes, labelled carets in contrasting colours, the presence list, both users editing line 1 at once, only demo names.
- **Production check:** `playwright test` (both halves, 19 checks) passed against the same stack through the refactored global setup. A wrong `AUTH_SECRET` gives the "refused the minted session" message.
- **Fresh clone** of this branch: `nvm use`, `corepack enable`, `pnpm install --frozen-lockfile`, `docker compose up -d`, `db:migrate`, both dev servers. `/` and `/sign-in` 200, `/dashboard` redirects to sign-in, `/nope` 404, `/health` OK. Two minted users opened one room and their edits synced. `make verify` in the clone: VERIFY OK.
- **README gaps found and fixed:**
  - `pnpm start` refuses sessions (`UntrustedHost`) without `AUTH_URL`, so the README and `.env.example` now say to set it.
  - The re-record steps now list ffmpeg/gifski and the frames directory.
  - A non-200 from `/api/auth/session` now names `AUTH_URL` instead of blaming the secret.

##### Deliberately left out

- **Owner to-do (does not block the merge):** on a fresh clone, sign in with real GitHub OAuth, create a room, open it in a second window with a second GitHub account, and check the invite link. The session may not read real env files.
- **[#13](https://github.com/aqasim81/collaborative-code-editor/issues/1) (public repo, branch protection):** deferred by the owner.
- **Two notes from the fresh-clone check that are not README gaps:**
  - A clone under macOS `/tmp` (a symlink to `/private/tmp`) breaks Turbopack's module resolution.
  - With only shell variables and no env file, turbo's strict env mode strips them from `pnpm dev`. The README's env-file flow is unaffected.

<a id="old-66"></a>

## #66 chore: /next-issue follows the per-issue checklist format ([#64](#old-64))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`95897ca`](https://github.com/aqasim81/collaborative-code-editor/commit/95897ca)*

##### What changed

`/next-issue` now describes the per-issue checklist by step name instead of by number, and the workflow rules skip `invariant-auditor` for docs-only changes. Closes [#64](#old-64)

- **Every phase:** targeted tests (`pnpm --filter <pkg> test`, plus `tsc --noEmit` when types changed; `packages/shared` runs both apps; hook changes run the guard tests), then commit.
- **Once per issue:** Simplify on the whole diff, Invariant audit (skipped for docs-only diffs: `docs/**`, `*.md`, `README.md`, `LICENSE`, `docs/media/**`, noted as "audit skipped: docs-only"; always run when `apps/`, `packages/`, `.claude/hooks/` or `.github/` changed), Full gate, PR, Code review, Merge without asking, Bookkeeping, Close, Intake and stop.
- §0 Intake runs "again just before printing `ISSUE <N> DONE`" and writes new checklists from (internal note).
- Older 13-step checklists are still accepted; one sentence maps old steps 5–13 to the named steps.
- `docs/changelog.md` and `docs/status.md` entries.

Where each old §3 bullet went:
| Old | New |
|-----|-----|
| Step 5: simplify | **Simplify** (once per issue) |
| Step 9: code-review | **Code review** |
| Step 6/7: `make verify`, fix the code not the tests | **Full gate** (and **Targeted tests** per phase) |
| Step 8: PR body via `--body-file` | **PR** |
| Step 10: merge without asking, `gh` commands, `main` CI | **Merge without asking** (unchanged text) |
| Step 11: tick checklist, README row, [#10](#old-10) | **Bookkeeping** (unchanged text) |
| Step 12: confirm `CLOSED` | **Close** (unchanged text) |
| Step 13: don't start the next issue, clean `main`, `ISSUE <N> DONE` | **Intake and stop** (plus the intake rerun) |

The aqasim81/collaborative-code-editor#1 deferral, Blocked, "never work around a guard hook" and "Rules that still apply" sections are untouched.

##### Why

The owner changed the per-issue checklist on 2026-09-27 (targeted tests per phase, one full gate per issue), and the command still numbered the old 13-step loop, so the two gave contradictory instructions. This change takes effect from the next `/next-issue` session; a running session has already loaded the command.

##### How it was tested

- `grep -nE 'step 1[0-3]|Step [0-9]+|13-step' .claude/commands/next-issue.md` matches only the old-checklist mapping sentence.
- `bash .claude/hooks/tests/guard-bash.test.sh` → `hook tests OK`.
- Read the new §3 against template steps 1–15: every step has a bullet.

- [x] `make verify` passes locally (`VERIFY OK`)
- [x] Invariants in CLAUDE.md still hold. Audit skipped: docs-only (every changed file is Markdown; no apps, packages, hooks or CI).

##### Deliberately left out

- Committing `_checklist-template.md`: (internal note) is gitignored by design.
- The docs-only path list matches `CLAUDE.md` and `.claude/**/*.md` too, so an edit to the invariants or the auditor agent would skip the audit. This PR keeps the owner's list as written; a follow-up issue covers narrowing it.

<a id="old-67"></a>

## #67 chore: the docs-only audit skip must not cover CLAUDE.md or .claude/

*Issue · closed · opened 2026-09-27 · closed 2026-09-27*

##### Problem
The docs-only rule that skips the invariant audit (`/next-issue` Invariant audit, `.claude/rules/ai-native-workflow.md` "Fresh eyes", (internal note) step 8) lists `*.md`. That also matches:
- `CLAUDE.md`, which defines the Invariants the auditor checks;
- `.claude/agents/*.md` (including `invariant-auditor` itself), `.claude/commands/*.md`, `.claude/rules/*.md`, `REVIEW.md`, which control behaviour.

So a PR that rewords or drops an invariant, or edits the auditor, skips the audit. Found in review of [#66](#old-66).

##### Proposed outcome
- The skip applies only when every changed file is prose that controls nothing: `docs/**`, `README.md`, `LICENSE`, `docs/changelog.md`-style files, not `CLAUDE.md`, `REVIEW.md` or anything under `.claude/`.
- The audit always runs when `CLAUDE.md`, `REVIEW.md`, `.claude/**`, `apps/`, `packages/` or `.github/` changed.
- The same list in the command, the rules file and the local template.

<a id="old-68"></a>

## #68 chore: the docs-only audit skip must not cover CLAUDE.md or .claude/ ([#67](#old-67))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`6d648cd`](https://github.com/aqasim81/collaborative-code-editor/commit/6d648cd)*

##### What changed

The docs-only skip of the invariant audit is now an allow-list. The audit is skipped only when every changed file is under `docs/` (not (internal note)) or is `README.md` or `LICENSE` at the repo root. The rule is written once, in `.claude/rules/ai-native-workflow.md` "Fresh eyes", and `/next-issue` (plus the local checklist template) points to it. Changelog and status entries added.

Closes [#67](#old-67)

##### Why

The old list included `*.md`, which also matched `CLAUDE.md` (it defines the invariants), `REVIEW.md` and `.claude/**/*.md`, including `invariant-auditor.md`. So a PR that reworded an invariant or edited the auditor could skip the audit. (internal note) holds CI yml, eval scripts and the CLAUDE.md template, which control behaviour once copied, so it is excluded too. The same list was copied in three places, which is how the [#64](#old-64) wording went wrong in all of them; one copy fixes that.

##### How it was tested

- `make verify`: `VERIFY OK` (guard-bash hook tests run first)
- `grep` confirms no `*.md` entry in any docs-only list; the full rule appears only in the rules file
- Invariant audit ran because the diff touches `.claude/`: PASS on all six invariants

- [x] `make verify` passes locally
- [x] Invariants in CLAUDE.md still hold (invariant-auditor run)

##### Deliberately left out

- An exemption for `CLAUDE.md` edits that touch only the Status line. Most issues update that line, so the audit will run more often, but an exemption would bring back the same kind of gap.
- `.claude/hooks/verify-on-stop.sh` and `guard-edits.sh` still treat `*.md`/`docs/` as exempt for their own purposes (the stop-time verify and the edit guard), not the audit skip; unchanged.

<a id="old-69"></a>

## #69 chore: keep internal workflow files out of the published tree ([#13](https://github.com/aqasim81/collaborative-code-editor/issues/1))

*PR · merged · opened 2026-09-27 · closed 2026-09-27 · commit [`96a1184`](https://github.com/aqasim81/collaborative-code-editor/commit/96a1184)*

##### What changed

Part of aqasim81/collaborative-code-editor#1 (PR 1 of 2). The internal workflow files ((internal notes) ) are untracked and gitignored, and they stay on disk for the local workflow. The Makefile header comment is neutral. `CLAUDE.md`, the workflow rules and the intent-writer skill say these paths and (internal note) are local. The Issue aqasim81/collaborative-code-editor#1 section of `/next-issue` records the owner's option B decision.

##### Why

The repo goes public in aqasim81/collaborative-code-editor#1. Its tip must not publish internal workflow or employer-related files. The only tracked employer mention was in (internal note). History is handled separately: option B rewrites it into a new public repo.

##### How it was tested

- `git ls-files | grep -cE '^(intent|specs|docs/templates)/|(internal note)|(internal note)'` → `0`
- `git check-ignore` confirms the five paths are ignored, and they are still present locally
- `gitleaks git --redact` over 181 commits → no leaks
- No CI job, hook, script or test reads the untracked paths

- [x] `make verify` passes locally (`VERIFY OK`)
- [x] Invariants in CLAUDE.md still hold (invariant-auditor: all six pass, no runtime code changed)

##### Deliberately left out

History (phase 2: rewrite into a new repo), the visibility flip (phase 3) and branch protection (phase 4, PR 2, `Closes aqasim81/collaborative-code-editor#1`).

**Comment, 2026-09-27:**

Code review: fixed the stale aqasim81/collaborative-code-editor#1 status in docs/status.md and anchored (internal note) and (internal note) to the repo root, so nested folders such as `apps/web/e2e/(internal note) are not ignored. Not changed: the intent-writer skill and the workflow rules still name (internal note). By design those are local workflow tools, the templates stay on disk in a working checkout, and SKILL.md now says they are local and gitignored.
