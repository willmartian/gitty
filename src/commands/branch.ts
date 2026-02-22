import { defineCommand } from 'citty';
import { runTUI } from '../run.ts';

export default defineCommand({
  meta: { name: 'branch', description: 'List, switch, and delete branches' },
  async run() { await runTUI('branch'); },
});
