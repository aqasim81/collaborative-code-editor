## Pre-computed Context

- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Recent commits: !`git log --oneline -10`
- Project initialized: !`ls plans/ 2>/dev/null && echo "Yes" || echo "No"`

---

You are fixing a bug in this project. Follow these steps IN ORDER.

## 1. Load Context

Read `CLAUDE.md` and `plans/checklist.md`. If `plans/` does not exist: "Project not initialized. Run `/phase-start` first."

## 2. Understand the Bug (PAUSE)

ASK: "Describe the bug: expected vs actual behavior, repro steps, and GitHub Issue number if one exists."

**WAIT for response.**

## 3. Triage

Classify severity: **Critical** (crash/data loss/security — suggest `/hotfix` if in production), **High** (major feature broken), **Medium** (partial breakage, workaround exists), **Low** (cosmetic/edge case).

Identify affected files, check if this is a regression from recent commits, and note any test gaps.

## 4. GitHub Issue

If user provided an issue number: read it with `gh issue view {number}`.
If no issue exists: ASK if you should create one. **WAIT for response.**

## 5. Create Branch

Checkout from main: `fix/{issue-number}-{short-description}` (or `fix/{short-description}` if no issue).

## 6. Reproduce and Locate

Reproduce the bug, trace the code path to the root cause, check for related existing tests.

Report: root cause, files to modify (with line numbers), related test files.

## 7. Fix Implementation

### 7a. Write the Fix
Apply the minimal fix. Do NOT refactor unrelated code. Follow CLAUDE.md conventions.

### 7b. Regression Test (MANDATORY)
Every bug fix MUST include a regression test that would fail before the fix and passes after. Add to existing test file or create `{module}.test.{ext}`.

### 7c. Commit
Commit the fix and test separately using conventional commits referencing the issue.

## 8. Validate

Run the project's full validation command (from CLAUDE.md). Report lint, type check, tests, coverage. Fix failures and re-run until all pass.

## 9. Create Pull Request

Push the branch and create a PR using the `/commit-push-pr` workflow. Include bug severity, root cause, regression test details, and `Closes #{issue}` in the body.

## 10. Post-Fix

Update `docs/changelog.md` under `### Fixed`.

## 11. Report

Summarize: bug description, severity, root cause, fix applied, regression test file, PR URL, and GitHub issue number.
