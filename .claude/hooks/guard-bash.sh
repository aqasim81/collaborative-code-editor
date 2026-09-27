#!/usr/bin/env bash
# PreToolUse guard for Bash (starter kit).
#   1. No force-push, no pushing to main/master: named (origin main, HEAD:main) or implied (a bare
#      push while main is checked out). Allowed while origin has no such branch yet (a new repo's first push).
#   2. No reading .env through the shell.
#   3. Production gate: commands that run "deploy" with "prod"/"production" (whole words, outside
#      quoted text and heredocs) need RELEASE_APPROVAL set by the owner.
set -euo pipefail
input="$(cat)"
cmd="$(jq -r '.tool_input.command // empty' <<< "$input")"
block() { echo "BLOCKED by .claude/hooks/guard-bash.sh: $1" >&2; exit 2; }
if [[ "$cmd" =~ git[[:space:]]+push.*(--force|-f([[:space:]]|$)|--force-with-lease) ]]; then
  block "force-push is not allowed. Add a new commit instead."
fi
if [[ "$cmd" =~ (cat|less|more|head|tail|grep|source|\.)[[:space:]].*\.env([^.]|$|\.[^e]) ]] && [[ ! "$cmd" =~ \.env\.example ]]; then
  block "reading .env through the shell is not allowed. Use .env.example for variable names."
fi
# Production gate: only look at what the shell runs. Heredoc bodies and quoted
# strings (commit messages, PR bodies, grep patterns) are dropped first (each quoted
# string leaves an empty "" word, so argument positions survive), unless
# the command runs a string as code (sh -c, eval, ssh). "deploy" and
# "prod"/"production" must be whole words, so "producer" or "deployed" in a
# path does not count.
code="$cmd"
if [[ ! "$cmd" =~ (^|[^[:alnum:]_])((ba|z)?sh[[:space:]]+-[[:alpha:]]*c|eval|ssh)([[:space:]]|$) ]]; then
  code="$(printf '%s' "$cmd" | perl -0777 -pe '
    s/<<-?[ \t]*(["\x27]?)(\w+)\1([^\n]*)\n.*?^[ \t]*\2[ \t]*$/$3/gms;
    s/"(?:[^"\\]|\\.)*"/""/gs;
    s/\x27[^\x27]*\x27/""/gs;
  ')"
fi
deploy_word='(^|[^[:alnum:]])deploy(s|ment)?([^[:alnum:]]|$)'
prod_word='(^|[^[:alnum:]])prod(uction)?([^[:alnum:]]|$)'
if [[ "$code" =~ $deploy_word && "$code" =~ $prod_word && -z "${RELEASE_APPROVAL:-}" ]]; then
  block "production deploys need a release authorization. The owner sets RELEASE_APPROVAL=<ticket or date+initials>, then retry."
fi
# Pushes to main. Each `git push` names its destinations (main/master in a refspec such as `main`,
# `HEAD:main` or `x:refs/heads/main`), or means the current branch when it has no refspec or only HEAD
# (and no --tags). A `git switch`/`checkout` of a branch earlier in the command makes the current branch
# unknown, so only named destinations count after one. On main, `git commit --no-verify` (which skips the
# lefthook commit-msg refusal) is blocked too. The current branch is the one where the shell runs (`cwd`).
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
if [[ "$code" =~ git[[:space:]]+(push|commit) ]]; then
  here="$(jq -r '.cwd // empty' <<< "$input")"
  here="${here:-$root}"
  current="$(git -C "$here" branch --show-current 2>/dev/null || true)"
  if [[ ( "$current" == main || "$current" == master ) \
        && "$code" =~ git[[:space:]]+commit[^\;\&\|]*[[:space:]](--no-verify|-[[:alpha:]]*n[[:alpha:]]*)([[:space:]]|$) ]]; then
    block "do not commit on $current. Branch first: git switch -c <type>/<issue>-<name>"
  fi
  for dest in $(printf '%s' "$code" | CURRENT="$current" perl -0777 -ne '
    while (/(?:^|[;&|(\s"\x27\x60])git\s+push\b([^;&|)\n]*)/g) {
      my $rest = $1;
      my $before = $`;
      my $switched = $before =~ /git\s+switch\s/
        || grep { !/(?:^|\s)(?:--|\.)(?:\s|$)/ } $before =~ /git\s+checkout\s+([^;&|\n]*)/g;
      my @args = split " ", $rest;
      my ($tags, @refs) = (0);
      while (defined(my $w = shift @args)) {
        # "" is a quoted word (its text was dropped above): some refspec other than HEAD.
        if ($w eq q("")) { push @refs, "?"; next }
        $w =~ tr/"\x27\x60//d;
        if ($w =~ /^(?:-o|--push-option|--repo|--receive-pack|--exec)$/) { shift @args }
        elsif ($w eq "--tags") { $tags = 1 }
        elsif ($w !~ /^-/) { push @refs, $w }
      }
      shift @refs;
      my @named = map { m{^\+?(?:[^:]*:)?(?:refs/heads/)?(main|master)$} ? $1 : () } @refs;
      if (@named) { print "$_\n" for @named }
      elsif (!$switched && !$tags && !grep({ $_ ne "HEAD" } @refs)
             && $ENV{CURRENT} =~ /^(main|master)$/) { print "$ENV{CURRENT}\n" }
    }'); do
    # A new repository's first push (origin has no such branch yet, so no protection either) is allowed.
    if git -C "$here" rev-parse --verify -q "refs/remotes/origin/$dest" >/dev/null; then
      block "do not push to $dest. Branch first (git switch -c <type>/<issue>-<name>), push the branch and open a pull request."
    fi
  done
fi
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
