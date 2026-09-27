# AI-native workflow (starter kit rules — apply in every session)

**Artifact chain.** Every change of substance moves through files (local and gitignored in this public repo):
`intent/NNNN-name.md` (what and why; skill `intent-writer`) → `specs/NNNN-name.md` (requirements, design,
flagged concerns) → `plans/changes/NNNN-name.md` (files, order, risks, proof) → branch + tests → PR.
Whole-project planning (`plans/prd.md`, `plans/implementation_plan.md`, `plans/checklist.md`) comes from
`/phase-start` or `/pm`. Lasting decisions get an ADR in `docs/adr/`. Templates: `docs/templates/`.

**Plan first.** Start non-trivial work in plan mode; name the files, the order, the risks and the exact
commands that prove it. When implementation departs from the plan, update the plan in the same commit.

**Verify before "done".** The single gate is `make verify` (or the verify/validate script named in CLAUDE.md
Commands). Run it before reporting any task complete and paste the real output. If a test fails, fix the
code, not the test. For UI or document output, render it, look at it, compare with the plan.

**Stop conditions are commands.** With `/goal`, state done as checks with exit codes plus a turn cap:
`/goal <task> done = make verify passes AND <specific check>. Stop after 6 tries.` Never "make it good".

**Bugs.** Write the failing test first and commit it; then `export CLAUDE_FIX_MODE=1` (tests become
read-only) and fix the code.

**Fresh eyes.** Use the `verify-app` subagent to check finished work, `invariant-auditor` when core logic
changes, `code-simplifier` before a PR. The agent that wrote the code never approves it. Skip
`invariant-auditor` (the docs-only rule) only when every changed file is under `docs/` but not `docs/templates/`,
or is `README.md` or `LICENSE` at the repo root. Anything else runs it, including `CLAUDE.md`, `REVIEW.md`,
`.claude/**`, `docs/templates/**` and any other `*.md`.

**Fix the system, not the output.** When a result misses the bar, change the check, skill, hook or CLAUDE.md
so it can't recur. When Claude makes the same mistake twice, add it to the mistakes section of CLAUDE.md ("Things Claude gets wrong" or "Known mistakes to avoid").

**Git.** Branch per change (`feat/`, `fix/`, `chore/`), conventional commits, never push to main, PRs use
`.github/PULL_REQUEST_TEMPLATE.md` and are reviewed against `REVIEW.md`. No AI attribution in any artifact.

**Parallel work.** Independent tasks touching different files may run in separate worktrees
(`claude --worktree <name>`); tasks sharing files run in one session, one after another.
