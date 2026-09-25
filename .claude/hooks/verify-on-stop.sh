#!/usr/bin/env bash
# Stop hook (opt-in: export CLAUDE_VERIFY_ON_STOP=1). "Verified" is part of "done":
# if code changed, the project's verify gate must pass before Claude may stop.
input="$(cat)"
[[ "${CLAUDE_VERIFY_ON_STOP:-0}" == "1" ]] || exit 0
[[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" == "true" ]] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
changed="$(git status --porcelain 2>/dev/null | grep -Ev '(\.md|^.. docs/)' || true)"
[[ -z "$changed" ]] && exit 0
if make -n verify >/dev/null 2>&1; then cmd="make verify"
elif [[ -f package.json ]] && jq -e '.scripts.verify' package.json >/dev/null; then cmd="pnpm run verify"
elif [[ -f package.json ]] && jq -e '.scripts.validate' package.json >/dev/null; then cmd="pnpm run validate"
else exit 0; fi
if ! out="$($cmd 2>&1)"; then
  echo "$cmd failed. Fix the code (not the tests) before reporting done:" >&2
  printf '%s\n' "$out" | tail -40 >&2
  exit 2
fi
exit 0
