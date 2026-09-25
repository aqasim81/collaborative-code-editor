#!/usr/bin/env bash
# PostToolUse: format the file that just changed (fast, one file). Never blocks; linting belongs to `verify`.
path="$(jq -r '.tool_input.file_path // empty')"
[[ -n "$path" && -f "$path" ]] || exit 0
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "$path" in
  *.py)
    if [[ -f "$root/uv.lock" ]] && command -v uv >/dev/null; then uv run --quiet ruff format --quiet "$path" >/dev/null 2>&1
    elif command -v ruff >/dev/null; then ruff format --quiet "$path" >/dev/null 2>&1; fi ;;
  *.go)
    command -v gofumpt >/dev/null && gofumpt -w "$path" >/dev/null 2>&1
    command -v goimports >/dev/null && goimports -w "$path" >/dev/null 2>&1 ;;
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css)
    if [[ -f "$root/biome.json" ]]; then (cd "$root" && pnpm exec biome format --write "$path" >/dev/null 2>&1)
    elif ls "$root"/.prettierrc* >/dev/null 2>&1; then (cd "$root" && pnpm exec prettier --write "$path" >/dev/null 2>&1); fi ;;
esac
exit 0
