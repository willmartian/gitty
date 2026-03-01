import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { hasCommitlintConfig, parseConventional } from '../../commitlint.ts';
import { type Commit, getCommits } from '../../git.ts';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Cursor } from '../../components/Cursor.tsx';
import { FilterBar } from '../../components/FilterBar.tsx';
import { useFilter } from '../../hooks/useFilter.ts';
import { Section } from '../../components/Section.tsx';

const MAX_AUTHOR = 20;

const TYPE_EMOJI: Record<string, string> = {
  feat:     '✨',
  fix:      '🐛',
  chore:    '🔧',
  docs:     '📝',
  style:    '💅',
  refactor: '🔄',
  test:     '🧪',
  perf:     '⚡',
  ci:       '🚀',
  build:    '📦',
  revert:   '↩️',
};

interface ParsedCommit extends Commit {
  type: string | null;
  scope: string | null;
  description: string | null;
  breaking: boolean;
}

async function parseCommits(commits: Commit[]): Promise<ParsedCommit[]> {
  return Promise.all(commits.map(async c => {
    const p = await parseConventional(c.subject);
    return { ...c, ...p };
  }));
}

function matchesQuery(c: ParsedCommit, q: string): boolean {
  const lq = q.toLowerCase();
  return c.hash.includes(lq)
    || c.author.toLowerCase().includes(lq)
    || c.subject.toLowerCase().includes(lq)
    || (c.type ?? '').toLowerCase().includes(lq)
    || (c.scope ?? '').toLowerCase().includes(lq)
    || (c.description ?? '').toLowerCase().includes(lq);
}

export default function LogTab({ cursor, onCursorChange }: {
  cursor: number;
  onCursorChange: (n: number) => void;
}) {
  const [commits, setCommits] = useState<ParsedCommit[]>([]);
  const [conventional, setConventional] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [parsed, hasConfig] = await Promise.all([
        parseCommits(await getCommits()),
        hasCommitlintConfig(),
      ]);
      setCommits(parsed);
      setConventional(hasConfig);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'git error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const { filterOpen, query, filtered, openFilter, closeFilter, appendQuery, backspaceQuery } = useFilter(commits, matchesQuery);

  const cur = filtered.length > 0 ? Math.min(cursor, filtered.length - 1) : 0;

  const dateWidth = Math.max(...commits.map(c => c.date.length), 0);
  const authorWidth = Math.min(Math.max(...commits.map(c => c.author.length), 0), MAX_AUTHOR);
  const typeWidth = conventional ? Math.max(...commits.map(c => (c.type ?? '').length), 4) : 0;
  const scopeWidth = conventional ? Math.max(...commits.map(c => (c.scope ?? '').length), 5) : 0;

  useInput((input, key) => {
    if (loading) return;

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
  });

  return (
    <Box flexDirection="column">
      <StatusLine error={error} loading={loading} />

      {!error && !loading && (
        <>
          {filterOpen && <FilterBar query={query} />}
          <Section paddingLeft={1}>
            <Box gap={2}>
              <Text> </Text>
              <Text bold>{'hash'.padEnd(7)}</Text>
              <Text bold>{'date'.padEnd(dateWidth)}</Text>
              <Text bold>{'author'.padEnd(authorWidth)}</Text>
              {conventional && <Text bold>{'type'.padEnd(typeWidth + 5)}</Text>}
              {conventional && <Text bold>{'scope'.padEnd(scopeWidth)}</Text>}
              <Text bold>{conventional ? 'description' : 'subject'}</Text>
            </Box>

            {filtered.length === 0 && (
              <Text dimColor>{query ? 'No matches' : 'No commits'}</Text>
            )}
            {filtered.map((c, i) => {
              const selected = i === cur;
              const author = c.author.length > MAX_AUTHOR ? c.author.slice(0, MAX_AUTHOR - 1) + '…' : c.author;
              const subject = conventional ? (c.description ?? c.subject) : c.subject;
              return (
                <Box key={c.hash} gap={2}>
                  <Cursor selected={selected} />
                  <Text color="yellow">{c.hash}</Text>
                  <Text dimColor>{c.date.padEnd(dateWidth)}</Text>
                  <Text dimColor>{author.padEnd(authorWidth)}</Text>
                  {conventional && (
                    <Text>
                      <Text color="cyan">{(c.type ?? '').padEnd(typeWidth)}</Text>
                      <Text>{c.type ? ` ${TYPE_EMOJI[c.type] ?? '  '}` : '   '}</Text>
                      <Text>{c.breaking ? '❗' : '  '}</Text>
                    </Text>
                  )}
                  {conventional && <Text dimColor>{(c.scope ?? '').padEnd(scopeWidth)}</Text>}
                  <Text color={selected ? 'white' : 'gray'}>{subject}</Text>
                </Box>
              );
            })}
          </Section>
        </>
      )}
    </Box>
  );
}
