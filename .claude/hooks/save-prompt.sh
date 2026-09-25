#!/bin/bash
# Save the user's prompt for the stop hook to use
cat | jq -r '.prompt // empty' > /tmp/claude_last_prompt.txt
