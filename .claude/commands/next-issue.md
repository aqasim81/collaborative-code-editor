## Pre-computed Context

- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Issue order: !`cat plans/issues/README.md 2>/dev/null || echo "No plans/issues/README.md found"`

---

Check the next issue from GitHub and see the plan/issues directory for the relevant implementation plan,
checklist and phases and follow the checklist strictly.

This command works one issue from start to merge and then stops. `scripts/issue-loop.sh` starts a fresh
session for the next issue (that fresh session is the checklist's `/clear`). Do exactly one issue.

## 0. Intake (owner's standing instruction)

Run this before picking the issue, and again just before printing `ISSUE <N> DONE` (so follow-ups filed
during the session are planned too). The rules are the "Intake" section of `plans/issues/README.md`:

- `gh issue list --state open --limit 100 --json number,title`. Every open issue missing from the order table
  (except the umbrella #10) is new.
- For each new issue, read the code it touches, then write `plans/issues/<N>/implementation-plan.md` and
  `phases/phase-<k>-<name>.md` in the format of the existing folders, and `checklist.md` from
  `plans/issues/_checklist-template.md` (steps 1–6 per phase, issue-end steps 7–15, boxes unticked).
- Add its row after the `in progress` row (or the last `done` row), and renumber the order.
- Planning an issue is not working on it: continue with your own single issue.

## 1. Pick the issue

- The issue is the first row of the order table in `plans/issues/README.md` whose status is not `done`.
- If every row is `done`, print `NO ISSUES LEFT` and stop.
- If that row is `blocked`, print `ISSUE <N> BLOCKED` with the reason from the issue's last comment, and stop.

## 2. Resume, don't restart

- `gh issue view <N> --json state -q .state`: if `CLOSED`, set the README row to `done (#<PR>)`, tick the
  checklist, print `ISSUE <N> DONE` and stop.
- If the branch named in the README exists (locally or on origin), switch to it and continue. If a PR exists
  for it (`gh pr list --head <branch> --state all`), continue from that PR.
- Otherwise: `git switch main && git pull`, then `git switch -c <branch>`.
- Ticked boxes in `plans/issues/<N>/checklist.md` are finished work; start at the first unticked box.
- Set the README row status to `in progress` when you start.

## 3. Follow the checklist strictly

Read `CLAUDE.md`, `docs/status.md`, `gh issue view <N>`, `plans/issues/<N>/implementation-plan.md`, then
work `plans/issues/<N>/checklist.md` in order: every phase, then the issue-end steps once. Read each phase's
file in `plans/issues/<N>/phases/` when you plan that phase. Tick each box as soon as its step is done.

**Every phase** (plan, review the plan, implement with tests, check the tests, then):
- **Targeted tests:** `pnpm --filter <pkg> test` for each package the phase changed (`@collab-editor/web`,
  `@collab-editor/ws-server`; a `packages/shared` change runs both apps), plus `pnpm --filter <pkg> exec tsc
  --noEmit` when types changed. A phase that changes only docs or harness files runs nothing here, or
  `bash .claude/hooks/tests/guard-bash.test.sh` when a hook changed. Fix the code, not the tests.
- **Commit** the phase with a conventional message referencing the issue.

**Once per issue**, after the last phase:
- **Simplify:** run the `simplify` skill once on the whole diff (`git diff main...HEAD`) and commit any cleanups.
- **Invariant audit:** run the `invariant-auditor` agent on the diff. Skip it only under the docs-only rule in
  `.claude/rules/ai-native-workflow.md` ("Fresh eyes"), and then write "audit skipped: docs-only" in the PR body.
- **Full gate:** `make verify` must print `VERIFY OK` (and `pnpm build` must exit 0 if the plan asks); fix the
  code, not the tests.
- **PR:** write the PR body (from `.github/PULL_REQUEST_TEMPLATE.md`, with `Closes #<N>`) to the scratchpad and
  pass it to `gh pr create` with `--body-file`.
- **Code review:** run the `code-review` skill on the PR, fix what it finds and push.
- **Merge without asking.** The owner has authorised merging inside this loop. Wait with
  `gh pr checks <PR> --watch` until every check is green, then
  `gh pr merge <PR> --squash --delete-branch --subject "<PR title>" --body "<short summary>"`.
  `main` is protected (CLAUDE.md, Git Workflow): if the merge is refused because the branch is behind, run
  `gh pr update-branch <PR>`, watch the checks again, then merge. Never bypass the protection.
  Then `git switch main && git pull` and wait for the `main` CI run for the merge commit to finish
  (`gh run list --branch main --limit 1`, `gh run watch <id> --exit-status`). It must succeed.
- **Bookkeeping:** tick the checklist, set the README row to `done (#<PR>)`, and for Phase 7 issues tick
  `plans/issues/10/checklist.md`. After #38 merges, close umbrella issue #10 with a comment.
- **Close:** confirm the issue is `CLOSED`; if not, close it with a comment linking the PR.
- **Intake and stop — do not start the next issue.** Run the intake (§0) again. Stop any dev server or other
  background process you started, make sure you are on a clean, pulled `main`, print `ISSUE <N> DONE` and end
  the session.

A checklist with a 13-step loop per phase is the old format: follow the steps above. Tick a phase's steps 5–7
once its targeted tests pass and it is committed (so resuming lands on the next phase), and tick every phase's
step 8 with PR, 9 with Code review, 10 with Merge, 11 with Bookkeeping, 12 with Close and 13 with Intake and stop.

## Blocked

If you cannot finish (a new env var with no safe default, CI failing after three fix attempts, missing access,
or a decision the plans don't answer): commit and push what you have on the branch, comment on the issue with
what is done and what is blocking, set the README row to `blocked`, print `ISSUE <N> BLOCKED` and stop.

Never work around a guard hook. If a protected path needs a change the generators can't make (a hand-edited
migration backfill, say), stop and mark the issue blocked.

## Rules that still apply

- No AI attribution anywhere: no `Co-Authored-By` trailer, no tool names in commits, PR bodies or merge messages.
- Never read or write real `.env` files. Reading and editing the committed `.env.example` (placeholders only)
  is allowed. Never push to `main` or force-push.
- Don't add features beyond the issue; file gaps as new GitHub issues.
- Update `docs/changelog.md`, `docs/status.md` and the CLAUDE.md Status line as the checklist's docs phase says.
