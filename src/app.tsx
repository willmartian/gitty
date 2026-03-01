import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { type RepoInfo, getRepoInfo } from './git.ts';
import { HintBar } from './components/hints.tsx';
import { Section } from './components/Section.tsx';
import { brandColor } from './styles.ts';
import StageTab from './commands/stage/StageTab.tsx';
import BranchTab from './commands/branch/BranchTab.tsx';
import StashTab from './commands/stash/StashTab.tsx';

const COMMANDS = ['stage', 'branch', 'stash'] as const;
export type Tab = typeof COMMANDS[number];

const HINTS: Record<Tab, [string, string][]> = {
  stage: [
    ['space', 'stage / unstage'], ['d', 'discard'],
    ['S', 'stage all'], ['U', 'unstage all'],
    ['c', 'commit'], ['p', 'push'], ['P', 'pull'], ['q', 'quit'],
  ],
  branch: [
    ['↵', 'checkout'], ['d', 'delete'], ['D', 'force delete'],
    ['q', 'quit'],
  ],
  stash: [
    ['↵', 'pop'], ['a', 'apply'], ['d', 'drop'], ['p', 'push'],
    ['q', 'quit'],
  ],
};

export default function App({ initial = 'stage' }: { initial?: Tab }) {
  const [active, setActive] = useState<Tab>(initial);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [cursors, setCursors] = useState<Partial<Record<Tab, number>>>({});
  const [commitOpen, setCommitOpen] = useState(false);

  const cursorFor = (tab: Tab) => cursors[tab] ?? 0;
  const setCursorFor = (tab: Tab) => (n: number) => setCursors(c => ({ ...c, [tab]: n }));

  useEffect(() => {
    void getRepoInfo().then(setRepoInfo).catch(() => {});
  }, [active]);

  const { exit } = useApp();

  useInput((input, key) => {
    if (commitOpen) return;
    if (input === 'q' || key.escape) { exit(); return; }
    if (key.tab && key.shift) {
      const idx = COMMANDS.indexOf(active);
      setActive(COMMANDS[Math.max(0, idx - 1)]!);
      return;
    }
    if (key.tab) {
      const idx = COMMANDS.indexOf(active);
      setActive(COMMANDS[Math.min(COMMANDS.length - 1, idx + 1)]!);
      return;
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <Section paddingLeft={1} paddingRight={1} alignSelf="flex-start">
        <Box gap={1}>
          <Text bold color={brandColor}>gitty 🐈</Text>
          <Text dimColor>·</Text>
          <Box gap={1}>
            {COMMANDS.map((cmd, i) => (
              <React.Fragment key={cmd}>
                {i > 0 && <Text dimColor>|</Text>}
                <Text bold={active === cmd} color={active === cmd ? 'white' : 'gray'}>{cmd}</Text>
              </React.Fragment>
            ))}
          </Box>
          {repoInfo && (
            <>
              <Text dimColor>·</Text>
              <Box gap={1}>
                <Text color="yellow">⎇ {repoInfo.detached ? 'HEAD detached' : repoInfo.branch}</Text>
                {repoInfo.ahead > 0 && <Text color="green">↑{repoInfo.ahead}</Text>}
                {repoInfo.behind > 0 && <Text color="red">↓{repoInfo.behind}</Text>}
              </Box>
            </>
          )}
        </Box>
        <HintBar hints={HINTS[active]} />
      </Section>
      {active === 'stage'  && <StageTab cursor={cursorFor('stage')} onCursorChange={setCursorFor('stage')} onCommitOpenChange={setCommitOpen} />}
      {active === 'branch' && <BranchTab cursor={cursorFor('branch')} onCursorChange={setCursorFor('branch')} />}
      {active === 'stash'  && <StashTab cursor={cursorFor('stash')} onCursorChange={setCursorFor('stash')} />}
    </Box>
  );
}
