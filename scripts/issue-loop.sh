#!/usr/bin/env bash
# Works the issues in plans/issues/README.md one after another. Each issue runs in a fresh headless
# session (/next-issue), which is the "clear" between issues. The loop stops at the first issue that
# does not end CLOSED, merged and with a green main CI run.
#
#   ./scripts/issue-loop.sh               # run until every issue is done
#   MAX_ISSUES=1 ./scripts/issue-loop.sh  # run one issue
#   DRY_RUN=1 ./scripts/issue-loop.sh     # show the next issue and the command, run nothing
set -euo pipefail

cd "$(dirname "$0")/.."
readme="plans/issues/README.md"
max_issues="${MAX_ISSUES:-10}"
log_dir="logs/issue-loop"

# First order-table row whose status is not "done": prints the issue number.
next_issue() {
  awk -F'|' '
    /^\| *[0-9]+ *\|/ {
      status = $6; gsub(/^ +| +$/, "", status)
      if (status !~ /^done/) { if (match($3, /#[0-9]+/)) { print substr($3, RSTART + 1, RLENGTH - 1); exit } }
    }' "$readme"
}

fail() { echo "issue-loop: $1" >&2; exit 1; }

command -v claude >/dev/null || fail "claude CLI not found"
command -v gh >/dev/null || fail "gh CLI not found"
command -v jq >/dev/null || fail "jq not found"
[[ -f "$readme" ]] || fail "$readme not found"

previous=""
for ((run = 1; run <= max_issues; run++)); do
  issue="$(next_issue)"
  if [[ -z "$issue" ]]; then
    echo "issue-loop: all issues done"
    exit 0
  fi
  [[ "$issue" == "$previous" ]] && fail "#$issue is still not done after its run; stopping"
  previous="$issue"

  if [[ -n "${DRY_RUN:-}" ]]; then
    echo "issue-loop: next issue #$issue"
    echo "CLAUDE_VERIFY_ON_STOP=1 claude -p /next-issue --dangerously-skip-permissions --output-format stream-json --verbose"
    exit 0
  fi

  mkdir -p "$log_dir"
  log="$log_dir/$issue-$(date +%Y%m%d-%H%M%S).jsonl"
  echo "issue-loop: [$run/$max_issues] starting #$issue (log: $log)"

  # Print Claude's text to the terminal while the full event stream goes to the log.
  CLAUDE_VERIFY_ON_STOP=1 claude -p "/next-issue" \
    --dangerously-skip-permissions --output-format stream-json --verbose \
    | tee "$log" \
    | jq -rj --unbuffered 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text + "\n"' \
    || fail "session for #$issue exited with an error (log: $log)"

  grep -q "ISSUE $issue BLOCKED" "$log" && fail "#$issue is blocked; see the issue's last comment (log: $log)"

  state="$(gh issue view "$issue" --json state -q .state)"
  [[ "$state" == "CLOSED" ]] || fail "#$issue is $state after its run (log: $log)"

  [[ "$(git branch --show-current)" == "main" ]] || fail "not on main after #$issue"
  [[ -z "$(git status --porcelain)" ]] || fail "working tree not clean after #$issue"

  conclusion="$(gh run list --branch main --limit 1 --json status,conclusion -q '.[0].status + "/" + .[0].conclusion')"
  [[ "$conclusion" == "completed/success" ]] || fail "main CI is $conclusion after #$issue"

  echo "issue-loop: #$issue done, main CI green"
done

echo "issue-loop: stopped after $max_issues issues (MAX_ISSUES)"
