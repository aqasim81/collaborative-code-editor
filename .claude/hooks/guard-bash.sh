#!/usr/bin/env bash
# PreToolUse guard for Bash (starter kit).
#   1. No force-push, no pushing to main/master: named (origin main, HEAD:main) or implied (a bare
#      push while main is checked out). Allowed while origin has no such branch yet (a new repo's first push).
#   2. No reading .env through the shell.
#   3. Production gate: commands that run "deploy" with "prod"/"production" (whole words, outside
#      quoted text and heredocs) need RELEASE_APPROVAL set by the owner.
set -euo pipefail
cmd="$(jq -r '.tool_input.command // empty')"
block() { echo "BLOCKED by .claude/hooks/guard-bash.sh: $1" >&2; exit 2; }
if [[ "$cmd" =~ git[[:space:]]+push.*(--force|-f([[:space:]]|$)|--force-with-lease) ]]; then
  block "force-push is not allowed. Add a new commit instead."
fi
if [[ "$cmd" =~ (cat|less|more|head|tail|grep|source|\.)[[:space:]].*\.env([^.]|$|\.[^e]) ]] && [[ ! "$cmd" =~ \.env\.example ]]; then
  block "reading .env through the shell is not allowed. Use .env.example for variable names."
fi
# Production gate: only look at what the shell runs. Heredoc bodies and quoted
# strings (commit messages, PR bodies, grep patterns) are dropped first, unless
# the command runs a string as code (sh -c, eval, ssh). "deploy" and
# "prod"/"production" must be whole words, so "producer" or "deployed" in a
# path does not count.
code="$cmd"
if [[ ! "$cmd" =~ (^|[^[:alnum:]_])((ba|z)?sh[[:space:]]+-[[:alpha:]]*c|eval|ssh)([[:space:]]|$) ]]; then
  code="$(printf '%s' "$cmd" | perl -0777 -pe '
    s/<<-?[ \t]*(["\x27]?)(\w+)\1([^\n]*)\n.*?^[ \t]*\2[ \t]*$/$3/gms;
    s/"(?:[^"\\]|\\.)*"//gs;
    s/\x27[^\x27]*\x27//gs;
  ')"
fi
deploy_word='(^|[^[:alnum:]])deploy(s|ment)?([^[:alnum:]]|$)'
prod_word='(^|[^[:alnum:]])prod(uction)?([^[:alnum:]]|$)'
if [[ "$code" =~ $deploy_word && "$code" =~ $prod_word && -z "${RELEASE_APPROVAL:-}" ]]; then
  block "production deploys need a release authorization. The owner sets RELEASE_APPROVAL=<ticket or date+initials>, then retry."
fi
# Pushes to main. Each `git push` names its destinations (main/master in a refspec such as `main`,
# `HEAD:main` or `x:refs/heads/main`) or prints HEAD when it has no refspec or only HEAD (and no --tags),
# which means the current branch. A `git switch`/`checkout` earlier in the command makes the current
# branch unknown, so only named destinations count after one.
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
for dest in $(printf '%s' "$code" | perl -0777 -ne '
  while (/(?:^|[;&|(\s])git\s+push\b([^;&|)\n]*)/g) {
    my $rest = $1;
    my $switched = $` =~ /git\s+(?:switch|checkout)\b/;
    my @args = split " ", $rest;
    my @refs = grep { !/^-/ } @args;
    shift @refs;
    my @named = map { m{^\+?(?:[^:]*:)?(?:refs/heads/)?(main|master)$} ? $1 : () } @refs;
    if (@named) { print "$_\n" for @named }
    elsif (!$switched && !grep({ $_ eq "--tags" } @args) && !grep({ $_ ne "HEAD" } @refs)) { print "HEAD\n" }
  }'); do
  [[ "$dest" == HEAD ]] && dest="$(git -C "$root" branch --show-current 2>/dev/null || true)"
  [[ "$dest" == main || "$dest" == master ]] || continue
  # A new repository's first push (origin has no such branch yet, so no protection either) is allowed.
  if git -C "$root" rev-parse --verify -q "refs/remotes/origin/$dest" >/dev/null; then
    block "do not push to $dest. Branch first (git switch -c <type>/<issue>-<name>), push the branch and open a pull request."
  fi
done
# Protected paths (.claude/protected-paths.txt, also enforced for Edit/Write by guard-edits.sh):
# no shell writes into them. Cheap check first: run the parser only when the command names the
# last two components of a protected path, or its first one (a delete of a parent folder).
if [[ -f "$root/.claude/protected-paths.txt" ]]; then
  while IFS= read -r glob; do
    [[ -z "$glob" || "$glob" == \#* ]] && continue
    p="${glob%%/\**}"; p="${p%\*}"
    tail2="${p##*/}"; [[ "$p" == */* ]] && tail2="${p%/*}" && tail2="${tail2##*/}/${p##*/}"
    [[ "$cmd" == *"$tail2"* || "$cmd" == *"${p%%/*}"* ]] || continue
    hit="$(perl "$root/.claude/hooks/lib/protected-writes.pl" "$cmd" "$root")"
    if [[ -n "$hit" ]]; then
      block "$hit is protected (.claude/protected-paths.txt). Use the generator (prisma migrate / shadcn add). If the generator can't produce the change, stop and mark the issue blocked for the owner."
    fi
    break
  done < "$root/.claude/protected-paths.txt"
fi
exit 0
