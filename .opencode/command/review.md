---
description: Review code, a diff, a branch, or a PR using the Nexus code-review skill. Reports findings only; does not edit or commit.
agent: plan
---

Load the `code-review` skill and follow it exactly.

Review target:

- If `$ARGUMENTS` is non-empty, treat it as the review scope (a git range like `origin/develop...HEAD`, a branch, a PR reference, or a path/file).
- Otherwise review the current working changes: `git diff develop...HEAD`, `git diff`, and `git diff --cached`.

Do not edit, stage, or commit. Report findings using the skill's output format, ending with the `Verified` / `Not verified` lines.
