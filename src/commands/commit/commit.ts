import { defineCommand } from 'citty';
import { createElement } from 'react';
import CommitApp from './CommitApp.tsx';
import { runUI } from '../../tui.ts';

export default defineCommand({
  meta: {
    name: 'commit',
    description: 'Write and create a commit',
  },
  args: {
    amend: { type: 'boolean', description: 'Amend the last commit', default: false },
  },
  async run({ args }) {
    await runUI(() => createElement(CommitApp, { amend: args.amend }), false);
  },
});
