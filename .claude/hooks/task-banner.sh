#!/bin/bash
PROMPT=$(cat /tmp/claude_last_prompt.txt 2>/dev/null)
[ -z "$PROMPT" ] && exit 0

# Extract first line, trim whitespace
LABEL=$(echo "$PROMPT" | head -1 | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')

# Map known commands to labels; free-text keeps sentence case
IS_COMMAND=true
case "$LABEL" in
  /phase-start-review*) LABEL="Phase start review" ;;
  /phase-review*)       LABEL="Phase review" ;;
  /phase-start*)        LABEL="Phase start" ;;
  /phase-next*)         LABEL="Phase next" ;;
  /commit-push-pr*)     LABEL="Commit push PR" ;;
  /simplify*)           LABEL="Simplify" ;;
  /bug-fix*)            LABEL="Bug fix" ;;
  /hotfix*)             LABEL="Hotfix" ;;
  /release*)            LABEL="Release" ;;
  /pm*)                 LABEL="Project manager" ;;
  /project-status*)     LABEL="Project status" ;;
  /*)                   LABEL=$(echo "$LABEL" | sed 's/^\///' | tr '-' ' '); LABEL="$(echo "${LABEL:0:1}" | tr '[:lower:]' '[:upper:]')${LABEL:1}" ;;
  *)                    IS_COMMAND=false; LABEL=$(echo "$LABEL" | cut -c1-40); LABEL="$(echo "${LABEL:0:1}" | tr '[:lower:]' '[:upper:]')${LABEL:1}" ;;
esac

if [ "$IS_COMMAND" = true ]; then
  LABEL="$LABEL done"
else
  # Append ellipsis if truncated
  ORIGINAL_LEN=$(echo "$PROMPT" | head -1 | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//' | wc -c)
  if [ "$ORIGINAL_LEN" -gt 41 ]; then
    LABEL="${LABEL}…"
  fi
  LABEL="$LABEL — done"
fi

# Show the banner via Claude Code (hooks have no controlling terminal).
jq -n --arg msg "✓ ${LABEL}" '{systemMessage: $msg}'
