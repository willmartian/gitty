import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type Stash, getStashes, stashPush, stashPop, stashApply, stashDrop } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';

export default function StashTab({ cursor, onCursorChange }: { cursor: number; onCursorChange: (n: number) => void }) {
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

  const cur = stashes.length > 0 ? Math.min(cursor, stashes.length - 1) : 0;
  const sel = stashes[cur] ?? null;
  const maxMsgLen = Math.max(...stashes.map(s => s.message.length), 0);

  useInput((input, key) => {
    if (busy || loading) return;

    if (key.upArrow || input === 'k') { onCursorChange(Math.max(0, cursor - 1)); return; }
    if (key.downArrow || input === 'j') { onCursorChange(Math.min(Math.max(0, stashes.length - 1), cursor + 1)); return; }
    if (input === 'r') { void refresh(); return; }

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
          {stashes.length === 0 && (
            <Box paddingLeft={1}><Text dimColor>No stashes  (p to push current changes)</Text></Box>
          )}
          {stashes.map((s, i) => {
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
