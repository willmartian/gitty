import { defineCommand } from 'citty';
import { runTUI } from '../run.ts';

export default defineCommand({
  meta: { name: 'log', description: 'Browse history, inspect diffs, cherry-pick' },
  async run() { await runTUI('log'); },
});
