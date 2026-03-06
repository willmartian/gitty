import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { type Branch, getBranches, checkoutBranch, deleteBranch } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { useFilter } from '../../hooks/useFilter.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { FilterBar } from '../../components/FilterBar.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Table } from '../../components/Table.tsx';
import { Section } from '../../components/Section.tsx';
import { ActionBar, Action } from '../../components/ActionBar.tsx';

export default function BranchTab() {
  const [cursor, setCursor] = useState(0);
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

  const { exit } = useApp();
  const { busy, flash, runOp } = useTabState(refresh);
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
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        <StatusLine error={error} loading={loading} />

        {!error && !loading && (
          <>
            {filterOpen && <FilterBar query={query} />}
            <Section paddingLeft={1}>
            <Table
              rows={filtered}
              cursor={cur}
              getKey={(b) => b.name}
              empty={query ? 'No matches' : 'No branches'}
              renderRow={(b, selected) => {
                const truncatedSubject = b.subject.length > 52 ? b.subject.slice(0, 51) + '…' : b.subject;
                return (<>
                  <Text color="#ff69b4">{b.current ? ' * ' : '   '}</Text>
                  <Text color={selected ? 'white' : (b.current ? 'white' : 'gray')} bold={b.current}>
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
                </>);
              }}
            />
            </Section>
          </>
        )}
      </Box>

      <FlashMessage flash={flash} />
      <ActionBar item={sel} busy={busy || loading || filterOpen}>
        <Action binding="space" label="checkout"     onAction={(b: Branch) => runOp(() => checkoutBranch(b.name), `Switched to ${b.name}`)}   disabled={(b: Branch) => b.current ? `Already on ${b.name}` : null} />
        <Action binding="d"     label="delete"        onAction={(b: Branch) => runOp(() => deleteBranch(b.name), `Deleted ${b.name}`)}          disabled={(b: Branch) => b.current ? 'Cannot delete current branch' : null} />
        <Action binding="D"     label="force delete"  onAction={(b: Branch) => runOp(() => deleteBranch(b.name, true), `Force deleted ${b.name}`)} disabled={(b: Branch) => b.current ? 'Cannot delete current branch' : null} confirm={(b: Branch) => `Force delete ${b.name}?`} />
        <Action binding="r"     label="refresh"      onAction={() => void refresh()} requiresItem={false} />
        <Action binding="f"     label="filter"       onAction={() => openFilter()} requiresItem={false} />
        <Action binding="esc"   label="quit"         onAction={() => exit()} requiresItem={false} />
      </ActionBar>
    </Box>
  );
}
