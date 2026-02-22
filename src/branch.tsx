import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { type Branch, getBranches, checkoutBranch, deleteBranch } from './git.ts';

export default function BranchTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

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

  const cur = branches.length > 0 ? Math.min(cursor, branches.length - 1) : 0;
  const sel = branches[cur] ?? null;
  const maxNameLen = Math.max(...branches.map(b => b.name.length), 0);

  const showFlash = (msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 2500);
  };

  const runOp = (op: () => Promise<void>, msg: string) => {
    if (busy) return;
    setBusy(true);
    void op()
      .then(() => refresh())
      .then(() => showFlash(msg))
      .catch((e: unknown) => showFlash(e instanceof Error ? e.message : String(e), false))
      .finally(() => setBusy(false));
  };

  useInput((input, key) => {
    if (busy || loading) return;

    if (key.upArrow || input === 'k') { setCursor(c => Math.max(0, c - 1)); return; }
    if (key.downArrow || input === 'j') { setCursor(c => Math.min(Math.max(0, branches.length - 1), c + 1)); return; }
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
      {error && <Text color="red">✖ {error}</Text>}
      {!error && loading && <Text dimColor>  Loading...</Text>}

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
                <Text color="cyan">{selected ? '▶' : ' '}</Text>
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

      {flash && (
        <Box marginTop={1}>
          <Text color={flash.ok ? 'green' : 'red'}>{flash.ok ? '✔ ' : '✖ '}{flash.msg}</Text>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingLeft={1} paddingRight={1}>
        <Text dimColor>enter checkout  d delete  D force delete  j/k ↑↓  r refresh  tab switch</Text>
      </Box>
    </Box>
  );
}
