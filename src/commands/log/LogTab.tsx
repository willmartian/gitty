import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { hasCommitlintConfig, parseConventional } from '../../commitlint.ts';
import { type Commit, getCommits, getLastCommitMessage, extractCommitBody, commit } from '../../git.ts';
import { StatusLine } from '../../components/StatusLine.tsx';
import { FilterBar } from '../../components/FilterBar.tsx';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { useFilter } from '../../hooks/useFilter.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { useLog } from '../../hooks/useLog.ts';
import { Table } from '../../components/Table.tsx';
import { Section } from '../../components/Section.tsx';
import { ActionBar, Action } from '../../components/ActionBar.tsx';
import CommitSheet, { type CommitValues } from '../stage/CommitSheet.tsx';

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

export default function LogTab() {
  const [cursor, setCursor] = useState(0);
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

  const { exit } = useApp();
  const { busy, flash, runOp } = useTabState(refresh);
  const log = useLog();
  const { filterOpen, query, filtered, openFilter, closeFilter, appendQuery, backspaceQuery } = useFilter(commits, matchesQuery);

  const [amendValues, setAmendValues] = useState<CommitValues | null>(null);
  const [amendMeta, setAmendMeta] = useState<{ hash: string; header: string } | null>(null);
  const openAmend = async () => {
    const raw = await getLastCommitMessage();
    const header = raw.split('\n')[0] ?? '';
    const parsed = await parseConventional(header);
    setAmendValues({
      type: parsed.type ?? '',
      scope: parsed.scope ?? '',
      description: parsed.description ?? header,
      body: extractCommitBody(raw),
      breaking: parsed.breaking,
    });
    setAmendMeta({ hash: commits[0]?.hash ?? '', header });
  };
  const closeAmend = () => { setAmendValues(null); setAmendMeta(null); };

  const cur = filtered.length > 0 ? Math.min(cursor, filtered.length - 1) : 0;

  const dateWidth = Math.max(...commits.map(c => c.date.length), 0);
  const authorWidth = Math.min(Math.max(...commits.map(c => c.author.length), 0), MAX_AUTHOR);
  const typeWidth = conventional ? Math.max(...commits.map(c => (c.type ?? '').length), 4) : 0;
  const scopeWidth = conventional ? Math.max(...commits.map(c => (c.scope ?? '').length), 5) : 0;

  useInput((input, key) => {
    if (loading || busy || amendValues) return;

    if (filterOpen) {
      if (key.escape) { closeFilter(); setCursor(0); return; }
      if (key.backspace || key.delete) { backspaceQuery(); setCursor(0); return; }
      if (key.upArrow) { setCursor(Math.max(0, cursor - 1)); return; }
      if (key.downArrow) { setCursor(Math.min(Math.max(0, filtered.length - 1), cursor + 1)); return; }
      if (input && !key.ctrl && !key.meta && input.length === 1) { appendQuery(input); setCursor(0); return; }
      return;
    }

    if (key.upArrow || input === 'k') { setCursor(Math.max(0, cursor - 1)); return; }
    if (key.downArrow || input === 'j') { setCursor(Math.min(Math.max(0, filtered.length - 1), cursor + 1)); return; }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      {amendValues && (
        <CommitSheet
          amend
          initialValues={amendValues}
          onClose={closeAmend}
          onCommit={(msg) => {
            const { hash, header } = amendMeta!;
            const after = msg.split('\n')[0]!;
            log({ action: 'amended', detail: `${hash}\nbefore: ${header}\nafter: ${after}` });
            runOp(() => commit(msg, true), 'Amended!', closeAmend);
          }}
        />
      )}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <StatusLine error={error} loading={loading} />

        {!error && !loading && (
          <>
            {filterOpen && <FilterBar query={query} />}
            <Section paddingLeft={1}>
            <Table
              rows={filtered}
              cursor={cur}
              gap={2}
              getKey={(c) => c.hash}
              empty={query ? 'No matches' : 'No commits'}
              header={<>
                <Text bold>{'hash'.padEnd(7)}</Text>
                <Text bold>{'date'.padEnd(dateWidth)}</Text>
                <Text bold>{'author'.padEnd(authorWidth)}</Text>
                {conventional && <Text bold>{'type'.padEnd(typeWidth + 5)}</Text>}
                {conventional && <Text bold>{'scope'.padEnd(scopeWidth)}</Text>}
                <Text bold>{conventional ? 'description' : 'subject'}</Text>
              </>}
              renderRow={(c, selected) => {
                const author = c.author.length > MAX_AUTHOR ? c.author.slice(0, MAX_AUTHOR - 1) + '…' : c.author;
                const subject = conventional ? (c.description ?? c.subject) : c.subject;
                return (<>
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
                </>);
              }}
            />
            </Section>
          </>
        )}
      </Box>
      <FlashMessage flash={flash} />
      <ActionBar item={cur === 0 && commits.length > 0 && !amendValues ? (filtered[cur] ?? null) : null} busy={loading || busy || !!amendValues || filterOpen}>
        <Action binding="A"   label="amend HEAD" onAction={() => void openAmend()} />
        <Action binding="r"   label="refresh"    onAction={() => void refresh()} requiresItem={false} />
        <Action binding="f"   label="filter"     onAction={() => openFilter()} requiresItem={false} />
        <Action binding="esc" label="quit"        onAction={() => exit()} requiresItem={false} />
      </ActionBar>
    </Box>
  );
}
