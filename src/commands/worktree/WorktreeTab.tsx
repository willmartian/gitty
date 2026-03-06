import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import { type Worktree, getWorktrees, removeWorktree, pruneWorktrees, lockWorktree, unlockWorktree } from '../../git.ts';
import { useTabState } from '../../hooks/useTabState.ts';
import { useFilter } from '../../hooks/useFilter.ts';
import { FlashMessage } from '../../components/FlashMessage.tsx';
import { FilterBar } from '../../components/FilterBar.tsx';
import { StatusLine } from '../../components/StatusLine.tsx';
import { Table } from '../../components/Table.tsx';
import { Section } from '../../components/Section.tsx';
import { ActionBar, Action } from '../../components/ActionBar.tsx';
import { useInput } from 'ink';

export default function WorktreeTab() {
  const [cursor, setCursor] = useState(0);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setWorktrees(await getWorktrees());
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
    worktrees,
    (w, q) => w.path.toLowerCase().includes(q) || w.branch.toLowerCase().includes(q),
  );

  const cur = filtered.length > 0 ? Math.min(cursor, filtered.length - 1) : 0;
  const sel = filtered[cur] ?? null;
  const maxPathLen = Math.max(...filtered.map(w => w.path.split('/').pop()!.length), 0);

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
                getKey={(w) => w.path}
                empty={query ? 'No matches' : 'No worktrees'}
                renderRow={(w, selected) => {
                  const name = w.path.split('/').pop() ?? w.path;
                  const dir = w.path.split('/').slice(0, -1).join('/');
                  return (<>
                    <Text color="#ff69b4">{w.main ? ' * ' : '   '}</Text>
                    <Text color={selected ? 'white' : (w.main ? 'white' : 'gray')} bold={w.main}>
                      {name.padEnd(maxPathLen + 2)}
                    </Text>
                    <Text color="gray">{w.head}  </Text>
                    {w.detached
                      ? <Text color="yellow">detached  </Text>
                      : <Text color={selected ? 'white' : 'gray'}>{w.branch}  </Text>
                    }
                    {w.locked && <Text color="red">[locked{w.lockReason ? `: ${w.lockReason}` : ''}]  </Text>}
                    <Text dimColor>{dir}</Text>
                  </>);
                }}
              />
            </Section>
          </>
        )}
      </Box>

      <FlashMessage flash={flash} />
      <ActionBar item={sel} busy={busy || loading || filterOpen}>
        <Action binding="d"   label="remove"       onAction={(w: Worktree) => runOp(() => removeWorktree(w.path), `Removed ${w.path}`)}             disabled={(w: Worktree) => w.main ? 'Cannot remove main worktree' : w.locked ? 'Worktree is locked' : null} confirm={(w: Worktree) => `Remove worktree ${w.path}?`} />
        <Action binding="D"   label="force remove" onAction={(w: Worktree) => runOp(() => removeWorktree(w.path, true), `Force removed ${w.path}`)}  disabled={(w: Worktree) => w.main ? 'Cannot remove main worktree' : null} confirm={(w: Worktree) => `Force remove worktree ${w.path}?`} />
        <Action binding="l"   label="lock"         onAction={(w: Worktree) => runOp(() => lockWorktree(w.path), `Locked ${w.path}`)}                  disabled={(w: Worktree) => w.main ? 'Cannot lock main worktree' : w.locked ? 'Already locked' : null} />
        <Action binding="u"   label="unlock"       onAction={(w: Worktree) => runOp(() => unlockWorktree(w.path), `Unlocked ${w.path}`)}              disabled={(w: Worktree) => !w.locked ? 'Not locked' : null} />
        <Action binding="p"   label="prune"        onAction={() => runOp(() => pruneWorktrees(), 'Pruned stale worktrees')} requiresItem={false} />
        <Action binding="r"   label="refresh"      onAction={() => void refresh()} requiresItem={false} />
        <Action binding="f"   label="filter"       onAction={() => openFilter()} requiresItem={false} />
        <Action binding="esc" label="quit"         onAction={() => exit()} requiresItem={false} />
      </ActionBar>
    </Box>
  );
}
