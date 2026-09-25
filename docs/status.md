# Project Status

## Current Phase
Phase 2 complete (#5): Prisma schema with rooms and membership, GitHub sign-in with JWT sessions, protected routes and env validation. Next: Phase 3 (Editor UI, #6).

## Accomplishments
- [x] Project spec refined and validated
- [x] Technology stack selected: Next.js 15 + Custom WS Server + Yjs + CodeMirror 6 (Turborepo)
- [x] PRD and implementation plan written (7 phases)
- [x] Phase 1: Turborepo workspace (apps/web, apps/ws-server, packages/shared), Biome, strict TypeScript, Vitest with 80% thresholds, lefthook hooks, CI (verify → build)
- [x] WS server build emits a runnable bundle (#2); Node 22 pinned (#3)
- [x] Harness checked: `make verify` fails on a deliberate type error and a failing test (exit 2), and the protected-path hook blocks edits under `apps/web/components/ui/`
- [x] Roadmap tracked as GitHub issues: phases 2–7 are #5–#10
- [x] Phase 2: Prisma schema (User, Account, Session, Room, RoomMember) + init migration, Auth.js v5 GitHub OAuth with JWT sessions, protected-route middleware, sign-in page, navbar auth state, Zod env validation at build (#5). Sign-in, navbar avatar/name and sign-out checked end to end against a local GitHub OAuth App

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
cp .env.example apps/web/.env     # fill in DATABASE_URL, AUTH_SECRET, AUTH_GITHUB_ID/SECRET, NEXT_PUBLIC_* URLs
pnpm --filter @collab-editor/web db:migrate
pnpm dev
```

`apps/web` reads environment variables from `apps/web/.env` (Next.js and Prisma both load it from the app directory).

## Next Steps
1. `implement #6` — Phase 3: Editor UI
