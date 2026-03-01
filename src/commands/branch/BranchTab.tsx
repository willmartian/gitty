import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type Branch, getBranches, checkoutBranch, deleteBranch } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { useFilter } from '../../hooks/useFilter.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { FilterBar } from '../../components/FilterBar.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';
import { Section } from '../../components/Section.tsx';

export default function BranchTab({ cursor, onCursorChange }: {
  cursor: number;
  onCursorChange: (n: number) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setBranches(await getBranches());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'git error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const { busy, flash, showFlash, runOp } = useTabState(refresh);
  const { filterOpen, query, filtered, openFilter, closeFilter, appendQuery, backspaceQuery } = useFilter(
    branches,
    (b, q) => b.name.toLowerCase().includes(q) || b.subject.toLowerCase().includes(q) || (b.upstream ?? '').toLowerCase().includes(q),
  );

  const cur = filtered.length > 0 ? Math.min(cursor, filtered.length - 1) : 0;
  const sel = filtered[cur] ?? null;
  const maxNameLen = Math.max(...filtered.map(b => b.name.length), 0);

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

    if (!sel) return;

    if (input === ' ' || key.return) {
      if (sel.current) { showFlash(`Already on ${sel.name}`); return; }
      runOp(() => checkoutBranch(sel.name), `Switched to ${sel.name}`);
      return;
    }

    if (input === 'd') {
      if (sel.current) { showFlash('Cannot delete the current branch', false); return; }
      runOp(() => deleteBranch(sel.name), `Deleted ${sel.name}`);
      return;
    }

    if (input === 'D') {
      if (sel.current) { showFlash('Cannot delete the current branch', false); return; }
      runOp(() => deleteBranch(sel.name, true), `Force deleted ${sel.name}`);
      return;
    }
  });

  return (
    <Box flexDirection="column">
      <StatusLine error={error} loading={loading} />

      {!error && !loading && (
        <>
          {filterOpen && <FilterBar query={query} />}
          <Section paddingLeft={1}>
            {filtered.length === 0 && (
              <Text dimColor>{query ? 'No matches' : 'No branches'}</Text>
            )}
            {filtered.map((b, i) => {
              const selected = i === cur;
              const truncatedSubject = b.subject.length > 52 ? b.subject.slice(0, 51) + '…' : b.subject;

              return (
                <Box key={b.name}>
                  <Cursor selected={selected} />
                  <Text color="#ff69b4">{b.current ? ' * ' : '   '}</Text>
                  <Text
                    color={selected ? 'white' : (b.current ? 'white' : 'gray')}
                    bold={b.current}
                  >
                    {b.name.padEnd(maxNameLen + 2)}
                  </Text>
                  <Text color="gray">{b.hash}  </Text>
                  <Text color={selected ? 'white' : 'gray'}>{truncatedSubject}</Text>
                  {b.upstream && (
                    <Box marginLeft={2} gap={1}>
                      <Text dimColor>{b.gone ? '(upstream gone)' : b.upstream}</Text>
                      {!b.gone && b.ahead > 0 && <Text color="green">↑{b.ahead}</Text>}
                      {!b.gone && b.behind > 0 && <Text color="red">↓{b.behind}</Text>}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Section>
        </>
      )}

      <FlashMessage flash={flash} />
    </Box>
  );
}
