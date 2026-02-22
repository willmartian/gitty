import { defineCommand } from 'citty';
import { runTUI } from '../run.ts';

export default defineCommand({
  meta: { name: 'stage', description: 'Stage files, write a message, and commit' },
  async run() { await runTUI('stage'); },
});
