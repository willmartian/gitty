import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type Stash, getStashes, stashPush, stashPop, stashApply, stashDrop } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { useFilter } from '../../hooks/useFilter.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { FilterBar } from '../../components/FilterBar.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';

export default function StashTab({ cursor, onCursorChange, onFilterOpenChange }: {
  cursor: number;
  onCursorChange: (n: number) => void;
  onFilterOpenChange: (open: boolean) => void;
}) {
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStashes(await getStashes());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'git error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const { busy, flash, runOp } = useTabState(refresh);
  const { filterOpen, query, filtered, openFilter, closeFilter, appendQuery, backspaceQuery } = useFilter(
    stashes,
    (s, q) => s.message.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q),
  );

  useEffect(() => { onFilterOpenChange(filterOpen); }, [filterOpen]);

  const cur = filtered.length > 0 ? Math.min(cursor, filtered.length - 1) : 0;
  const sel = filtered[cur] ?? null;
  const maxMsgLen = Math.max(...filtered.map(s => s.message.length), 0);

  useInput((input, key) => {
    if (busy || loading) return;

    if (filterOpen) {
      if (key.escape) { closeFilter(); onCursorChange(0); return; }
      if (key.backspace || key.delete) { backspaceQuery(); onCursorChange(0); return; }
      if (key.upArrow) { onCursorChange(Math.max(0, cursor - 1)); return; }
      if (key.downArrow) { onCursorChange(Math.min(Math.max(0, filtered.length - 1), cursor + 1)); return; }
      if (input && !key.ctrl && !key.meta && input.length === 1) { appendQuery(input); onCursorChange(0); return; }
      return;
    }

    if (key.upArrow || input === 'k') { onCursorChange(Math.max(0, cursor - 1)); return; }
    if (key.downArrow || input === 'j') { onCursorChange(Math.min(Math.max(0, filtered.length - 1), cursor + 1)); return; }
    if (input === 'r') { void refresh(); return; }
    if (input === 'f') { openFilter(); return; }

    if (input === 'p') {
      runOp(() => stashPush(), 'Stashed changes');
      return;
    }

    if (!sel) return;

    if (input === ' ' || key.return) {
      runOp(() => stashPop(sel.ref), `Popped ${sel.ref}`);
      return;
    }

    if (input === 'a') {
      runOp(() => stashApply(sel.ref), `Applied ${sel.ref}`);
      return;
    }

    if (input === 'd') {
      runOp(() => stashDrop(sel.ref), `Dropped ${sel.ref}`);
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <StatusLine error={error} loading={loading} />

      {!error && !loading && (
        <>
          {filterOpen && <FilterBar query={query} />}
          {filtered.length === 0 && (
            <Box paddingLeft={1}><Text dimColor>{query ? 'No matches' : 'No stashes  (p to push current changes)'}</Text></Box>
          )}
          {filtered.map((s, i) => {
            const selected = i === cur;
            const truncatedMsg = s.message.length > 52 ? s.message.slice(0, 51) + '…' : s.message;
            const ref = s.ref.replace('stash@{', '{');

            return (
              <Box key={s.ref} paddingLeft={1}>
                <Cursor selected={selected} />
                <Text color="gray">{' '}{ref.padEnd(6)}{'  '}</Text>
                <Text color="gray">{s.hash}  </Text>
                <Text dimColor>{s.date.padEnd(14)}  </Text>
                {s.branch && <Text color="yellow">{s.branch}  </Text>}
                <Text color={selected ? 'white' : 'gray'}>{truncatedMsg}</Text>
              </Box>
            );
          })}
        </>
      )}

      <FlashMessage flash={flash} />
    </Box>
  );
}
