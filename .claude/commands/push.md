Push local commits to the remote branch.

Steps:

1. Run `git status` to ensure working tree is clean (no uncommitted changes)
   - If there are uncommitted changes: warn the user and stop. Suggest `/commit` first.

2. Run `git log @{u}..HEAD --oneline` to list commits that will be pushed
   - If output is empty: tell the user "Nothing to push — already up to date." and stop.
   - If there are commits: display them clearly

3. Ask the user to confirm before pushing:
   ```
   About to push N commit(s) to <branch>:
   - <commit1>
   - <commit2>
   Proceed? (yes/no)
   ```

4. On confirmation, run `git push`

5. Report success with the branch and commit count

Rules:
- **NEVER** force push (`--force`, `-f`) unless the user explicitly requests it
- **NEVER** push to main/master without explicit user confirmation
- If `git push` fails (e.g. rejected), show the error and suggest `git pull --rebase` if it's a non-fast-forward rejection
