import { defineCommand } from 'citty';
import { runTUI } from '../../tui.ts';

export default defineCommand({
  meta: {
    name: 'stash',
    description: `Set work aside — list, pop, apply, drop`
  },
  async run() { await runTUI('stash'); },
});
