# Project Status

## Current Phase
Phase 1 complete — monorepo, quality tooling and CI in place. Next: Phase 2 (Database Schema & Authentication, #5).

## Accomplishments
- [x] Project spec refined and validated
- [x] Technology stack selected: Next.js 15 + Custom WS Server + Yjs + CodeMirror 6 (Turborepo)
- [x] PRD and implementation plan written (7 phases)
- [x] Phase 1: Turborepo workspace (apps/web, apps/ws-server, packages/shared), Biome, strict TypeScript, Vitest with 80% thresholds, lefthook hooks, CI (verify → build)
- [x] WS server build emits a runnable bundle (#2); Node 22 pinned (#3)
- [x] Harness checked: `make verify` fails on a deliberate type error and a failing test (exit 2), and the protected-path hook blocks edits under `apps/web/components/ui/`
- [x] Roadmap tracked as GitHub issues: phases 2–7 are #5–#10

## Blockers
- PostgreSQL database needs to be provisioned before Phase 2 (#5)
- GitHub OAuth App needs to be created before Phase 2 (#5)
- `main` has no required status check: GitHub branch protection on a private repo needs a paid plan (#13)

## Local Setup
```bash
nvm use                           # Node 22 from .nvmrc
corepack enable                   # provides the pinned pnpm@10.7.0 for this Node version
pnpm install --frozen-lockfile
lefthook install                  # pre-commit Biome + gitleaks, commit-msg commitlint, pre-push make verify
make verify                       # healthy output ends with VERIFY OK
```

## Next Steps
1. Provision PostgreSQL and create the GitHub OAuth App; fill `.env` from `.env.example`
2. `implement #5` — Phase 2: Prisma schema, Auth.js v5 with GitHub OAuth (JWT), env validation, protected routes
