#!/usr/bin/env bun
import { defineCommand, runMain } from 'citty';
import stage from './src/commands/stage.ts';
import log from './src/commands/log.ts';
import branch from './src/commands/branch.ts';
import stash from './src/commands/stash.ts';

const main = defineCommand({
  meta: {
    name: 'gitten',
    description: 'Focused micro-TUIs for git workflows',
  },
  args: {
    altScreen: { type: 'boolean', alias: 'a', description: 'Launch in alternate screen buffer', default: false },
  },
  subCommands: {
    stage,
    log,
    branch,
    stash,
  },
});

runMain(main);
