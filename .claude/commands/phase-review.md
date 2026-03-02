## Pre-computed Context

- Current branch: !`git branch --show-current`
- Recent changes: !`git diff --stat HEAD~5 2>/dev/null || git diff --stat`
- Changed files: !`git diff --name-only HEAD~5 2>/dev/null || git diff --name-only`
- Checklist snapshot: !`cat plans/checklist.md 2>/dev/null || echo "No checklist found"`

---

Review the code written in this phase.

## 1. Load Context

Read `CLAUDE.md`, `plans/checklist.md` (identify current phase), and the phase plan `plans/phases/phase-N-{slug}.md`.

## 2. Identify Scope

Determine files created/modified in this phase via `git diff` against last phase completion or the phase plan file list.

## 3. Review Categories

Review all phase code for these 8 categories:

1. **Code quality & standards** — naming, function length, SRP, DRY, CLAUDE.md conventions
2. **Bugs & edge cases** — null handling, error handling, race conditions, unhandled exceptions
3. **Refactoring opportunities** — extract methods, simplify logic, remove duplication
4. **Security** — hardcoded secrets, input validation, injection risks, CORS
5. **Performance** — N+1 queries, unnecessary loops, missing indexes, blocking async calls
6. **Type safety** — missing types, loose typing, `any` types, unchecked casts
7. **Test quality** — meaningful tests (behavior not implementation), edge cases covered, missing scenarios from phase plan
8. **Accessibility** — WCAG 2.1 AA: semantic HTML, ARIA, keyboard nav, contrast (skip for non-UI projects)

## 4. Issue Format

For each issue: file:line, category, description, severity (HIGH/MEDIUM/LOW), suggested fix. Prioritize HIGH first.

## 5. Coverage Check

Run coverage command from CLAUDE.md. Report overall %, threshold (80%), pass/fail. If failing, identify modules below threshold.

## 6. Checklist & Secrets Verification

- Verify `plans/checklist.md` is up to date
- Check no `.env`/secrets are staged: `git diff --cached --name-only | grep -E '\.env|secret|credential|\.pem|\.key'`
- Run full validation command

## 7. Summary

Report: files reviewed count, issues by severity, coverage %, validation result, secrets check, checklist status.

**Verdict: PASS** (no blocking issues) or **FAIL** (list HIGH/MEDIUM issues to fix). Re-run after fixes to confirm.
