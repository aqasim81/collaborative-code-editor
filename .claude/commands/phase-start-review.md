Review whether this project was initialized correctly by checking against the `/phase-start` requirements.

## 1. Load Context

Read `CLAUDE.md` to understand the project stack and configuration.

## 2. Verification Checklist

Check each item and report PASS or MISSING:

### Plans & Documentation
- [ ] `plans/project.md` exists (original project brief)
- [ ] `plans/prd.md` exists with all required sections (overview, personas, requirements P0/P1/P2, non-functional, out of scope, success metrics)
- [ ] `plans/implementation_plan.md` exists with all required sections (architecture, directory structure, phased plan, dependencies, env vars)
- [ ] `plans/checklist.md` exists with correct structure per phase (Plan → Review → Implement → Review → Test → Fix → Update → Next)
- [ ] `plans/phases/` directory exists with one file per phase (`phase-N-{slug}.md`)
- [ ] Each phase file has: Goal, Summary, Files to Create, Key Design Decisions, Tests, Acceptance Criteria, Definition of Done

### Living Documentation
- [ ] `docs/architecture.md` exists with system design, data flow, and component relationships
- [ ] `docs/changelog.md` exists with Phase 0 entry
- [ ] `docs/status.md` exists with current phase, accomplishments, blockers, and next steps
- [ ] `docs/` directory is NOT in `.gitignore` (living docs should be committed)

### Project CLAUDE.md
- [ ] `CLAUDE.md` exists with all 14 required sections:
  1. Project title and description
  2. Status
  3. Stack (table format)
  4. Directory Structure
  5. Commands (including coverage command)
  6. Architecture (with link to `docs/architecture.md`)
  7. Coding Conventions
  8. Error Handling
  9. Testing (with 80% coverage target and CI reference)
  10. Security
  11. Git Workflow
  12. Anti-Patterns
  13. Session Workflow (with build-phase guidance)
  14. References (including links to `docs/` files)
- [ ] "No AI attribution" rule is present
- [ ] Session Workflow includes: starting a session, during development, development workflows, end of session
- [ ] References section links to `docs/architecture.md`, `docs/changelog.md`, `docs/status.md`
- [ ] CLAUDE.md is consistent with global standards in `projects/.claude/CLAUDE.md`

### Quality Infrastructure
- [ ] Linter configured (biome.json / ruff in pyproject.toml / .golangci.yml)
- [ ] Formatter configured
- [ ] Type checker configured (tsconfig.json strict / mypy / go vet)
- [ ] Pre-commit hooks set up (lefthook.yml / .husky/)
- [ ] `.editorconfig` exists
- [ ] Coverage enforcement configured with 80% threshold (check vitest.config.ts / pyproject.toml / Makefile)
- [ ] Validation command runs all checks (lint + type check + tests with coverage)

### CI/CD
- [ ] `.github/workflows/ci.yml` exists
- [ ] CI includes: lint, type check, test with coverage
- [ ] CI triggers on push to main and pull requests to main
- [ ] CI uses correct package manager and runtime versions for the stack

### Security
- [ ] `.env.example` exists with all required variables (placeholder values only)
- [ ] `.gitignore` exists and includes:
  - `.env` and `.env.*` (with `!.env.example` exception)
  - `plans/`
  - `.claude/` (with `!.claude/commands/` exception)
  - Secret file patterns (`*.pem`, `*.key`, `credentials.*`)
  - Stack-specific patterns (node_modules, __pycache__, coverage dirs, etc.)
- [ ] No secrets committed: `git log --all --diff-filter=A -- '*.env' '*.pem' '*.key'` returns nothing unexpected

### Infrastructure
- [ ] Infrastructure needs were documented (services table with phase requirements)
- [ ] Phase 1 services provisioned or blockers explicitly noted

### Claude Code Environment
- [ ] `.claude/commands/` directory exists with all 9 command files:
  - `phase-start.md`
  - `phase-next.md`
  - `phase-review.md`
  - `phase-start-review.md`
  - `project-status.md`
  - `bug-fix.md`
  - `hotfix.md`
  - `release.md`
  - `commit-push-pr.md`
- [ ] `.claude/skills/pm/` directory exists with 2 skill files:
  - `SKILL.md`
  - `detect-state.sh` (executable)
- [ ] `.claude/settings.json` exists with project-specific configuration
- [ ] MCP servers configured for project needs (database, browser testing, etc.) or explicitly skipped
- [ ] Hooks configured (post-tool-use test runner) or explicitly skipped
- [ ] Permissions pre-configured for routine operations (git, lint, test commands)

### Git & GitHub
- [ ] Git repository initialized
- [ ] Remote origin configured (check with `git remote -v`)
- [ ] Main branch pushed to remote

## 3. Summary

Present results:

```
## Project Start Review: {project name}

**Checks passed:** X / Y
**Checks failed:** Z

### Missing or Incorrect:
1. {Description of what's missing and how to fix it}
2. {Description of what's missing and how to fix it}

### Verdict: PASS / NEEDS FIXES
```

If NEEDS FIXES, offer to fix the issues automatically.
