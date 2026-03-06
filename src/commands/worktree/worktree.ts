import { defineCommand } from 'citty';
import { runTUI } from '../../tui.ts';

export default defineCommand({
  meta: {
    name: 'worktree',
    description: 'List, remove, lock, and prune worktrees',
  },
  async run() { await runTUI('worktree'); },
});
