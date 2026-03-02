## Pre-computed Context

- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Checklist snapshot: !`cat plans/checklist.md 2>/dev/null || echo "No checklist found"`
- CLAUDE.md status: !`grep -m1 "Status" CLAUDE.md 2>/dev/null || echo "No status found"`

---

You are starting work on the next phase of this project. Follow this workflow:

## 1. Load Context

Read in order:
1. `CLAUDE.md` — project standards, stack, conventions, current status
2. `plans/checklist.md` — find the FIRST phase with unchecked items
3. `plans/implementation_plan.md` — full architecture context

If `plans/` does not exist: "Project not initialized. Run `/phase-start` first."

## 2. Identify Next Phase

From `plans/checklist.md`, find the first phase where NOT all workflow items are `[x]`.

Report: current phase number/name, progress within phase, dependency status.

If ALL phases are complete: "All phases complete — project is finished!"

### Resuming Mid-Phase

If some workflow steps are already checked, skip to the first unchecked step (Plan → Implement → Review → Test → Fix → Update checklist).

## 3. Read Phase Details

Read `plans/phases/phase-N-{slug}.md`

## 4. Create Implementation Plan

Present: files to create/modify, implementation order (types → core logic → integration → tests), key decisions, risks/edge cases, validation command from CLAUDE.md.

## 5. Confirm

ASK: "Ready to begin Phase {N}? Review the plan above or say 'go' to start."

**WAIT for user confirmation before writing any code.**

---

## 6. Implement

Execute the plan from step 4. Commit after each logical chunk using conventional commits (follow CLAUDE.md conventions). If blocked, ASK — do not guess. Implement ALL tests from the phase plan.

## 7. Validate

Run the project's validation command (from CLAUDE.md). Report lint, type check, tests (pass/fail count), coverage (pass if >= 80%). Fix failures and re-run until all pass.

## 8. Review

Review all phase changes against the 8 categories in `phase-review.md`. Fix HIGH/MEDIUM issues. Commit fixes as: `fix: address review feedback (phase N)`

## 8.5. Verify Definition of Done

Check every DoD item from `plans/phases/phase-N-{slug}.md` plus universal quality gates (tests, coverage >= 80%, no lint/type errors, code reviewed, changes committed). Report pass/fail for each. Fix any failures before proceeding. Docs updates happen in step 9.

## 9. Update Progress

1. Update `plans/checklist.md` — check off completed items
2. Update `CLAUDE.md` Status section
3. Update `docs/changelog.md` and `docs/status.md`
4. Commit: `chore: complete phase N — {phase name}`

## 9.5. Create Pull Request

If on a feature branch (not `main`), push and create a PR using the `/commit-push-pr` workflow. Include phase summary, test results, and coverage in the PR body.

## 10. Report

Summarize: phase name, what was built (1-3 bullets), tests/coverage results, commit count, PR URL (if created), and what's next.
