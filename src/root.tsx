import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { type RepoInfo, getRepoInfo } from './git.ts';
import Stage from './app.tsx';
import BranchTab from './branch.tsx';

const TABS = ['stage', 'log', 'branch', 'stash'] as const;
export type Tab = typeof TABS[number];

function TabBar({ active, repoInfo }: { active: Tab; repoInfo: RepoInfo | null }) {
  return (
    <Box marginBottom={1} gap={2}>
      <Text bold color="#ff69b4">gitten 🐱</Text>
      {repoInfo && (
        <Box gap={1}>
          <Text color="yellow">⎇ {repoInfo.detached ? 'HEAD detached' : repoInfo.branch}</Text>
          {repoInfo.ahead > 0 && <Text color="green">↑{repoInfo.ahead}</Text>}
          {repoInfo.behind > 0 && <Text color="red">↓{repoInfo.behind}</Text>}
          {repoInfo.upstream && <Text dimColor>{repoInfo.upstream}</Text>}
        </Box>
      )}
      <Box gap={1}>
        {TABS.map((tab, i) => {
          const isActive = tab === active;
          return (
            <Box key={tab}>
              {i > 0 && <Text dimColor>·</Text>}
              <Text bold={isActive} inverse={isActive} color={isActive ? undefined : 'gray'}>
                {` ${tab} `}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function Placeholder({ name }: { name: Tab }) {
  return (
    <Box paddingLeft={1} paddingTop={1}>
      <Text dimColor>gitten {name} — coming soon</Text>
    </Box>
  );
}

export default function Root({ initial = 'stage' }: { initial?: Tab }) {
  const [active, setActive] = useState<Tab>(initial);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);

  useEffect(() => {
    void getRepoInfo().then(setRepoInfo).catch(() => {});
  }, [active]);

  useInput((_input, key) => {
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
      <TabBar active={active} repoInfo={repoInfo} />
      {active === 'stage'  && <Stage />}
      {active === 'log'    && <Placeholder name="log" />}
      {active === 'branch' && <BranchTab />}
      {active === 'stash'  && <Placeholder name="stash" />}
    </Box>
  );
}
