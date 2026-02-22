import { defineCommand } from 'citty';
import { runTUI } from '../run.ts';

export default defineCommand({
  meta: { name: 'stash', description: 'Set work aside — list, preview, pop, apply, drop' },
  async run() { await runTUI('stash'); },
});
