import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { type Stash, getStashes, stashPush, stashPop, stashApply, stashDrop } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { useFilter } from '../../hooks/useFilter.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { FilterBar } from '../../components/FilterBar.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Table } from '../../components/Table.tsx';
import { Section } from '../../components/Section.tsx';
import { ActionBar, Action } from '../../components/ActionBar.tsx';

export default function StashTab() {
  const [cursor, setCursor] = useState(0);
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

  const { exit } = useApp();
  const { busy, flash, runOp } = useTabState(refresh);
  const { filterOpen, query, filtered, openFilter, closeFilter, appendQuery, backspaceQuery } = useFilter(
    stashes,
    (s, q) => s.message.toLowerCase().includes(q) || s.branch.toLowerCase().includes(q),
  );

  const cur = filtered.length > 0 ? Math.min(cursor, filtered.length - 1) : 0;
  const sel = filtered[cur] ?? null;
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
              getKey={(s) => s.ref}
              empty={query ? 'No matches' : 'No stashes  (p to push current changes)'}
              renderRow={(s, selected) => {
                const truncatedMsg = s.message.length > 52 ? s.message.slice(0, 51) + '…' : s.message;
                const ref = s.ref.replace('stash@{', '{');
                return (<>
                  <Text color="gray">{' '}{ref.padEnd(6)}{'  '}</Text>
                  <Text color="gray">{s.hash}  </Text>
                  <Text dimColor>{s.date.padEnd(14)}  </Text>
                  {s.branch && <Text color="yellow">{s.branch}  </Text>}
                  <Text color={selected ? 'white' : 'gray'}>{truncatedMsg}</Text>
                </>);
              }}
            />
            </Section>
          </>
        )}
      </Box>

      <FlashMessage flash={flash} />
      <ActionBar item={sel} busy={busy || loading || filterOpen}>
        <Action binding="space" label="pop"    onAction={(s: Stash) => runOp(() => stashPop(s.ref),   `Popped ${s.ref}`)} />
        <Action binding="a"     label="apply"  onAction={(s: Stash) => runOp(() => stashApply(s.ref), `Applied ${s.ref}`)} />
        <Action binding="d"     label="drop"   onAction={(s: Stash) => runOp(() => stashDrop(s.ref),  `Dropped ${s.ref}`)} confirm={(s: Stash) => `Drop ${s.ref}?`} />
        <Action binding="p"     label="push"   onAction={() => runOp(() => stashPush(), 'Stashed changes')} requiresItem={false} />
        <Action binding="r"     label="refresh" onAction={() => void refresh()} requiresItem={false} />
        <Action binding="f"     label="filter"  onAction={() => openFilter()} requiresItem={false} />
        <Action binding="esc"   label="quit"    onAction={() => exit()} requiresItem={false} />
      </ActionBar>
    </Box>
  );
}
