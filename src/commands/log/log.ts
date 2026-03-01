import { defineCommand } from 'citty';
import { runTUI } from '../../tui.ts';

export default defineCommand({
  meta: {
    name: 'log',
    description: 'Browse commit history',
  },
  async run() { await runTUI('log'); },
});
