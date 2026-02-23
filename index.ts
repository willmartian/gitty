#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';
import stage from './src/commands/stage/stage.ts';
import branch from './src/commands/branch/branch.ts';
import stash from './src/commands/stash/stash.ts';

const main = defineCommand({
  meta: {
    name: 'gitty',
    description: 'Focused micro-TUIs for git workflows',
  },
  args: {
    altScreen: { type: 'boolean', alias: 'a', description: 'Launch in alternate screen buffer', default: false },
  },
  subCommands: {
    stage,
branch,
    stash,
  },
});

runMain(main);
