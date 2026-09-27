#!/usr/bin/env bash
# PreToolUse guard for Read: never read secrets files (.env*, secrets/), except .env.example.
# Deny rules in settings.json can't express "except .env.example" (deny beats allow), so the exact rule lives here.
# Exit 2 blocks the action; stderr goes to Claude with the reason.
set -euo pipefail
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
path="$(jq -r '.tool_input.file_path // empty')"
rel="${path#"$root"/}"

case "$rel" in
  .env.example|*/.env.example) ;;
  .env|.env.*|*/.env|*/.env.*|secrets/*|*/secrets/*)
    echo "BLOCKED by .claude/hooks/guard-reads.sh: reading secrets files is not allowed. Use .env.example for variable names." >&2
    exit 2 ;;
esac
exit 0
