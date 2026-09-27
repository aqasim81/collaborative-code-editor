#!/usr/bin/env bash
# PreToolUse guard for Bash (starter kit).
#   1. No force-push, no pushing straight to main/master.
#   2. No reading .env through the shell.
#   3. Production gate: commands that run "deploy" with "prod"/"production" (whole words, outside
#      quoted text and heredocs) need RELEASE_APPROVAL set by the owner.
set -euo pipefail
cmd="$(jq -r '.tool_input.command // empty')"
block() { echo "BLOCKED by .claude/hooks/guard-bash.sh: $1" >&2; exit 2; }
if [[ "$cmd" =~ git[[:space:]]+push.*(--force|-f([[:space:]]|$)|--force-with-lease) ]]; then
  block "force-push is not allowed. Add a new commit instead."
fi
if [[ "$cmd" =~ git[[:space:]]+push[[:space:]]+[^[:space:]]+[[:space:]]+(main|master)([[:space:]]|$) ]]; then
  block "do not push to main. Push a branch and open a pull request; the review gate decides."
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
# Protected paths (.claude/protected-paths.txt, also enforced for Edit/Write by guard-edits.sh):
# no shell writes into them. Cheap check first: run the parser only when the command names the
# last two components of a protected path, or its first one (a delete of a parent folder).
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
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
