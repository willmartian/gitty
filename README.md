# gitty 🐱

Focused micro-TUIs for git workflows.

## Commands

| Command | Description |
|---|---|
| `gitty` | Open the full TUI (starts on stage) |
| `gitty stage` | Stage files, write a message, and commit |
| `gitty commit` | Write and create a commit (inline, no alt screen) |
| `gitty branch` | List, switch, and delete branches |
| `gitty stash` | Set work aside — list, preview, pop, apply, drop |
| `gitty log` | Browse commit history |

## vs. lazygit

lazygit is excellent and gitty doesn't try to replace it. The differences are philosophical.

**Where gitty wins:**

- **Inline mode** — `gitty commit` runs without taking over the screen. No alt buffer, no full-screen takeover. Useful in scripts, aliases, and workflows where you want to stay in your terminal flow. lazygit is always all-or-nothing.
- **Postscript** — after you quit, gitty leaves a summary of what you did in the main buffer. lazygit vanishes cleanly but leaves no trace.
- **Conventional commits first-class** — the commit form enforces structure (type, scope, breaking change). The log parses and surfaces type/scope/breaking as columns. lazygit treats commit messages as opaque strings.
- **Composability** — each command (`gitty stage`, `gitty log`, `gitty branch`) is independently usable as a CLI verb, not just a panel in a monolith.

**Where lazygit wins:**

- **Simultaneous panels** — files, diff, log, and branches visible at once. gitty's tabs mean context-switching where lazygit has context-at-a-glance.
- **Much more complete** — rebase, cherry-pick, bisect, worktrees, merge conflict resolution, and more. gitty covers the everyday 80%.
- **Mouse support, years of polish, active community.**

The thesis of gitty is *composable, terminal-native micro-tools*. If that resonates, it fills a different niche. If you want one tool that handles everything, lazygit is hard to beat.

## Development

```sh
bun run dev       # run with hot reload
bun run compile   # compile to binary
```
