import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type GitFile, type XY, getStatus, stage, stageAll, unstage, unstageAll, discard, commit, push, pull } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';
import CommitSheet from './CommitSheet.tsx';
import { Section } from '../../components/Section.tsx';
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

  return (
    <Box>
      <Cursor selected={selected} />
      <Text> </Text>
      <Text color={color} bold={selected}>{label}</Text>
      <Text color={selected ? 'white' : 'gray'}> {name}</Text>
    </Box>
  );
}

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <Box>
      <Text bold color="white">{label}</Text>
      <Text color="gray"> ({count})</Text>
    </Box>
  );
}

export default function StageTab({ cursor, onCursorChange, onCommitOpenChange }: {
  cursor: number;
  onCursorChange: (n: number) => void;
  onCommitOpenChange: (open: boolean) => void;
}) {
  const log = useLog();

  const [changes, setChanges] = useState<GitFile[]>([]);
  const [staged, setStaged] = useState<GitFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitOpen, setCommitOpen] = useState(false);

  const openCommit = () => { setCommitOpen(true); onCommitOpenChange(true); };
  const closeCommit = () => { setCommitOpen(false); onCommitOpenChange(false); };

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

  const { busy, flash, showFlash, runOp } = useTabState(refresh);

  const items: Item[] = [
    ...staged.map((f, i): Item => ({ section: 'staged', file: f, idx: i })),
    ...changes.map((f, i): Item => ({ section: 'changes', file: f, idx: i })),
  ];

  const totalItems = items.length;
  const cur = totalItems > 0 ? Math.min(cursor, totalItems - 1) : 0;
  const sel = items[cur] ?? null;

  useInput((input, key) => {
    if (busy || loading || commitOpen) return;

    if (key.upArrow || input === 'k') { onCursorChange(Math.max(0, cursor - 1)); return; }
    if (key.downArrow || input === 'j') { onCursorChange(Math.min(Math.max(0, totalItems - 1), cursor + 1)); return; }
    if (input === 'r') { void refresh(); return; }

    if (input === 'p') { log({ action: 'pushed', detail: 'origin' }); runOp(push, 'Pushed'); return; }
    if (input === 'P') { log({ action: 'pulled', detail: 'origin' }); runOp(pull, 'Pulled'); return; }

    if (!sel) return;
    const { file, section } = sel;

    if (input === ' ') {
      if (section === 'changes') {
        log({ action: 'staged', detail: file.path });
        runOp(() => stage(file.path), `Staged: ${file.path}`);
      } else {
        log({ action: 'unstaged', detail: file.path });
        runOp(() => unstage(file.path), `Unstaged: ${file.path}`);
      }
      return;
    }

    if ((input === 'd' || input === 'z') && section === 'changes') {
      log({ action: 'discarded', detail: file.path });
      runOp(() => discard(file), `Discarded: ${file.path}`);
      return;
    }

    if (input === 'S') { log({ action: 'staged', detail: 'all changes' }); runOp(stageAll, 'Staged all changes'); return; }
    if (input === 'U') { log({ action: 'unstaged', detail: 'all' }); runOp(unstageAll, 'Unstaged all'); return; }

    if (input === 'c' && staged.length > 0) { openCommit(); return; }
  });

  return (
    <Box flexDirection="column">
      {commitOpen && (
        <CommitSheet
          onClose={closeCommit}
          onCommit={(msg) => { log({ action: 'committed', detail: msg.split('\n')[0]! }); runOp(() => commit(msg), 'Committed!'); }}
        />
      )}
      <StatusLine error={error} loading={loading} />

      {!error && !loading && (
        <>
          <Section paddingLeft={1}>
            <SectionHead label="STAGED" count={staged.length} />
            {staged.length === 0
              ? <Box paddingLeft={2}><Text dimColor>Nothing staged</Text></Box>
              : staged.map((f, i) => (
                  <FileRow key={`s:${f.path}`} file={f} section="staged"
                    selected={!commitOpen && sel?.section === 'staged' && sel.idx === i} />
                ))
            }
          </Section>

          <Section paddingLeft={1}>
            <SectionHead label="CHANGES" count={changes.length} />
            {changes.length === 0
              ? <Box paddingLeft={2}><Text dimColor>Clean</Text></Box>
              : changes.map((f, i) => (
                  <FileRow key={`c:${f.path}`} file={f} section="changes"
                    selected={!commitOpen && sel?.section === 'changes' && sel.idx === i} />
                ))
            }
          </Section>

          {changes.length === 0 && staged.length === 0 && (
            <Box marginTop={1}>
              <Text dimColor>  No changes in working tree</Text>
            </Box>
          )}
        </>
      )}

      <FlashMessage flash={flash} />
    </Box>
  );
}
