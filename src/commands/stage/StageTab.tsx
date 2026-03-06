import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { type GitFile, type XY, getStatus, stage, stageAll, unstage, unstageAll, discard, commit, push, pull } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Table } from '../../components/Table.tsx';
import CommitSheet from './CommitSheet.tsx';
import DiffViewer from './DiffViewer.tsx';
import { Section } from '../../components/Section.tsx';
import { ActionBar, Action } from '../../components/ActionBar.tsx';
import { useLog } from '../../hooks/useLog.ts';

type Section = 'changes' | 'staged';
interface Item { section: Section; file: GitFile; idx: number }

const STATUS_MAP: Partial<Record<XY, { label: string; color: string }>> = {
  M: { label: 'M', color: 'yellow' },
  A: { label: 'A', color: 'green' },
  D: { label: 'D', color: 'red' },
  R: { label: 'R', color: 'cyan' },
  C: { label: 'C', color: 'cyan' },
  U: { label: 'U', color: 'magenta' },
};

function statusDisplay(code: XY, untracked: boolean): { label: string; color: string } {
  if (untracked) return { label: 'U', color: 'green' };
  return STATUS_MAP[code] ?? { label: code, color: 'white' };
}

function FileRow({ file, section, selected }: {
  file: GitFile;
  section: Section;
  selected: boolean;
}) {
  const untracked = file.x === '?' && file.y === '?';
  const code = section === 'staged' ? file.x : (file.y !== ' ' ? file.y : file.x);
  const { label, color } = statusDisplay(code, untracked && section === 'changes');
  const name = file.origPath ? `${file.origPath} → ${file.path}` : file.path;

  return (<>
    <Text> </Text>
    <Text color={color} bold={selected}>{label}</Text>
    <Text color={selected ? 'white' : 'gray'}> {name}</Text>
  </>);
}

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <Box>
      <Text bold color="white">{label}</Text>
      <Text color="gray"> ({count})</Text>
    </Box>
  );
}

export default function StageTab({ onRemoteOp }: {
  onRemoteOp?: () => void;
}) {
  const [cursor, setCursor] = useState(0);
  const { exit } = useApp();
  const log = useLog();

  const [changes, setChanges] = useState<GitFile[]>([]);
  const [staged, setStaged] = useState<GitFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);
  const [diffTarget, setDiffTarget] = useState<{ file: GitFile; section: 'staged' | 'changes' } | null>(null);
  const openDiff = (file: GitFile, section: 'staged' | 'changes') => setDiffTarget({ file, section });
  const closeDiff = () => setDiffTarget(null);

  const openCommit = () => setCommitOpen(true);
  const closeCommit = () => setCommitOpen(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { changes: c, staged: s } = await getStatus();
      setChanges(c);
      setStaged(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'git error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const { busy, flash, runOp, runNetworkOp, progressMsg } = useTabState(refresh);

  const items: Item[] = [
    ...staged.map((f, i): Item => ({ section: 'staged', file: f, idx: i })),
    ...changes.map((f, i): Item => ({ section: 'changes', file: f, idx: i })),
  ];

  const totalItems = items.length;
  const cur = totalItems > 0 ? Math.min(cursor, totalItems - 1) : 0;
  const sel = items[cur] ?? null;

  useInput((input, key) => {
    if (busy || loading || commitOpen || !!diffTarget) return;
    if (key.upArrow || input === 'k') { setCursor(Math.max(0, cursor - 1)); return; }
    if (key.downArrow || input === 'j') { setCursor(Math.min(Math.max(0, totalItems - 1), cursor + 1)); return; }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      {commitOpen && (
        <CommitSheet
          onClose={closeCommit}
          onCommit={(msg) => { log({ action: 'committed', detail: msg.split('\n')[0]! }); closeCommit(); runOp(() => commit(msg), 'Committed!', onRemoteOp); }}
        />
      )}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <StatusLine error={error} loading={loading} progress={progressMsg} />

        {diffTarget && (
          <DiffViewer
            file={diffTarget.file}
            section={diffTarget.section}
            onClose={closeDiff}
          />
        )}

        {!diffTarget && !error && !loading && (
          <>
            <Section paddingLeft={1}>
              <SectionHead label="STAGED" count={staged.length} />
              <Table
                rows={staged}
                cursor={!commitOpen && sel?.section === 'staged' ? sel.idx : -1}
                getKey={(f) => f.path}
                empty="Nothing staged"
                renderRow={(f, selected) => <FileRow file={f} section="staged" selected={selected} />}
              />
            </Section>

            <Section paddingLeft={1}>
              <SectionHead label="CHANGES" count={changes.length} />
              <Table
                rows={changes}
                cursor={!commitOpen && sel?.section === 'changes' ? sel.idx : -1}
                getKey={(f) => f.path}
                empty="Clean"
                renderRow={(f, selected) => <FileRow file={f} section="changes" selected={selected} />}
              />
            </Section>
          </>
        )}
      </Box>
      <FlashMessage flash={flash} />
      <ActionBar item={sel} busy={busy || loading || commitOpen || !!diffTarget}>
        <Action binding="↵"     label="diff"           onAction={(s: Item) => openDiff(s.file, s.section)} />
        <Action binding="space"  label="stage / unstage" onAction={(s: Item) => {
          if (s.section === 'changes') { log({ action: 'staged',   detail: s.file.path }); runOp(() => stage(s.file.path),   `Staged: ${s.file.path}`); }
          else                         { log({ action: 'unstaged', detail: s.file.path }); runOp(() => unstage(s.file.path), `Unstaged: ${s.file.path}`); }
        }} />
        <Action binding="d"     label="discard"        onAction={(s: Item) => { log({ action: 'discarded', detail: s.file.path }); runOp(() => discard(s.file), `Discarded: ${s.file.path}`); }}
          disabled={(s: Item) => s.section !== 'changes' ? 'Nothing to discard' : null}
          confirm={(s: Item) => `Discard changes to ${s.file.path}?`} />
        <Action binding="S"     label="stage all"      onAction={() => { log({ action: 'staged',   detail: 'all changes' }); runOp(stageAll,   'Staged all changes'); }} requiresItem={false} />
        <Action binding="U"     label="unstage all"    onAction={() => { log({ action: 'unstaged', detail: 'all' });          runOp(unstageAll, 'Unstaged all'); }}       requiresItem={false} />
        <Action binding="c"     label="commit"         onAction={() => openCommit()} requiresItem={false}
          disabled={() => staged.length === 0 ? 'Nothing staged' : null} />
        <Action binding="p"     label="push"           onAction={() => { log({ action: 'pushed', detail: 'origin' }); runNetworkOp((onProgress) => push(({ stage, progress }) => onProgress(stage, progress)), 'Pushed', onRemoteOp); }} requiresItem={false} />
        <Action binding="P"     label="pull"           onAction={() => { log({ action: 'pulled', detail: 'origin' }); runNetworkOp((onProgress) => pull(({ stage, progress }) => onProgress(stage, progress)), 'Pulled', onRemoteOp); }} requiresItem={false} />
        <Action binding="esc"   label="quit"           onAction={() => exit()} requiresItem={false} />
      </ActionBar>
    </Box>
  );
}
