#!/usr/bin/env bash
# Tests for .claude/hooks/guard-bash.sh: feed each command as hook JSON and check the exit code
# (2 = blocked, 0 = allowed). Run by `make verify`.
# Protected paths come from variables, so this file holds no literal write to one.
set -uo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
hook="$root/.claude/hooks/guard-bash.sh"
M=apps/web/prisma/migrations
U=apps/web/components/ui
failures=0

check() { # check <expected exit> <got> <label>
  if [[ "$2" != "$1" ]]; then
    echo "FAIL (want $1, got $2): $3" >&2
    failures=$((failures + 1))
  fi
}
run() { # run <expected exit> <command>; the project dir is $dir (default: this repo)
  jq -n --arg c "$2" '{tool_input: {command: $c}}' \
    | env -u RELEASE_APPROVAL CLAUDE_PROJECT_DIR="${dir:-$root}" bash "$hook" >/dev/null 2>&1
  check "$1" $? "$2"
}
blocked() { run 2 "$1"; }
allowed() { run 0 "$1"; }

# Shell writes into protected paths
blocked "echo x > $M/a/migration.sql"
blocked "echo x >> $M/a/migration.sql"
blocked "echo x > \"$M/a/migration.sql\""
blocked "echo x > ./$M/a/migration.sql"
blocked "echo x > $root/$M/a/migration.sql"
blocked "cd apps/web && echo x > prisma/migrations/a/migration.sql"
blocked "echo x &> $M/a/migration.sql"
blocked "cat <<'SQL' > $M/a/migration.sql
ALTER TABLE x;
SQL"
blocked "echo x | tee $U/button.tsx"
blocked "echo x | tee -a $U/button.tsx"
blocked "cp /tmp/m.sql $M/a/"
blocked "mv /tmp/button.tsx $U/button.tsx"
blocked "install -m 644 /tmp/m.sql $M/a/migration.sql"
blocked "ln -s /tmp/m.sql $M/a/migration.sql"
blocked "rsync -a /tmp/ui/ $U/"
blocked "touch $U/new.tsx"
blocked "truncate -s 0 $M/a/migration.sql"
blocked "rm -r $M/a"
blocked "git status && rm -rf $U"
blocked "sed -i '' s/a/b/ $U/dialog.tsx"
blocked "sed -i.bak s/a/b/ $U/dialog.tsx"
blocked "perl -pi -e 's/a/b/' $M/a/migration.sql"
blocked "python3 -c \"open('$M/a/m.sql', 'w').write('x')\""
blocked "node -e \"require('fs').writeFileSync('$U/x.tsx', '')\""
blocked "python3 - <<'PY'
open('$M/a/m.sql', 'w').write('x')
PY"

# Generators and reads stay allowed
allowed "pnpm --filter @collab-editor/web exec prisma migrate dev --create-only --name x"
allowed "pnpm --filter @collab-editor/web db:migrate"
allowed "pnpm --filter @collab-editor/web exec prisma migrate diff --from-migrations $M --to-schema-datamodel prisma/schema.prisma --script --output $M/a/migration.sql"
allowed "cd apps/web && pnpm exec prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > $M/a/migration.sql"
allowed "pnpm dlx shadcn@latest add dialog"
allowed "cat $M/a/migration.sql"
allowed "ls $U"
allowed "git diff $U"
allowed "grep -r x $M > /tmp/out.txt"
allowed "cp $M/a/migration.sql /tmp/"
allowed "ls $M 2>/dev/null | head"
allowed "echo x > /tmp/components-ui.txt"

allowed "git commit -m \"chore: never rm $M by hand\""
allowed "git log --oneline -- $M"
allowed "node scripts/check.js > /tmp/out.txt"

# Other writers, wrappers and parent folders
blocked "git rm -r $M/a"
blocked "git checkout main -- $M"
blocked "git restore --source=main $U/button.tsx"
blocked "find $M -name '*.sql' -delete"
blocked "FOO=1 sudo rm -rf $U"
blocked "timeout 5 rm $M/a/migration.sql"
blocked "cp -t $M/a /tmp/m.sql"
blocked "dd if=/tmp/m.sql of=$M/a/migration.sql"
blocked "rm -rf apps/web/prisma"

# Quoted text is data, and an interpreter only taints its own command
allowed "git commit -m \"docs: echo x > $M/a is now blocked\""
allowed "gh pr create --title x --body \"Blocked:
- tee $U/x; rm -r $M
- echo x > $M/a\""
allowed "node scripts/check.js && ls $M"
allowed "python3 -m pytest; git log -- $U"
allowed "find $M -name '*.sql'"
allowed "git checkout -b feat/x"
allowed "rm -rf apps/web/.next"

# Echoing a generator name does not make a write a generator run
blocked "echo prisma migrate > $M/a/migration.sql"
blocked "bash -c \"echo x > $M/a/migration.sql\""

# Existing checks behave as before
blocked "git push --force origin feat/x"
blocked "cat .env"
allowed "cat .env.example"
blocked "vercel deploy --prod"
allowed "git commit -m 'deploy to prod later'"

# Pushes to main, in throwaway repos so the result doesn't depend on this checkout's branch or refs
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
g() { git -C "$1" -c user.name=t -c user.email=t@t -c commit.gpgsign=false "${@:2}" >/dev/null 2>&1; }
repo() { # repo <name> <branch> [no-origin]: one commit on <branch>, with an origin/main ref unless no-origin
  git init -q -b "$2" "$tmp/$1" && g "$tmp/$1" commit -q --allow-empty -m init
  [[ -n "${3:-}" ]] || g "$tmp/$1" update-ref refs/remotes/origin/main HEAD
}
repo on-main main
repo on-feat feat/x
repo new-repo main no-origin
git init -q -b main "$tmp/unborn"

dir="$tmp/on-main"
blocked "git push origin main"
blocked "git push"
blocked "git push origin"
blocked "git push origin HEAD"
blocked "git push -u origin HEAD"
blocked "git push origin HEAD:main"
blocked "git push origin feat/x:main"
blocked "git push origin HEAD:refs/heads/main"
blocked "git add -A && git commit -m x && git push"
blocked "bash -c \"git push origin main && true\""
blocked "git checkout -- README.md && git push"
blocked "git push -o ci.skip origin"
blocked "git push --repo origin"
blocked "git push origin --tags main"
blocked "git commit --no-verify -m x"
blocked "git commit -n -m x"
allowed "git commit -m x"   # the lefthook commit-msg script refuses it, not this guard
allowed "git push origin v1.2.3"   # /release pushes only the tag; main moves through the release PR
allowed "git push origin --tags"
allowed "git push -u origin feat/x"
allowed "git switch -c feat/x && git push -u origin HEAD"
allowed "git commit -m \"fix: git push is refused on main\""
dir="$tmp/on-feat"
allowed "git push"
allowed "git push -u origin HEAD"
blocked "git push origin feat/x:main"
allowed "git commit --no-verify -m x"
dir="$tmp/new-repo"
allowed "git push -u origin main"   # /phase-start's first push, before origin has a main
unset dir

# Commits on main are refused by the lefthook commit-msg script
commit_hook() { # commit_hook <expected exit> <repo>
  (cd "$tmp/$2" && bash "$root/.claude/hooks/no-commit-on-main.sh") >/dev/null 2>&1
  check "$1" $? "no-commit-on-main.sh in $2"
}
commit_hook 1 on-main
commit_hook 0 on-feat
commit_hook 0 unborn   # the first commit of a new repo

if (( failures > 0 )); then
  echo "hook tests FAILED ($failures)" >&2
  exit 1
fi
echo "hook tests OK"
