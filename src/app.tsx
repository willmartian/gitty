import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { type RepoInfo, getRepoInfo } from './git.ts';
import { HintBar } from './components/hints.tsx';
import StageTab from './commands/stage/StageTab.tsx';
import BranchTab from './commands/branch/BranchTab.tsx';
import StashTab from './commands/stash/StashTab.tsx';

const TABS = ['stage', 'branch', 'stash'] as const;
export type Tab = typeof TABS[number];

const HINTS: Record<Tab, [string, string][]> = {
  stage: [
    ['s', 'stage'], ['u', 'unstage'], ['d', 'discard'],
    ['S', 'stage all'], ['U', 'unstage all'],
    ['q', 'quit'],
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

  useEffect(() => {
    void getRepoInfo().then(setRepoInfo).catch(() => {});
  }, [active]);

  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q') { exit(); return; }
    if (key.tab) {
      setActive(tab => {
        const idx = TABS.indexOf(tab);
        const next = key.shift
          ? (idx - 1 + TABS.length) % TABS.length
          : (idx + 1) % TABS.length;
        return TABS[next]!;
      });
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingLeft={1} paddingRight={1} marginBottom={1} alignSelf="flex-start">
        <Box gap={1}>
          <Text bold color="#ff69b4">gitty 🐈</Text>
          <Text dimColor>·</Text>
          <Box>
            {TABS.map((tab, i) => {
              const isActive = tab === active;
              return (
                <Box key={tab}>
                  {i > 0 && <Text dimColor> / </Text>}
                  <Text bold={isActive} color={isActive ? 'greenBright' : 'gray'}>
                    {tab}
                  </Text>
                </Box>
              );
            })}
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
      </Box>
      {active === 'stage'  && <StageTab />}
      {active === 'branch' && <BranchTab />}
      {active === 'stash'  && <StashTab />}
    </Box>
  );
}
