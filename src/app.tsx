import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { type GitFile, type XY, getStatus, stage, stageAll, unstage, unstageAll, discard } from './git.ts';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'changes' | 'staged';
interface Item { section: Section; file: GitFile; idx: number }

// ── Status display ────────────────────────────────────────────────────────────

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

// ── Components ────────────────────────────────────────────────────────────────

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
      <Text color="cyan">{selected ? '▶' : ' '}</Text>
      <Text> </Text>
      <Text color={color} bold={selected}>{label}</Text>
      <Text color={selected ? 'white' : 'gray'}> {name}</Text>
    </Box>
  );
}

function SectionHead({ label, count, open, shortcut }: {
  label: string;
  count: number;
  open: boolean;
  shortcut: string;
}) {
  return (
    <Box>
      <Text bold>{open ? '▼' : '▶'} </Text>
      <Text bold color="white">{label}</Text>
      <Text color="gray">  {count} file{count !== 1 ? 's' : ''}  [{shortcut}]</Text>
    </Box>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const { exit } = useApp();
  const [changes, setChanges] = useState<GitFile[]>([]);
  const [staged, setStaged] = useState<GitFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [cursor, setCursor] = useState(0);
  const [changesOpen, setChangesOpen] = useState(true);
  const [stagedOpen, setStagedOpen] = useState(true);

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

  const items: Item[] = [
    ...(changesOpen ? changes.map((f, i): Item => ({ section: 'changes', file: f, idx: i })) : []),
    ...(stagedOpen ? staged.map((f, i): Item => ({ section: 'staged', file: f, idx: i })) : []),
  ];

  const totalItems = items.length;
  const cur = totalItems > 0 ? Math.min(cursor, totalItems - 1) : 0;
  const sel = items[cur] ?? null;

  const showFlash = (msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 2500);
  };

  const runOp = (op: () => Promise<void>, msg: string) => {
    if (busy) return;
    setBusy(true);
    void op()
      .then(() => refresh())
      .then(() => showFlash(msg))
      .catch((e: unknown) => showFlash(`Error: ${e instanceof Error ? e.message : String(e)}`, false))
      .finally(() => setBusy(false));
  };

  useInput((input, key) => {
    if ((key.ctrl && input === 'c') || input === 'q') { exit(); return; }
    if (busy || loading) return;

    if (key.upArrow || input === 'k') {
      setCursor(c => Math.max(0, c - 1));
      return;
    }
    if (key.downArrow || input === 'j') {
      setCursor(c => Math.min(Math.max(0, totalItems - 1), c + 1));
      return;
    }

    if (input === '1') { setChangesOpen(o => !o); return; }
    if (input === '2') { setStagedOpen(o => !o); return; }
    if (input === 'r') { void refresh(); return; }

    if (!sel) return;
    const { file, section } = sel;

    // Space / enter: context-aware stage or unstage
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

    if (input === 'S') {
      runOp(stageAll, 'Staged all changes');
      return;
    }

    if (input === 'U') {
      runOp(unstageAll, 'Unstaged all');
      return;
    }
  });

  const actionHint = sel?.section === 'changes'
    ? 'spc/s stage  d discard  ·  '
    : sel?.section === 'staged'
    ? 'spc/u unstage  ·  '
    : '';

  return (
    <Box flexDirection="column">

      {/* Error */}
      {error && <Text color="red">✖ {error}</Text>}

      {/* Loading */}
      {!error && loading && <Text dimColor>  Loading...</Text>}

      {/* Content */}
      {!error && !loading && (
        <>
          {/* CHANGES */}
          <SectionHead label="CHANGES" count={changes.length} open={changesOpen} shortcut="1" />
          {changesOpen && (
            <>
              {changes.length === 0 && (
                <Box paddingLeft={3}><Text dimColor>Clean</Text></Box>
              )}
              {changes.map((f, i) => (
                <FileRow
                  key={`c:${f.path}`}
                  file={f}
                  section="changes"
                  selected={sel?.section === 'changes' && sel.idx === i}
                />
              ))}
            </>
          )}

          {/* STAGED CHANGES */}
          <Box marginTop={1} flexDirection="column">
            <SectionHead label="STAGED CHANGES" count={staged.length} open={stagedOpen} shortcut="2" />
            {stagedOpen && (
              <>
                {staged.length === 0 && (
                  <Box paddingLeft={3}><Text dimColor>Nothing staged</Text></Box>
                )}
                {staged.map((f, i) => (
                  <FileRow
                    key={`s:${f.path}`}
                    file={f}
                    section="staged"
                    selected={sel?.section === 'staged' && sel.idx === i}
                  />
                ))}
              </>
            )}
          </Box>

          {/* All clean */}
          {changes.length === 0 && staged.length === 0 && (
            <Box marginTop={1}>
              <Text dimColor>  No changes in working tree</Text>
            </Box>
          )}
        </>
      )}

      {/* Flash message */}
      {flash && (
        <Box marginTop={1}>
          <Text color={flash.ok ? 'green' : 'red'}>{flash.ok ? '✔ ' : '✖ '}{flash.msg}</Text>
        </Box>
      )}

      {/* Key hints */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingLeft={1} paddingRight={1}>
        <Text dimColor>{actionHint}S stage all  U unstage all  j/k ↑↓  r refresh  q quit  tab switch</Text>
      </Box>

    </Box>
  );
}
