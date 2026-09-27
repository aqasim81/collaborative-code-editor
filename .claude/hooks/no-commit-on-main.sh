#!/usr/bin/env bash
# lefthook commit-msg: no commits on main/master. Work lands on main only through a pull request.
# The first commit of a new repository (no HEAD yet) is allowed.
set -euo pipefail
git rev-parse --verify -q HEAD >/dev/null || exit 0
branch="$(git branch --show-current)"
if [[ "$branch" == main || "$branch" == master ]]; then
  echo "Refusing to commit on $branch. Branch first: git switch -c <type>/<issue>-<name>" >&2
  exit 1
fi
