---
description: Create a commit with a ticket-titled message and a human, conversational list of all changes.
agent: build
---

Commit the current changes following the Nexus commit format.

Steps:

1. Inspect the repo first: run `git status`, `git diff --stat`, `git diff`, and `git diff --cached --stat` to gather the full set of changes (staged and unstaged).
2. Derive the ticket id from the current branch name (e.g. a branch like `feature/NEXUS-000_get_everything_working`). Extract the token matching `[A-Z]+-\d+` (that gives `NEXUS-000`) and use it as the ticket prefix. If the branch contains no such token, fall back to `NXS-000`.
3. Write a commit message in this format:
   - Title: `<ticket> <short, general description of the overall change>` (e.g. `NEXUS-000 Convert all API routes to the zod-openapi pattern`). Keep it concise and describe what was done at a high level.
   - Blank line.
   - Body: a bullet list, one `-` line per change, written in a human, conversational way. Cover ALL of the meaningful updates in the diff (every group of files that changed). Explain what was changed and why in plain language — no commit jargon, no file-path dumps.
4. STOP here. Show the user the full composed commit message exactly as it will be committed (title + blank line + body), formatted in a code block. Then explicitly ask: "Commit this? (yes / edit / cancel)". Do NOT run git add or git commit in this step — this is a hard gate, not a formality, and it does not matter that bash may be an allowed tool for this agent: that permission covers whether the tool is allowed to run at all, not whether this specific commit has been approved. Wait for the user's reply before continuing to step 5.
5. Only after the user replies with explicit approval:
   - If they ask for edits, revise the message and return to step 4 — show the revised version and wait again.
   - If they approve, stage the changes with git add and create the commit using the approved message. Only commit the staged files. Preserve the blank line between the title and body (e.g. git commit -m "title" -m "body" where body is the newline-joined bullet list).
   - If they cancel, stop without committing.
6. If there is nothing to commit (step 1 shows no staged or unstaged changes), stop and tell the user instead of creating an empty commit — skip straight past steps 3-5.
7. After committing, confirm by showing git log -1 --stat.
