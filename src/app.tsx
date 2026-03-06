import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { type RepoInfo, getRepoInfo, isGitRepo, initRepo } from './git.ts';
import { Section } from './components/Section.tsx';
import { Tabs, Tab, TabBar, TabContent } from './components/Tabs.tsx';
import { brandColor } from './styles.ts';
import StageTab from './commands/stage/StageTab.tsx';
import BranchTab from './commands/branch/BranchTab.tsx';
import StashTab from './commands/stash/StashTab.tsx';
import LogTab from './commands/log/LogTab.tsx';
import WorktreeTab from './commands/worktree/WorktreeTab.tsx';
import { InputLockProvider } from './contexts/InputLock.tsx';

export type AppTab = 'stage' | 'branch' | 'stash' | 'log' | 'worktree';

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

function AppInner({ initial = 'stage' }: { initial?: AppTab }) {
  const [repoChecked, setRepoChecked] = useState(false);
  const [hasRepo, setHasRepo] = useState(false);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const { stdout } = useStdout();
  const [rows, setRows] = useState(stdout.rows);
  useEffect(() => {
    const onResize = () => setRows(stdout.rows);
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  useEffect(() => {
    void isGitRepo().then(ok => { setHasRepo(ok); setRepoChecked(true); });
  }, []);

  const refreshRepoInfo = () => void getRepoInfo().then(setRepoInfo).catch(() => {});

  useEffect(() => {
    if (hasRepo) refreshRepoInfo();
  }, [hasRepo]);

  if (!repoChecked) return null;

  if (!hasRepo) return <NoRepoPrompt onInit={() => setHasRepo(true)} />;

  return (
    <Box flexDirection="column" height={rows} paddingLeft={1} paddingRight={1}>
      <Tabs initial={initial} onChange={refreshRepoInfo}>
        <Tab name="stage"><StageTab onRemoteOp={refreshRepoInfo} /></Tab>
        <Tab name="branch"><BranchTab /></Tab>
        <Tab name="stash"><StashTab /></Tab>
        <Tab name="log"><LogTab /></Tab>
        <Tab name="worktree"><WorktreeTab /></Tab>

        <Section paddingLeft={1} paddingRight={1} alignSelf="flex-start">
          <Box gap={1}>
            <Text bold color={brandColor}>gitty 🐈</Text>
            <Text dimColor>·</Text>
            <TabBar />
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
        </Section>
        <Box flexGrow={1} flexDirection="column">
          <TabContent />
        </Box>
      </Tabs>
    </Box>
  );
}

export default function App({ initial = 'stage' }: { initial?: AppTab }) {
  return (
    <InputLockProvider>
      <AppInner initial={initial} />
    </InputLockProvider>
  );
}
