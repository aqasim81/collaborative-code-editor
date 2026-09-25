#!/usr/bin/env bash
# PreToolUse guard for Edit | Write | MultiEdit (starter kit).
#   1. Never write secrets files (.env*, secrets/), except .env.example.
#   2. Fix mode: while CLAUDE_FIX_MODE=1, test files are read-only ("fix the code, not the test").
#   3. Protected paths: globs listed in .claude/protected-paths.txt cannot be edited (generated code, frozen dirs).
#   4. Forbidden terms: case-insensitive regexes in .claude/forbidden-terms.txt (committed) and
#      .claude/forbidden-terms.local.txt (gitignored) may not appear in code
#      (docs/, *.md and .claude/ are exempt). Use for client names, employer data, internal hostnames.
# Exit 2 blocks the action; stderr goes to Claude with the reason and the route forward.
set -euo pipefail
input="$(cat)"
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"
text="$(printf '%s' "$input" | jq -r '[.tool_input.content, .tool_input.new_string, (.tool_input.edits // [] | map(.new_string) | join("\n"))] | map(select(. != null)) | join("\n")')"
rel="${path#"$root"/}"
block() { echo "BLOCKED by .claude/hooks/guard-edits.sh: $1" >&2; exit 2; }

case "$rel" in
  .env.example|*/.env.example) ;;
  .env|.env.*|*/.env|*/.env.*|secrets/*|*/secrets/*)
    block "writing secrets files is not allowed. Put placeholders in .env.example and ask the owner to set real values." ;;
esac

if [[ "${CLAUDE_FIX_MODE:-0}" == "1" ]]; then
  case "$rel" in
    tests/*|*/tests/*|test/*|*/test/*|__tests__/*|*/__tests__/*|test_*.py|*/test_*.py|*_test.py|*_test.go|*.test.ts|*.test.tsx|*.test.js|*.spec.ts|*.spec.tsx|*.spec.js|e2e/*|*/e2e/*)
      block "fix mode is on (CLAUDE_FIX_MODE=1): test files are read-only. Change the code until the existing test passes." ;;
  esac
fi

if [[ -f "$root/.claude/protected-paths.txt" ]]; then
  while IFS= read -r glob; do
    [[ -z "$glob" || "$glob" == \#* ]] && continue
    # shellcheck disable=SC2053
    if [[ "$rel" == $glob ]]; then block "$rel is protected ($glob in .claude/protected-paths.txt). Ask the owner before changing it."; fi
  done < "$root/.claude/protected-paths.txt"
fi

case "$rel" in
  docs/*|*.md|.claude/*) ;;
  *)
    # forbidden-terms.local.txt is gitignored: use it for names that must not appear in a public repo either.
    for list in "$root/.claude/forbidden-terms.txt" "$root/.claude/forbidden-terms.local.txt"; do
      [[ -f "$list" && -n "$text" ]] || continue
      while IFS= read -r term; do
        [[ -z "$term" || "$term" == \#* ]] && continue
        if printf '%s' "$text" | grep -Eqi -- "$term"; then
          block "content matches a forbidden term ('$term' in $(basename "$list")). Use fictional or placeholder data."
        fi
      done < "$list"
    done ;;
esac
exit 0
