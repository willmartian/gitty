import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type Branch, getBranches, checkoutBranch, deleteBranch } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';

export default function BranchTab({ cursor, onCursorChange }: { cursor: number; onCursorChange: (n: number) => void }) {
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

  const cur = branches.length > 0 ? Math.min(cursor, branches.length - 1) : 0;
  const sel = branches[cur] ?? null;
  const maxNameLen = Math.max(...branches.map(b => b.name.length), 0);

  useInput((input, key) => {
    if (busy || loading) return;

    if (key.upArrow || input === 'k') { onCursorChange(Math.max(0, cursor - 1)); return; }
    if (key.downArrow || input === 'j') { onCursorChange(Math.min(Math.max(0, branches.length - 1), cursor + 1)); return; }
    if (input === 'r') { void refresh(); return; }

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
          {branches.length === 0 && (
            <Box paddingLeft={1}><Text dimColor>No branches</Text></Box>
          )}
          {branches.map((b, i) => {
            const selected = i === cur;
            const truncatedSubject = b.subject.length > 52 ? b.subject.slice(0, 51) + '…' : b.subject;

            return (
              <Box key={b.name} paddingLeft={1}>
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
        </>
      )}

      <FlashMessage flash={flash} />
    </Box>
  );
}
