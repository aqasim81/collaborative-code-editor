#!/usr/bin/env bash
# Detect project state for the PM skill
# Called via !./detect-state.sh in SKILL.md

echo "Working directory: $(pwd)"
echo "Project name: $(basename "$(pwd)")"
echo "Has project.md: $(test -f project.md && echo 'YES' || (test -f plans/project.md && echo 'YES (in plans/)' || echo 'NO'))"
echo "Has plans/: $(test -d plans && echo 'YES' || echo 'NO')"
echo "Has CLAUDE.md: $(test -f CLAUDE.md && echo 'YES' || echo 'NO')"
echo "Has .git: $(test -d .git && echo 'YES' || echo 'NO')"
echo "Has CI: $(test -f .github/workflows/ci.yml && echo 'YES' || echo 'NO')"
echo "GitHub remote: $(git remote get-url origin 2>/dev/null || echo 'NONE')"
echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
echo "Git status: $(git status --short 2>/dev/null || echo 'N/A')"
echo "CLAUDE.md status: $(grep -m1 'Status' CLAUDE.md 2>/dev/null || echo 'N/A')"
echo "Latest tag: $(git tag --sort=-v:refname 2>/dev/null | head -1 || echo 'NONE')"

if [ -f plans/checklist.md ]; then
  echo "---CHECKLIST---"
  cat plans/checklist.md
  echo "---END CHECKLIST---"
else
  echo "Checklist: N/A"
fi

if [ -f docs/status.md ]; then
  echo "---STATUS---"
  cat docs/status.md
  echo "---END STATUS---"
else
  echo "docs/status.md: N/A"
fi
