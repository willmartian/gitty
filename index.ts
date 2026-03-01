#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';
import stage from './src/commands/stage/stage.ts';
import branch from './src/commands/branch/branch.ts';
import stash from './src/commands/stash/stash.ts';
import log from './src/commands/log/log.ts';
import commit from './src/commands/commit/commit.ts';
import { runTUI } from './src/tui.ts';

const main = defineCommand({
  meta: {
    name: 'gitty',
    description: 'Focused micro-TUIs for git workflows',
  },
  subCommands: { stage, branch, stash, log, commit },
  async run() { await runTUI('stage'); },
});

runMain(main);
