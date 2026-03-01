import { defineCommand } from 'citty';
import CommitApp from './CommitApp.tsx';
import { runUI } from '../../tui.ts';

export default defineCommand({
  meta: {
    name: 'commit',
    description: 'Write and create a commit',
  },
  async run() {
    await runUI(CommitApp, false);
  },
});
