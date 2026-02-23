import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type GitFile, type XY, getStatus, stage, stageAll, unstage, unstageAll, discard } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';

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
    <Box paddingLeft={1}>
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
      <Text color="gray">  {count} file{count !== 1 ? 's' : ''}</Text>
    </Box>
  );
}

export default function StageTab() {
  const [changes, setChanges] = useState<GitFile[]>([]);
  const [staged, setStaged] = useState<GitFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);

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
    ...changes.map((f, i): Item => ({ section: 'changes', file: f, idx: i })),
    ...staged.map((f, i): Item => ({ section: 'staged', file: f, idx: i })),
  ];

  const totalItems = items.length;
  const cur = totalItems > 0 ? Math.min(cursor, totalItems - 1) : 0;
  const sel = items[cur] ?? null;

  useInput((input, key) => {
    if (busy || loading) return;

    if (key.upArrow || input === 'k') { setCursor(c => Math.max(0, c - 1)); return; }
    if (key.downArrow || input === 'j') { setCursor(c => Math.min(Math.max(0, totalItems - 1), c + 1)); return; }
    if (input === 'r') { void refresh(); return; }

    if (!sel) return;
    const { file, section } = sel;

    if (input === ' ' || key.return) {
      if (section === 'changes') {
        runOp(() => stage(file.path), `Staged: ${file.path}`);
      } else {
        runOp(() => unstage(file.path), `Unstaged: ${file.path}`);
      }
      return;
    }

    if (input === 's' && section === 'changes') {
      runOp(() => stage(file.path), `Staged: ${file.path}`);
      return;
    }

    if (input === 'u' && section === 'staged') {
      runOp(() => unstage(file.path), `Unstaged: ${file.path}`);
      return;
    }

    if ((input === 'd' || input === 'z') && section === 'changes') {
      runOp(() => discard(file), `Discarded: ${file.path}`);
      return;
    }

    if (input === 'S') { runOp(stageAll, 'Staged all changes'); return; }
    if (input === 'U') { runOp(unstageAll, 'Unstaged all'); return; }
  });

  return (
    <Box flexDirection="column">
      <StatusLine error={error} loading={loading} />

      {!error && !loading && (
        <>
          <SectionHead label="CHANGES" count={changes.length} />
          {changes.length === 0
            ? <Box paddingLeft={3}><Text dimColor>Clean</Text></Box>
            : changes.map((f, i) => (
                <FileRow key={`c:${f.path}`} file={f} section="changes"
                  selected={sel?.section === 'changes' && sel.idx === i} />
              ))
          }

          <Box marginTop={1} flexDirection="column">
            <SectionHead label="STAGED" count={staged.length} />
            {staged.length === 0
              ? <Box paddingLeft={3}><Text dimColor>Nothing staged</Text></Box>
              : staged.map((f, i) => (
                  <FileRow key={`s:${f.path}`} file={f} section="staged"
                    selected={sel?.section === 'staged' && sel.idx === i} />
                ))
            }
          </Box>

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
