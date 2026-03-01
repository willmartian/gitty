import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type Commit, getCommits } from '../../git.ts';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';

const MAX_AUTHOR = 20;

export default function LogTab({ cursor, onCursorChange }: { cursor: number; onCursorChange: (n: number) => void }) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCommits(await getCommits());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'git error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const cur = commits.length > 0 ? Math.min(cursor, commits.length - 1) : 0;

  const dateWidth = Math.max(...commits.map(c => c.date.length), 0);
  const authorWidth = Math.min(Math.max(...commits.map(c => c.author.length), 0), MAX_AUTHOR);

  useInput((input, key) => {
    if (loading) return;
    if (key.upArrow || input === 'k') { onCursorChange(Math.max(0, cursor - 1)); return; }
    if (key.downArrow || input === 'j') { onCursorChange(Math.min(Math.max(0, commits.length - 1), cursor + 1)); return; }
    if (input === 'r') { void refresh(); return; }
  });

  return (
    <Box flexDirection="column">
      <StatusLine error={error} loading={loading} />

      {!error && !loading && (
        <>
          <Box paddingLeft={1} gap={2}>
            <Text> </Text>
            <Text bold>{'hash'.padEnd(7)}</Text>
            <Text bold>{'date'.padEnd(dateWidth)}</Text>
            <Text bold>{'author'.padEnd(authorWidth)}</Text>
            <Text bold>subject</Text>
          </Box>

          {commits.length === 0 && (
            <Box paddingLeft={1}><Text dimColor>No commits</Text></Box>
          )}
          {commits.map((c, i) => {
            const selected = i === cur;
            const author = c.author.length > MAX_AUTHOR ? c.author.slice(0, MAX_AUTHOR - 1) + '…' : c.author;
            return (
              <Box key={c.hash} paddingLeft={1} gap={2}>
                <Cursor selected={selected} />
                <Text color="yellow">{c.hash}</Text>
                <Text dimColor>{c.date.padEnd(dateWidth)}</Text>
                <Text dimColor>{author.padEnd(authorWidth)}</Text>
                <Text color={selected ? 'white' : 'gray'}>{c.subject}</Text>
              </Box>
            );
          })}
        </>
      )}
    </Box>
  );
}
