---
description: Commit current changes in the Nexus format, push the branch, and create or sync its GitHub PR with stacked-base detection and retargeting.
agent: build
---

Commit the current changes, push the branch, and open or sync its GitHub pull request.

`$ARGUMENTS` is optional. It may contain:

- `--no-commit` to skip the commit phase and only push/update the PR.
- `--yes` to skip the PR preview gate (the commit gate still applies).
- `--base <branch>` to force the PR base.
- Any other text is guidance for the commit message and PR title/body.

## Commit phase

Skip this phase when `$ARGUMENTS` contains `--no-commit`.

1. Inspect the repo first: run `git status`, `git diff --stat`, `git diff`, and `git diff --cached --stat` to gather the full set of changes (staged and unstaged).
2. Derive the ticket id from the current branch name. Extract the token matching `[A-Z]+-\d+` (e.g. `NEXUS-018`) and use it as the ticket prefix. If the branch contains no such token, fall back to `NXS-000`.
3. Write a commit message in this format:
   - Title: `<ticket> <short, general description of the overall change>`. Keep it concise and describe what was done at a high level.
   - Blank line.
   - Body: a bullet list, one `-` line per change, written in a human, conversational way. Cover ALL of the meaningful updates in the diff (every group of files that changed). Explain what was changed and why in plain language — no commit jargon, no file-path dumps.
4. STOP here. Show the full composed commit message exactly as it will be committed (title + blank line + body) in a code block. Then ask exactly:
   `Commit this? (yes / edit / cancel)`
   Do not run `git add` or `git commit` yet. Wait for the user's reply.
5. Only after explicit approval:
   - If they ask for edits, revise the message and return to step 4.
   - If they approve, stage the changes with `git add -A` and commit using the approved message. Preserve the blank line between title and body (`git commit -m "title" -m "body"`).
   - If they cancel, stop without committing or pushing.
6. If there is nothing to commit, skip the commit phase and continue.
7. After committing, show `git log -1 --stat`.

## PR phase

8. Run `bun "$(git rev-parse --show-toplevel)/.opencode/scripts/pr.ts" --dry-run` (add `--base <branch>` only when `$ARGUMENTS` explicitly asks for one). The output is a TOON plan, including a `bodyFile` path.
9. If the output says `auth: missing`, do not continue. Tell the user:
   - Export `GITHUB_TOKEN` (or `GH_TOKEN`) with Contents read/write and Pull requests read/write.
   - Restart opencode from the shell that has the variable.
10. Read the `bodyFile` and show the user a preview:
    - Current branch, detected base, and why (`stacked`, `develop`, or `override`).
    - Commit list, including the commit just created.
    - Existing PR number/URL, or say it will be a new PR.
    - Proposed title.
    - Full proposed body in a fenced block.
    - Any warnings, especially uncommitted changes.
    - If `retargeted` is non-empty, name the PRs that will switch to `develop`.
11. Unless `$ARGUMENTS` contains `--yes`, ask exactly:
    `Push and create/update this PR? (yes / edit / cancel)`
    Wait for the reply. Do not push or make any write API call before approval.
    - On `edit`, ask what to change, revise the title/body, show the revised preview, and ask again.
    - On `cancel`, stop without pushing.
12. On approval, run:
    `bun "$(git rev-parse --show-toplevel)/.opencode/scripts/pr.ts" --title <approved title> --body-file <approved body file>`
    Add `--base <branch>` only when the user explicitly asked for a base. Do not pass the auto-detected base, so the real run can re-detect it if a parent merged in the meantime.
    If the user approved edited text, write the edited body to a temp file and pass that path.
13. Show the resulting PR URL, number, base, and any retargeted PRs. Tell the user the only remaining step is to review and merge on GitHub.
14. Do not merge, do not commit outside the approved commit phase, and do not force-push unless the user explicitly asked for `--force`.
