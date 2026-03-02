You are initializing a new project. Follow these steps IN ORDER. Do NOT skip steps. Pause where indicated and wait for user input.

---

## Pre-flight Check

1. Confirm you are inside a project directory under `projects/{category}/{project-name}/`
2. Check if a `plans/` directory already exists:
   - If YES: Tell the user "Project already initialized. Use `/phase-next` to continue development." and STOP.
   - If NO: Continue with initialization below.
3. Verify a `project.md` file exists in this directory. If not, STOP and tell the user to create one first.
4. Read `project.md` to understand the project scope.
5. Read the global standards at the nearest `projects/.claude/CLAUDE.md` (navigate up from current directory).

---

## Step 1: Project Refinement (PAUSE FOR USER)

After reading `project.md`, perform these checks before proceeding to stack selection:

### 1a. Classify the Project Type

Determine and state what this project is:
- **Learning project** — exploring a technology, no users expected
- **Prototype** — validating an idea, throwaway code acceptable
- **Alpha / MVP** — first real version, core features only, real users expected
- **Production-ready** — full feature set, polished, scalable

### 1b. Identify Gaps and Ambiguities

Review `project.md` for completeness. Flag anything that is:
- Missing (e.g., no target users defined, no success metrics, no scope boundaries)
- Ambiguous (e.g., "should handle payments" without specifying provider or flow)
- Risky (e.g., dependencies on unproven APIs, unrealistic scope for an MVP)

### 1c. Ask the 3 Critical Questions

Based on your analysis, ask the user the **3 most important questions** that must be answered to build the MVP successfully. These should address the biggest unknowns or assumptions in `project.md`.

Format:
```
**Project type:** {classification}

**Gaps found:**
1. {gap or ambiguity}
2. {gap or ambiguity}
...

**3 critical questions before we proceed:**
1. {question}
2. {question}
3. {question}
```

ASK: "Please answer the questions above. I'll incorporate your answers before moving to stack selection."

**WAIT for the user to respond before proceeding.**

Update your understanding of the project based on their answers. If answers reveal significant scope changes, note them for inclusion in the PRD.

---

## Step 2: Stack Proposal (PAUSE FOR USER)

Read `project.md` thoroughly. Based on the project requirements and the user's answers from Step 1, propose **3 different technology stacks**. For each stack provide:

| Criteria | Stack 1: {Name} | Stack 2: {Name} | Stack 3: {Name} |
|----------|-----------------|-----------------|-----------------|
| Core technologies | (with specific versions) | | |
| Why it fits | | | |
| Trade-offs | | | |
| Build time estimate | | | |
| Ecosystem maturity | | | |

State your recommendation and why.

ASK: "Which stack would you like to use? (1, 2, 3, or describe modifications)"

**WAIT for the user to choose before proceeding.**

---

## Step 3: Write PRD and Implementation Plan

Based on the chosen stack, create the `plans/` directory and write TWO files:

### `plans/prd.md`

Include these sections:
- Product overview and problem statement
- Target user personas (primary, secondary)
- Functional requirements grouped by priority (P0 = must-have, P1 = should-have, P2 = nice-to-have)
- Non-functional requirements (performance, security, accessibility, reliability)
- Out of scope (explicit boundaries to prevent scope creep)
- Success metrics

### `plans/implementation_plan.md`

Include these sections:
- Architecture overview with data flow description
- Complete directory structure for the chosen stack
- Phased implementation plan — each phase gets:
  - Goal (one sentence)
  - Files to create (table: file path | purpose)
  - Key design decisions
  - Tests to write (table: test file | what it covers)
  - Acceptance criteria (checkbox list)
- Database schema (if applicable)
- API design (if applicable)
- Full dependency list with pinned versions
- All environment variables the project will need

Move the original `project.md` into `plans/project.md`.

**Do NOT start any implementation code.**

---

## Step 4: Quality Infrastructure

Based on the chosen stack, set up code quality and coverage tooling:

### For Node.js/TypeScript projects:
- `biome.json` — strict linting and formatting rules (or ESLint + Prettier if the stack requires it)
- `tsconfig.json` — `strict: true`, zero `any` types, path aliases
- Pre-commit hooks via lefthook or Husky + lint-staged
- `.editorconfig` for consistent formatting across editors
- Coverage via Vitest's built-in V8 provider with enforced thresholds in `vitest.config.ts`:
  ```typescript
  export default defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary', 'lcov', 'html'],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        exclude: [
          'node_modules/',
          'dist/',
          '**/*.config.*',
          '**/*.d.ts',
          '**/types/**',
          '**/__tests__/**',
          '**/*.test.*',
          '**/*.spec.*',
        ],
      },
    },
  });
  ```
- Add coverage scripts to `package.json`:
  ```json
  {
    "scripts": {
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage"
    }
  }
  ```
- Note: use `--passWithNoTests` if no test files exist yet during Phase 0

### For Python projects:
- `pyproject.toml` — Ruff (linting + formatting), mypy (strict), pytest config, coverage config
- Coverage via `pytest-cov` with enforced thresholds in `pyproject.toml`:
  ```toml
  [tool.pytest.ini_options]
  addopts = "--cov=src --cov-report=term-missing --cov-report=html --cov-report=lcov"

  [tool.coverage.run]
  source = ["src"]
  omit = ["*/tests/*", "*/test_*", "*/__pycache__/*", "*/conftest.py"]

  [tool.coverage.report]
  fail_under = 80
  show_missing = true
  exclude_lines = [
      "pragma: no cover",
      "if TYPE_CHECKING:",
      "if __name__ == .__main__.:",
  ]
  ```
- `Makefile` with targets: `fmt`, `fmt-check`, `lint`, `typecheck`, `test`, `coverage`, `coverage-check`, `validate` (runs all)
  ```makefile
  coverage:          ## Run tests with coverage report
  	pytest --cov --cov-report=term-missing --cov-report=html
  coverage-check:    ## Run tests and fail if coverage < 80%
  	pytest --cov --cov-fail-under=80
  ```
- Pre-commit hooks with ruff, mypy, gitleaks
- `.editorconfig`

### For Go projects:
- `.golangci.yml` with strict linter config
- Coverage via `go test` built-in coverage with enforced threshold in `Makefile`:
  ```makefile
  COVERAGE_THRESHOLD=80

  coverage:          ## Run tests with coverage report
  	go test -coverprofile=coverage.out -covermode=atomic ./...
  	go tool cover -html=coverage.out -o coverage.html
  	go tool cover -func=coverage.out

  coverage-check:    ## Run tests and fail if coverage < threshold
  	go test -coverprofile=coverage.out -covermode=atomic ./...
  	@COVERAGE=$$(go tool cover -func=coverage.out | grep total | awk '{print substr($$3, 1, length($$3)-1)}'); \
  	echo "Total coverage: $${COVERAGE}%"; \
  	if [ $$(echo "$${COVERAGE} < $(COVERAGE_THRESHOLD)" | bc -l) -eq 1 ]; then \
  		echo "FAIL: Coverage $${COVERAGE}% is below threshold $(COVERAGE_THRESHOLD)%"; \
  		exit 1; \
  	fi
  ```
- `Makefile` with targets: `fmt`, `vet`, `lint`, `test`, `coverage`, `coverage-check`, `audit` (runs all)
- `lefthook.yml` with gitleaks and lint hooks
- `.editorconfig`

### For ALL stacks:
- Gitleaks configuration for secret scanning in pre-commit hooks
- Coverage enforcement: **80% minimum** on lines, branches, functions, and statements — enforced via tooling, not aspirational
- Coverage reports generated in both terminal and HTML formats
- Coverage output directories added to `.gitignore`
- The `validate` (or `audit`) command must run ALL checks including coverage enforcement:
  - Node.js: `pnpm lint && pnpm type-check && pnpm test:coverage`
  - Python: `make validate` (runs `fmt-check lint typecheck coverage-check`)
  - Go: `make audit` (runs `fmt vet lint coverage-check`)

---

## Step 5: CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/ci.yml` to enforce quality checks on every push and pull request.

### For Node.js/TypeScript projects:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: Lint, Type Check, Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Test with coverage
        run: pnpm test:coverage

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 14
```

### For Python projects:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: Lint, Type Check, Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install uv
        uses: astral-sh/setup-uv@v4

      - name: Install dependencies
        run: uv sync --frozen

      - name: Format check
        run: make fmt-check

      - name: Lint
        run: make lint

      - name: Type check
        run: make typecheck

      - name: Test with coverage
        run: make coverage-check

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: htmlcov/
          retention-days: 14
```

### For Go projects:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    name: Lint, Vet, Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version-file: go.mod

      - name: Vet
        run: go vet ./...

      - name: Lint
        uses: golangci/golangci-lint-action@v6

      - name: Test with coverage
        run: make coverage-check

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage.html
          retention-days: 14
```

### For ALL stacks:
- The CI workflow must be created **before** the first `git commit` so it is included in the initial commit
- Adjust package manager (`pnpm`/`npm`/`yarn`/`bun`), runtime versions, and dependency install commands to match the chosen stack
- If the project uses a database, add a PostgreSQL service container under the `ci` job:
  ```yaml
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
        POSTGRES_DB: test
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  ```
- Do NOT add secrets to the workflow file. If the project needs API keys for tests, use `env:` with `${{ secrets.KEY_NAME }}` and document the required secrets in `.env.example`

---

## Step 6: Security Setup

### `.env.example`
Create with ALL environment variables from the implementation plan. Use empty values or descriptive placeholders:
```
# === Database ===
DATABASE_URL=             # PostgreSQL connection string

# === Authentication ===
AUTH_SECRET=              # Generate: openssl rand -hex 32

# === External APIs ===
# API_KEY=                # Get from: https://...
```

### `.gitignore`
Create a comprehensive `.gitignore`. It MUST include these baseline patterns plus stack-specific ones:

```
# Secrets — NEVER commit
.env
.env.*
!.env.example
*.pem
*.key
*.p12
*.pfx
credentials.*
secrets.*

# Internal docs
plans/

# Claude Code config (allow commands to be committed)
.claude/
!.claude/commands/

# IDE
.idea/
.vscode/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
```

Add stack-specific patterns:
- Node.js: `node_modules/`, `.next/`, `dist/`, `*.tsbuildinfo`, `coverage/`
- Python: `__pycache__/`, `*.pyc`, `.venv/`, `.mypy_cache/`, `.ruff_cache/`, `htmlcov/`, `.coverage`, `coverage.lcov`, `.pytest_cache/`
- Go: `bin/`, `vendor/` (if not vendoring), `coverage.out`, `coverage.html`

### Environment validation
Note in the implementation plan that Phase 1 MUST include an environment validation module:
- TypeScript: Zod schema in `src/lib/env.ts` or `lib/env.ts`
- Python: Pydantic `BaseSettings` or manual validation in `config.py`
- Go: Struct with env tags + validation in `internal/config/config.go`

---

## Step 7: Infrastructure Provisioning (PAUSE FOR USER)

Based on the chosen stack and implementation plan, identify ALL external services the project needs.

### List services by phase

Create a table:

| Service | Needed by Phase | Status | Notes |
|---------|----------------|--------|-------|
| {e.g., PostgreSQL database} | Phase 1 | ? | {provider suggestion, e.g., Supabase, Neon, Railway} |
| {e.g., Auth provider} | Phase 1 | ? | {e.g., Clerk, Auth.js, Supabase Auth} |
| {e.g., File storage} | Phase 3 | ? | {e.g., S3, Cloudflare R2} |
| {e.g., Email service} | Phase 4 | ? | {e.g., Resend, SendGrid} |
| {e.g., Payment processor} | Phase 5 | ? | {e.g., Stripe, Lemon Squeezy} |
| {e.g., Hosting/deployment} | Phase 1 | ? | {e.g., Vercel, Railway, Fly.io} |

### Phase 1 priority

Highlight which services are **required for Phase 1** vs which can wait. Only Phase 1 services need to be provisioned now.

ASK: "Here are the external services this project needs. Have you provisioned the Phase 1 services? List any that are ready and any blockers. (Services needed for later phases can wait.)"

**WAIT for the user to respond.**

Update `.env.example` with any new variables from provisioned services.

---

## Step 8: Create Phase Files, Checklist, and Living Docs

### `plans/phases/`

Create one markdown file per phase from the implementation plan:
- Naming convention: `phase-N-{short-description}.md` (e.g., `phase-1-project-scaffolding.md`)
- Each file includes:
  - **Goal** (one sentence)
  - **Summary** (timeline, effort level, dependencies)
  - **Files to Create** (table: file | purpose)
  - **Key Design Decisions** (numbered list)
  - **Tests** (table: test file | what it covers)
  - **Acceptance Criteria** (checkbox list)
  - **Definition of Done** — phase-specific criteria (derived from acceptance criteria) PLUS universal quality gates:
    ```markdown
    ### Definition of Done
    **Phase-specific:**
    - [ ] {acceptance criterion 1}
    - [ ] {acceptance criterion 2}
    - [ ] {acceptance criterion 3}

    **Universal quality gates:**
    - [ ] All new/modified code has tests
    - [ ] All tests passing (`{validate command}`)
    - [ ] Coverage >= 80% on new code
    - [ ] No linting or type errors
    - [ ] Code reviewed (self-review or `/phase-review`)
    - [ ] `docs/changelog.md` updated with phase changes
    - [ ] `docs/status.md` updated with current state
    - [ ] All changes committed with conventional commits
    ```

### `plans/checklist.md`

Create the master checklist using this EXACT structure per phase:

```markdown
# {Project Name} — Implementation Checklist

> **Workflow per phase:** Plan → Review Plan → Implement → Review Implementation → Test → Fix → Update Checklist → Next Phase
>
> **Reference:** [PRD](./prd.md) | [Full Implementation Plan](./implementation_plan.md) | [Project Overview](./project.md)

---

## Phase N: {Phase Name}

> [Detailed plan](./phases/phase-N-{slug}.md) | Dependencies: {deps or None}

- [ ] **Plan** — Read the phase file, understand requirements, identify dependencies
- [ ] **Review the plan** — Verify approach before coding, clarify any unknowns
- [ ] **Implement the plan**
  - [ ] {Specific deliverable 1}
  - [ ] {Specific deliverable 2}
  - [ ] {Specific deliverable 3}
- [ ] **Review the implementation** — Code review for quality, security, adherence to CLAUDE.md standards
- [ ] **Test the implementation** — Run {stack-specific validate command}
- [ ] **Fix if required** — Address any issues found during review/testing
- [ ] **Update checklist** — Mark completed items above; update CLAUDE.md "Current Status"
- [ ] **Definition of Done verified** — All DoD items in phase file checked off
- [ ] **Ready for next phase** — All criteria met, proceed to Phase {N+1}

---
```

The LAST phase should end with `**Project complete**` instead of `**Ready for next phase**`.

### `docs/` — Living Documentation

Create a committed `docs/` directory with these files:

#### `docs/architecture.md`
Seed from the implementation plan's architecture section. Include:
- System design overview
- Data flow description
- Component relationships and boundaries
- Key technology choices and rationale
- Diagrams (ASCII or mermaid) where helpful

Add a note at the top: `> This is a living document. Update it as the architecture evolves during development.`

#### `docs/changelog.md`
Create with this template:
```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Phase 0 — Project Initialization
- Project scaffolded with {stack}
- Quality infrastructure configured (linting, formatting, type checking, coverage)
- CI/CD pipeline set up via GitHub Actions
- CLAUDE.md and phase plans created
```

#### `docs/status.md`
Create with this template:
```markdown
# Project Status

## Current Phase
Phase 0 complete — Project scaffolded. Next: Phase 1 ({name}).

## Accomplishments
- [x] Project spec refined and validated
- [x] Technology stack selected: {stack}
- [x] PRD and implementation plan written
- [x] Quality infrastructure and CI/CD configured
- [x] Phase files and checklist created

## Blockers
- None

## Next Steps
1. Begin Phase 1: {phase 1 name}
2. {first deliverable of Phase 1}
```

---

## Step 9: Write CLAUDE.md

Create the project's `CLAUDE.md` with these 14 sections:

1. **Project title and one-line description**
2. **Status** — "Phase 0 complete — Project scaffolded. Next: Phase 1 ({name})."
3. **Stack** — table format: Layer | Technology | Version
4. **Directory Structure** — planned structure from implementation plan
5. **Commands** — every build, test, lint, format, coverage, validate command for the stack (including `test:coverage` or equivalent)
6. **Architecture** — key patterns, data flow, design decisions (brief summary; link to `docs/architecture.md` for details)
7. **Coding Conventions** — stack-specific rules (TypeScript strict, Python type hints, etc.)
8. **Error Handling** — Result pattern or stack-appropriate approach
9. **Testing** — strategy, coverage targets (80% enforced), test file naming conventions, CI pipeline reference
10. **Security** — env var management, what must never be committed, secret scanning
11. **Git Workflow** — conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`), branch naming
12. **Anti-Patterns** — 5-10 specific things NOT to do (dead code, unused imports, any types, console.log, etc.)
13. **Session Workflow** — steps for starting a new Claude Code session on this project (see below)
14. **References** — links to `plans/prd.md`, `plans/implementation_plan.md`, `plans/checklist.md`, `docs/architecture.md`, `docs/changelog.md`, `docs/status.md`

### Section 13: Session Workflow (enhanced)

The Session Workflow section must include these build-phase best practices:

```markdown
## Session Workflow

### Starting a Session
1. Read this CLAUDE.md
2. Read `docs/status.md` for current state
3. Run `/phase-next` to continue development

### During Development
- **One task per conversation** — break large features into smaller chunks
- **Use `/clear` between major tasks** — reset context to prevent quality degradation
- **Use `/compact`** when context is long but you need continuity
- **Commit after each logical chunk** — never let a session run without committing

### Development Workflows
- **Single-feature flow:** Research → Plan → Implement → Test
- **Issue-based development:** Use GitHub issues as source of truth for bugs and features
- **Parallel work:** Use git worktrees for simultaneous features: `git worktree add ../feature-name feat/feature-name`

### End of Session
- Update `docs/changelog.md` with changes made
- Update `docs/status.md` with current state and next steps
- Ensure all changes are committed and pushed
```

**Mandatory rule in every CLAUDE.md:**
> **No AI attribution** — Never mention Claude, Anthropic, AI-generated, AI-assisted, or any AI tool names in code, comments, commits, README, or documentation. Exception: model ID strings in SDK calls (e.g., `"claude-sonnet-4-20250514"`).

Review the CLAUDE.md against global standards in `projects/.claude/CLAUDE.md` for consistency.

---

## Step 10: Set Up .claude/commands/ and .claude/skills/

Create the project's `.claude/commands/` and `.claude/skills/` directories and copy ALL workspace-level commands and skills into them. This is required because each project is its own git repo — Claude Code cannot traverse past the git boundary to find workspace-level commands.

### Commands

1. Create `.claude/commands/` in the project root
2. Copy these files from the nearest `projects/.claude/commands/`:
   - `phase-start.md`
   - `phase-next.md`
   - `phase-review.md`
   - `phase-start-review.md`
   - `project-status.md`
   - `bug-fix.md`
   - `hotfix.md`
   - `release.md`
   - `commit-push-pr.md`
3. Update `phase-next.md` to reference the correct validation command from the CLAUDE.md Commands section (if it differs from the default)

Verify: `ls .claude/commands/` should list 9 command files.

### Skills

4. Create `.claude/skills/pm/` in the project root
5. Copy these files from the nearest `projects/.claude/skills/pm/`:
   - `SKILL.md`
   - `detect-state.sh`
6. Ensure `detect-state.sh` is executable: `chmod +x .claude/skills/pm/detect-state.sh`

Verify: `ls .claude/skills/pm/` should list 2 skill files.

---

## Step 11: Claude Code Environment (PAUSE FOR USER)

Configure Claude Code tooling for this project: MCP servers, hooks, and permissions.

### 11a. MCP Configuration

Based on the chosen stack and services, identify which MCP servers would benefit this project.

**Common MCP servers by stack:**

| Stack/Need | MCP Server | Purpose |
|------------|-----------|---------|
| PostgreSQL | `@anthropic/postgres-mcp` or `@modelcontextprotocol/server-postgres` | Direct database queries and schema inspection |
| MongoDB | `mongodb-mcp-server` | Database operations |
| Frontend/UI | `@anthropic/playwright-mcp` or `@anthropic/puppeteer-mcp` | Browser testing and screenshots |
| File search | `@modelcontextprotocol/server-filesystem` | Enhanced file operations |

Present the recommended MCPs for this project:

```
**Recommended MCP servers for this project:**
1. {MCP name} — {why it's useful for this project}
2. {MCP name} — {why it's useful for this project}
```

ASK: "Which MCP servers would you like to enable? (Enter numbers, 'all', or 'none')"

**WAIT for the user to respond.**

Create or update `.claude/settings.json` with the selected MCP configurations:
```json
{
  "mcpServers": {
    "{server-name}": {
      "command": "{command}",
      "args": ["{args}"],
      "env": {
        "{ENV_VAR}": "{placeholder — fill from .env}"
      }
    }
  }
}
```

### 11b. Hooks Setup

Configure hooks in `.claude/settings.json` to automate quality checks:

```json
{
  "hooks": {
    "postToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "{stack-specific test command}",
        "description": "Run tests after file changes to catch regressions"
      }
    ]
  }
}
```

**Stack-specific test commands:**
- Node.js/TypeScript: `pnpm test -- --passWithNoTests`
- Python: `make test` or `pytest`
- Go: `go test ./...`

Note: Use `--passWithNoTests` (or equivalent) during early phases when test files may not exist yet.

### 11c. Permissions Pre-configuration

Add permissions to `.claude/settings.json` that pre-approve safe, routine operations:

```json
{
  "permissions": {
    "allow": [
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git branch *)",
      "Bash({lint-command})",
      "Bash({test-command})",
      "Bash({type-check-command})"
    ],
    "deny": [
      "Bash(git push --force *)",
      "Bash(git reset --hard *)",
      "Bash(rm -rf *)"
    ]
  }
}
```

Replace `{lint-command}`, `{test-command}`, and `{type-check-command}` with the actual commands from the CLAUDE.md Commands section.

Merge all three configs (MCPs, hooks, permissions) into a single `.claude/settings.json` file.

---

## Step 12: Initialize Git Repository

**Pre-commit verification:**
- Verify `.github/workflows/ci.yml` exists. If it was not created in Step 5, create it now before committing.

```bash
git init
git add -A
git commit -m "chore: initialize project with plans, quality infrastructure, CI pipeline, and CLAUDE.md"
```

**Post-commit security verification:**
Run these checks and FIX any failures before proceeding:
- `git ls-files | grep '\.env'` — should ONLY show `.env.example`
- `git ls-files | grep 'plans/'` — should return NOTHING (plans must be gitignored)
- `git ls-files | grep '\.claude/'` — should ONLY show files under `.claude/commands/` (everything else in .claude must be gitignored)
- Scan committed files for hardcoded secrets: look for patterns like `api_key=`, `secret=`, `password=`, `token=` with actual values

If any check fails, fix `.gitignore`, remove the tracked files with `git rm --cached`, and amend the commit.

---

## Step 13: Create GitHub Repository (PAUSE FOR USER)

Suggest a repo name derived from the directory name (lowercase, hyphens instead of underscores).

ASK: "What name would you like for the GitHub repository? Suggested: `{suggested-name}`
Also, should the repository be **public** or **private**?"

**WAIT for the user to respond.**

Then:
```bash
gh repo create {repo-name} --{public|private} --source=. --remote=origin
git branch -M main
git push -u origin main
```

---

## Step 14: Final Verification

Run through this checklist and report results:

### Plans & Documentation
- [ ] `plans/` directory exists with: `project.md`, `prd.md`, `implementation_plan.md`, `checklist.md`, `phases/`
- [ ] Project was refined in Step 1 (3 critical questions answered)

### Living Documentation
- [ ] `docs/architecture.md` exists with system design
- [ ] `docs/changelog.md` exists with Phase 0 entry
- [ ] `docs/status.md` exists with current phase and next steps

### CLAUDE.md
- [ ] `CLAUDE.md` exists with all 14 sections
- [ ] Session Workflow includes build-phase guidance (workflows, context management, end-of-session updates)
- [ ] References section links to `docs/` files
- [ ] No AI attribution rule present in CLAUDE.md

### Quality & CI
- [ ] Quality tooling configured (linter, formatter, type checker, pre-commit hooks)
- [ ] Coverage enforcement configured (80% threshold in tooling config)
- [ ] `.github/workflows/ci.yml` exists with lint, type check, test+coverage jobs

### Security
- [ ] `.gitignore` excludes: `plans/`, `.claude/` (except `.claude/commands/`), `.env*`, secrets patterns, coverage output directories
- [ ] `.gitignore` does NOT exclude `docs/` (living docs are committed)
- [ ] `.env.example` exists with all needed variables (placeholder values only)
- [ ] No secrets in the commit (verified in Step 12)

### Infrastructure
- [ ] Infrastructure needs documented (Step 7 table)
- [ ] Phase 1 services provisioned (or blockers noted)

### Claude Code Environment
- [ ] `.claude/commands/` exists with all 8 workspace command files committed
- [ ] `.claude/settings.json` has MCP entries configured (if applicable)
- [ ] `.claude/settings.json` has hooks configured for automated testing
- [ ] `.claude/settings.json` has permissions pre-configured for routine operations

### Git & GitHub
- [ ] Git repo initialized with clean first commit
- [ ] GitHub remote configured and pushed to main
- [ ] CI workflow triggered on push (verify via `gh run list`)

Report: "Project initialization complete. CI pipeline is active. Run `/phase-start-review` to verify all is setup and if good then run `/phase-next` to begin Phase 1."
