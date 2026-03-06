Output demo.gif

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 700
Set TypingSpeed 75ms
Set Theme "Catppuccin Mocha"
Set Padding 0

# ── launch ──────────────────────────────────────────────────────────────────
Type "bun index.ts"
Enter
Sleep 2s

# ── stage tab ───────────────────────────────────────────────────────────────
# navigate the staged / changes lists
Down
Sleep 400ms
Down
Sleep 400ms
Down
Sleep 400ms
Up
Sleep 400ms
Up
Sleep 600ms

# open diff of selected file
Enter
Sleep 1s

# scroll through diff
Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 300ms
Up
Sleep 300ms

# close diff
Escape
Sleep 800ms

# ── branch tab ──────────────────────────────────────────────────────────────
Tab
Sleep 1.5s

Down
Sleep 400ms
Down
Sleep 400ms
Up
Sleep 400ms

# filter branches
Type "f"
Sleep 400ms
Type "main"
Sleep 800ms
Backspace
Backspace
Backspace
Backspace
Sleep 400ms
Escape
Sleep 800ms

# ── stash tab ───────────────────────────────────────────────────────────────
Tab
Sleep 1.5s

Down
Sleep 400ms
Up
Sleep 600ms

# ── log tab ─────────────────────────────────────────────────────────────────
Tab
Sleep 1.5s

Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 300ms
Up
Sleep 300ms
Up
Sleep 500ms

# filter commits
Type "f"
Sleep 400ms
Type "wip"
Sleep 800ms
Down
Sleep 400ms
Down
Sleep 400ms
Backspace
Backspace
Backspace
Sleep 400ms
Escape
Sleep 800ms

# ── quit ────────────────────────────────────────────────────────────────────
Escape
Sleep 500ms
