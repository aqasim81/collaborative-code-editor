## Pre-computed Context

- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Recent deploys: !`git log --oneline -10 --format="%h %s (%cr)"`

---

You are performing an EMERGENCY hotfix on a production issue. This is an expedited workflow. Follow these steps IN ORDER.

---

## IMPORTANT: When to Use This Command

This command is for **production emergencies only**:
- Application is DOWN or critically broken
- Data loss is occurring or imminent
- Security vulnerability is being actively exploited
- Revenue-blocking issue (payments failing, signups broken)

For non-emergency bugs, use `/bug-fix` instead.

---

## 1. Load Context

Read these files in order:
1. `CLAUDE.md` — understand project stack and deployment setup
2. Check current branch: `git status`

If not on `main`, switch: `git checkout main && git pull origin main`

---

## 2. Emergency Assessment (PAUSE FOR USER)

ASK: "Describe the production emergency:
1. What is broken? (symptoms users are seeing)
2. When did it start? (to identify potential cause)
3. What is the business impact? (users affected, revenue impact)
4. Is there a GitHub Issue already? (provide number if yes)
5. Can the issue be mitigated by a rollback? (Y/N)"

**WAIT for the user to respond.**

---

## 3. Rollback Assessment

Before writing code, assess whether a rollback is faster:

1. Check recent deployments:
   ```bash
   git log --oneline -10 --format="%h %s (%cr)"
   ```

2. If the issue started after a recent deployment:
   Report:
   ```
   **Potential rollback candidate:**
   Commit: {hash} — {message} ({time ago})

   A rollback to the previous version may resolve this faster
   than a code fix.
   ```

   ASK: "Should we attempt a rollback, or proceed with a code fix?"

   **WAIT for response.**

   - If rollback: provide the exact rollback commands for the project's deployment platform (Vercel: redeploy previous, Railway: rollback, etc.) and STOP.
   - If code fix: continue below.

---

## 4. Create GitHub Issue (if needed)

### If GitHub Issue exists:
- Read the issue: `gh issue view {number}`

### If no GitHub Issue:
Create one immediately:
```bash
gh issue create \
  --title "HOTFIX: {short description}" \
  --label "bug,hotfix" \
  --body "Production emergency. {description of impact}"
```

---

## 5. Create Hotfix Branch

```bash
git checkout main
git pull origin main
git checkout -b hotfix/{issue-number}-{short-description}
```

---

## 6. Identify and Fix

### 6a. Rapid Root Cause Analysis
- Focus ONLY on the broken code path
- Check recent commits that may have caused the issue:
  ```bash
  git log --oneline -10
  git diff HEAD~3..HEAD -- {suspected files}
  ```
- Identify the minimal change needed

### 6b. Apply the Fix
- **Minimal change only** — fix the specific issue, nothing else
- Do NOT refactor, do NOT clean up, do NOT add features
- If the fix is a revert of a specific commit, use:
  ```bash
  git revert {commit-hash} --no-commit
  ```

### 6c. Commit the Fix
```bash
git add {specific files only}
git commit -m "hotfix: {description} (#{issue})"
```

---

## 7. Expedited Validation

Run the **minimum viable validation** to avoid shipping a broken fix:

1. **Type check:** `{type-check command from CLAUDE.md}`
2. **Run related tests only:** `{test command} -- {relevant test files}` (not the full suite if it takes > 2 minutes)
3. **Quick check of changed files:**
   ```bash
   git diff --name-only main
   ```

Report:
```
**Expedited validation:**
- Type check: PASS/FAIL
- Related tests: X passing, Y failing
- Changed files: {count}
```

If type check or related tests FAIL, fix immediately. Do not proceed with a failing fix.

---

## 8. Create PR and Merge (PAUSE FOR USER)

### Push and create PR:
```bash
git push -u origin hotfix/{issue-number}-{short-description}
```

### Create PR with expedited template:
```bash
gh pr create \
  --title "hotfix: {description} (#{issue})" \
  --body "$(cat <<'EOF'
## HOTFIX — Production Emergency

**Impact:** {what was broken, users affected}
**Root cause:** {brief explanation}
**Fix:** {what was changed}

## Expedited Validation
- Type check: PASS
- Related tests: PASS ({count} tests)
- Full validation deferred to post-merge

Closes #{issue}
EOF
)"
```

ASK: "PR created: {URL}. CI is running. Should I merge immediately (squash merge) once CI passes, or wait for your review?"

**WAIT for response.**

If approved for immediate merge:
```bash
gh pr merge --squash --delete-branch
```

---

## 9. Deploy and Verify (PAUSE FOR USER)

Provide deployment instructions based on the project's stack:

- **Vercel:** "Push to main triggers auto-deploy. Monitor the deployment."
- **Railway:** "Push to main triggers auto-deploy. Monitor at Railway dashboard."
- **Manual:** Provide the exact deploy commands from CLAUDE.md.

ASK: "Has the fix been deployed? Can you confirm the production issue is resolved?"

**WAIT for confirmation.**

---

## 10. Post-Hotfix Follow-Up (MANDATORY)

After confirming the fix is live:

### 10a. Full Validation
Run the complete validation suite now:
```bash
{full validate command from CLAUDE.md}
```

If any tests fail, create a follow-up GitHub Issue immediately.

### 10b. Add Regression Test
If the hotfix did not include a test (expedited path):
- Write a regression test covering the exact failure scenario
- Commit: `test: add regression test for hotfix (#{issue})`
- Push to main

### 10c. Update Documentation
- Update `docs/changelog.md` with the hotfix entry
- Update `docs/status.md` if applicable

### 10d. Post-Mortem (for Critical Issues)
If the issue caused downtime > 15 minutes or affected > 100 users, create a post-mortem:

```bash
gh issue create \
  --title "Post-mortem: {incident title}" \
  --label "post-mortem" \
  --body "$(cat <<'EOF'
## Post-Mortem: {Issue Title}

**Date:** {date}
**Duration:** {how long the issue lasted}
**Impact:** {users affected, revenue impact}

**Timeline:**
- {time}: Issue detected
- {time}: Hotfix started
- {time}: Fix deployed
- {time}: Issue confirmed resolved

**Root Cause:** {detailed explanation}
**Fix Applied:** {what was changed}

**Prevention:**
- [ ] {action item 1}
- [ ] {action item 2}
EOF
)"
```

---

## 11. Report

```
## Hotfix Complete

**Issue:** {description}
**Impact:** {what was broken}
**Root cause:** {explanation}
**Fix:** {what was changed}
**Time to resolution:** {duration}
**PR:** {URL}
**GitHub Issue:** #{number}
**Regression test:** {Added / Pending follow-up}
**Post-mortem:** {Required / Not required}

If follow-up items remain, they have been created as GitHub Issues.
```
