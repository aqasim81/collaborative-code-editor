# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
