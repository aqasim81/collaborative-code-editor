## Pre-computed Context

- Current branch: !`git branch --show-current`
- Git status: !`git status --short`
- Staged changes: !`git diff --cached --stat`
- Unstaged changes: !`git diff --stat`
- Recent commit style: !`git log --oneline -5`
- Remote tracking: !`git remote -v 2>/dev/null | head -2`

---

You are committing, pushing, and creating a PR. Follow this workflow:

## 1. Analyze Changes

Review the pre-computed context above. Determine:
- What files are changed (staged and unstaged)
- Whether changes are already staged or need staging
- The current branch name

If on `main`, ASK: "You're on main. Should I create a feature branch first? What should it be named?"

**WAIT for response if on main.**

## 2. Stage Changes

If there are unstaged changes that should be included:
```bash
git add {specific files}
```

Do NOT use `git add -A` or `git add .` — stage specific files only. Ask the user if unsure which files to include.

## 3. Draft Commit Message

Based on the diff and recent commit style, draft a conventional commit message:
- `feat:` for new features
- `fix:` for bug fixes
- `chore:` for maintenance
- `docs:` for documentation
- `test:` for tests
- `refactor:` for refactoring

Include a GitHub issue reference if the branch name contains an issue number.

Present the commit message and ASK: "Commit with this message? (or provide a different one)"

**WAIT for confirmation.**

## 4. Commit and Push

```bash
git commit -m "{message}"
git push -u origin $(git branch --show-current)
```

## 5. Create PR

Create a PR using `gh pr create`:

```bash
gh pr create \
  --title "{conventional commit title}" \
  --body "$(cat <<'EOF'
## Summary
- {1-3 bullet points describing the changes}

## Test plan
- [ ] {verification steps}

EOF
)"
```

## 6. Report

```
**Committed:** {hash} — {message}
**Branch:** {branch}
**PR:** {URL}
```
