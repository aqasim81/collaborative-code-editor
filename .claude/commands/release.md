## Pre-computed Context

- Current branch: !`git branch --show-current`
- Latest tags: !`git tag --sort=-v:refname | head -5`
- Commits since last tag: !`git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline 2>/dev/null || echo "No tags yet"`
- Changelog: !`head -30 docs/changelog.md 2>/dev/null || echo "No changelog found"`

---

You are creating a release for this project. Follow these steps IN ORDER.

---

## 1. Load Context

Read these files in order:
1. `CLAUDE.md` — understand project stack, deployment setup, current status
2. `docs/changelog.md` — understand what has changed since the last release
3. `docs/status.md` — current project state

If `docs/` or `CLAUDE.md` does not exist, tell the user: "Project not initialized. Run `/phase-start` first."

---

## 2. Determine Release Type (PAUSE FOR USER)

Release from an up-to-date `main`, so the version reflects everything merged:
```bash
git switch main && git pull --tags
```

### Check current version:
```bash
git tag --sort=-v:refname | head -5
```

If no tags exist, the next version is `v0.1.0` (portfolio project) or `v1.0.0` (revenue product at first public launch).

### Analyze changes since last release:
```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline --format="%s"
```

Categorize commits:
- **Breaking changes** (any commit with `!` after type, or BREAKING CHANGE in body) → MAJOR bump
- **New features** (`feat:` commits) → MINOR bump
- **Bug fixes only** (`fix:` commits) → PATCH bump

Present:
```
**Current version:** {version or "no releases yet"}
**Commits since last release:** {count}
  - {N} feat commits
  - {N} fix commits
  - {N} chore/docs/other commits
  - {N} breaking changes

**Suggested next version:** v{X.Y.Z} ({MAJOR/MINOR/PATCH} bump)
**Reason:** {explanation}
```

ASK: "Confirm the version for this release (suggested: v{X.Y.Z}), or specify a different version."

**WAIT for the user to respond.**

---

## 3. Pre-Release Validation

`main` is protected (PRs only, required checks, admins included), so the release is made on a branch cut from the
`main` pulled in §2:
```bash
git switch -c chore/release-vX.Y.Z
```

Run the project's FULL validation suite:
```bash
{full validate command from CLAUDE.md}
```

Report:
- **Lint:** pass/fail
- **Type check:** pass/fail
- **Tests:** X passing, Y failing
- **Coverage:** XX%

**If ANY check fails, STOP.** Tell the user: "Validation failed. Fix the issues before creating a release." Provide details of the failures.

---

## 4. Update Changelog

Update `docs/changelog.md` — move `[Unreleased]` to a versioned section, and leave a fresh, empty `[Unreleased]` above
it:

```markdown
## [Unreleased]

### Added

### Fixed

### Changed

## [vX.Y.Z] — YYYY-MM-DD

### Added
- {feat: commits, grouped and described in user-facing language}

### Fixed
- {fix: commits, grouped and described}

### Changed
- {refactor: and chore: commits that affect behavior}

### Breaking Changes
- {any breaking changes, with migration instructions}
```

Commit:
```bash
git add docs/changelog.md
git commit -m "docs: update changelog for vX.Y.Z"
```

---

## 5. Version Bump (Stack-Specific)

### Node.js/TypeScript:
```bash
npm version {major|minor|patch} --no-git-tag-version
git add package.json
git commit -m "chore: bump version to vX.Y.Z"
```

### Python:
Update version in `pyproject.toml`, then:
```bash
git add pyproject.toml
git commit -m "chore: bump version to vX.Y.Z"
```

### Go:
No file to update — version is the git tag itself. Skip this step.

---

## 6. Merge the Release PR, Tag, and Create the GitHub Release

### Open the release PR:
Write the PR body from `.github/PULL_REQUEST_TEMPLATE.md` (the vX.Y.Z changelog section under "What changed"), then:
```bash
git push -u origin chore/release-vX.Y.Z
gh pr create --title "chore(release): vX.Y.Z" --body-file {body file}
```

### Merge it once the required checks pass:
```bash
gh pr checks {PR} --watch
gh pr merge {PR} --squash --delete-branch
```
If the merge is refused because the branch is behind `main` (strict protection: something merged while the checks
ran), run `gh pr update-branch {PR}`, watch the checks again, then merge. Never bypass the protection.

### Tag the merge commit on `main`:
Tag the release PR's squash-merge commit: not the branch commit (it is not on `main`), and not `main`'s tip (another
PR may have merged since). Only the tag is pushed.
```bash
git switch main && git pull
sha=$(gh pr view {PR} --json mergeCommit -q .mergeCommit.oid)
git log -1 --oneline "$sha"   # the "chore(release): vX.Y.Z" merge commit
git tag -a vX.Y.Z "$sha" -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Create GitHub Release:
```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes "$(cat <<'EOF'
## What's New

### Added
- {features from changelog}

### Fixed
- {fixes from changelog}

### Breaking Changes
- {if any, with migration instructions}

**Full Changelog:** https://github.com/{owner}/{repo}/compare/{prev-tag}...vX.Y.Z
EOF
)"
```

---

## 7. Deploy to Staging (PAUSE FOR USER)

Deployment steps vary by platform:

**Vercel (most Next.js projects):**
- Merging the release PR into main triggers auto-deploy
- Check the deployment dashboard or use `vercel` CLI

**Railway:**
- If a staging environment exists: `railway up --environment staging`

**Manual/Other:**
- Follow the project's documented deployment process in CLAUDE.md

Present the smoke test checklist:

```
### Smoke Test Checklist
- [ ] Application loads without errors
- [ ] Health/status endpoint returns 200
- [ ] Authentication flow works (login, logout)
- [ ] Core feature #1: {project-specific}
- [ ] Core feature #2: {project-specific}
- [ ] Database connectivity verified
- [ ] External integrations respond (if applicable)
- [ ] No console errors in browser (web apps)
- [ ] Payment flow works (revenue products — use test mode)
```

ASK: "Staging deployment ready. Please verify the smoke test checklist above. Does staging look good? Proceed to production?"

**WAIT for confirmation.**

---

## 8. Deploy to Production (PAUSE FOR USER)

After staging confirmation:

- **Vercel:** Main branch is already deployed (or promote preview)
- **Railway:** `railway up --environment production`
- **Manual:** Follow project deployment docs

ASK: "Production deployment initiated. Please verify:
- [ ] Production site/service is accessible
- [ ] Smoke test passes on production
- [ ] Monitoring shows no error spike (check Sentry if configured)
- [ ] No elevated response times

Is production confirmed healthy?"

**WAIT for confirmation.**

---

## 9. Post-Release Updates

These record the deploy result, known only after §8, so they go through a second, docs-only PR. Cut its branch first:
```bash
git switch main && git pull
git switch -c chore/post-release-vX.Y.Z
```

### 9a. Update docs/status.md
```markdown
## Latest Release
vX.Y.Z — released YYYY-MM-DD
```

### 9b. Update CLAUDE.md Status
If the release corresponds to a project milestone, update the Status section.

### 9c. Close Related Issues
```bash
# Close issues included in this release (if not auto-closed via PRs)
gh issue close {number} --comment "Released in vX.Y.Z"
```

### 9d. Merge the post-release updates:
```bash
git add docs/status.md CLAUDE.md
git commit -m "chore: post-release updates for vX.Y.Z"
git push -u origin chore/post-release-vX.Y.Z
```
Open the PR (`chore(release): post-release updates for vX.Y.Z`) and merge it as in §6, then `git switch main && git pull`.

---

## 10. Report

```
## Release Complete: vX.Y.Z

**Version:** vX.Y.Z
**Type:** {MAJOR/MINOR/PATCH}
**Commits included:** {count}
**Key changes:**
- {1-3 bullet summary}

**Deployment:**
- Staging: verified
- Production: verified

**GitHub Release:** {URL}
**Issues closed:** {count}

Next: continue development with `/phase-next` or monitor production.
```
