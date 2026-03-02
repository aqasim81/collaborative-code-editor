## Pre-computed Context

- Project files: !`find projects/ -maxdepth 3 \( -name "CLAUDE.md" -o -name "project.md" \) 2>/dev/null | sort`
- Git repos: !`find projects/ -maxdepth 3 -name ".git" -type d 2>/dev/null | sort`
- Plans directories: !`find projects/ -maxdepth 3 -name "plans" -type d 2>/dev/null | sort`

---

Scan the `projects/` directory tree to show the status of all projects in this workspace.

For each subdirectory under `projects/` that contains either a `CLAUDE.md` or a `project.md`:

1. Read the "Status" line from `CLAUDE.md` (if it exists)
2. Read `plans/checklist.md` (if it exists) and count completed vs total phases
3. Check if a `.git` directory exists (initialized or not)
4. Check if a `plans/` directory exists (project initialized or not)

Present a summary table:

| Category | Project | Status | Phases | Git | Initialized |
|----------|---------|--------|--------|-----|-------------|
| portfolio_projects | ai_code_review_bot | Phase 2 in progress | 1/6 | Yes | Yes |
| portfolio_projects | api_load_testing_framework | Phase 4 ready | 3/8 | Yes | Yes |
| ai_revenue_products | resume_ai | Not started | — | No | No |

Then summarize:
- **Initialized projects:** X (have plans/ and CLAUDE.md)
- **Uninitialized projects:** Y (have project.md but no plans/)
- **Empty directories:** Z (no project.md yet)
- **Total phases completed across all projects:** N
