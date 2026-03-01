import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { type RepoInfo, getRepoInfo, isGitRepo, initRepo } from './git.ts';
import { HintBar } from './components/hints.tsx';
import { Section } from './components/Section.tsx';
import { brandColor } from './styles.ts';
import StageTab from './commands/stage/StageTab.tsx';
import BranchTab from './commands/branch/BranchTab.tsx';
import StashTab from './commands/stash/StashTab.tsx';
import LogTab from './commands/log/LogTab.tsx';
import { InputLockProvider, useInputLocked } from './contexts/InputLock.tsx';

const COMMANDS = ['stage', 'branch', 'stash', 'log'] as const;
export type Tab = typeof COMMANDS[number];

const HINTS: Record<Tab, [string, string][]> = {
  stage: [
    ['↵', 'diff'], ['space', 'stage / unstage'], ['d', 'discard'],
    ['S', 'stage all'], ['U', 'unstage all'],
    ['c', 'commit'], ['p', 'push'], ['P', 'pull'], ['esc', 'quit'],
  ],
  branch: [
    ['↵', 'checkout'], ['d', 'delete'], ['D', 'force delete'],
    ['f', 'filter'], ['esc', 'quit'],
  ],
  stash: [
    ['↵', 'pop'], ['a', 'apply'], ['d', 'drop'], ['p', 'push'],
    ['f', 'filter'], ['esc', 'quit'],
  ],
  log: [
    ['f', 'filter'], ['r', 'refresh'], ['esc', 'quit'],
  ],
};

function NoRepoPrompt({ onInit }: { onInit: () => void }) {
  const { exit } = useApp();
  const [initializing, setInitializing] = useState(false);

  useInput((input, key) => {
    if (initializing) return;
    if (input === 'y' || input === 'Y') {
      setInitializing(true);
      void initRepo().then(onInit);
    }
    if (input === 'n' || input === 'N' || key.escape) { exit(); }
  });

  return (
    <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
      <Section paddingLeft={1} paddingRight={1} alignSelf="flex-start">
        <Text bold color={brandColor}>gitty 🐈</Text>
        <Text color="yellow">Not a git repository.</Text>
        {initializing
          ? <Text dimColor>Initializing…</Text>
          : <Text>Initialize here? <Text bold color="white">y</Text><Text dimColor>/N</Text></Text>
        }
      </Section>
    </Box>
  );
}

function AppInner({ initial = 'stage' }: { initial?: Tab }) {
  const [repoChecked, setRepoChecked] = useState(false);
  const [hasRepo, setHasRepo] = useState(false);
  const [active, setActive] = useState<Tab>(initial);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [cursors, setCursors] = useState<Partial<Record<Tab, number>>>({});

  const { exit } = useApp();
  const locked = useInputLocked();

  useEffect(() => {
    void isGitRepo().then(ok => { setHasRepo(ok); setRepoChecked(true); });
  }, []);

  const cursorFor = (tab: Tab) => cursors[tab] ?? 0;
  const setCursorFor = (tab: Tab) => (n: number) => setCursors(c => ({ ...c, [tab]: n }));

  const refreshRepoInfo = () => void getRepoInfo().then(setRepoInfo).catch(() => {});

  useEffect(() => {
    if (hasRepo) refreshRepoInfo();
  }, [active, hasRepo]);

  useInput((input, key) => {
    if (!hasRepo || locked) return;
    if (key.escape) { exit(); return; }
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

  if (!repoChecked) return null;

  if (!hasRepo) return <NoRepoPrompt onInit={() => setHasRepo(true)} />;

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
      {active === 'stage'  && <StageTab cursor={cursorFor('stage')} onCursorChange={setCursorFor('stage')} onRemoteOp={refreshRepoInfo} />}
      {active === 'branch' && <BranchTab cursor={cursorFor('branch')} onCursorChange={setCursorFor('branch')} />}
      {active === 'stash'  && <StashTab cursor={cursorFor('stash')} onCursorChange={setCursorFor('stash')} />}
      {active === 'log'    && <LogTab cursor={cursorFor('log')} onCursorChange={setCursorFor('log')} />}
    </Box>
  );
}

export default function App({ initial = 'stage' }: { initial?: Tab }) {
  return (
    <InputLockProvider>
      <AppInner initial={initial} />
    </InputLockProvider>
  );
}
