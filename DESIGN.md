# gitten

A suite of focused micro-TUIs for common git workflows. Each tool does one thing and exits cleanly — no multiplexed complexity, no mode-switching.

## Philosophy

Most git TUIs try to replace the entire git CLI in one interface. gitten does the opposite: one small tool per workflow, each with a single entry condition and a single exit condition. They compose with the shell rather than trying to own it.

The guiding question for each tool is *what are you trying to do*, not *which git commands are involved*. The index is just a mechanism — it shows up in both committing and stashing, but those are different intents and belong in different tools.

## Subcommands

| Command | Job |
|---|---|
| `gitten stage` | Stage files, write message, commit |
| `gitten log` | Browse history, inspect diffs, cherry-pick |
| `gitten branch` | List, switch, and delete branches |
| `gitten stash` | Set work aside — list, preview, pop, apply, drop |

## Subcommand design notes

**`gitten stage`** — The full "record this work" workflow. Stage and unstage files, write a commit message, amend if needed. Staging only exists to serve the commit, so they belong together.

**`gitten log`** — Read-only by default. Navigate commits with a diff preview pane. Cherry-pick as an opt-in action.

**`gitten branch`** — Replaces `git branch -vv` with a navigable list showing last commit and tracking status per branch. Switch and delete in place.

**`gitten stash`** — The "set this aside" workflow. Has its own lightweight staging (for `--keep-index` or partial stash) because the intent is different from committing — you're saving for later, not recording permanently. Lists stashes with previews, pop/apply/drop in one keypress.

## Out of scope

- **Rebase** — too stateful; needs a full terminal
- **Merge conflict resolution** — editor integration is better suited
- **Remote management** — infrequent enough that the CLI is fine
