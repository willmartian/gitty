import React, { useEffect, useState } from 'react';
import { useApp } from 'ink';
import CommitSheet, { type CommitValues } from '../stage/CommitSheet.tsx';
import { commit, getLastCommitMessage, getLastCommitHash, extractCommitBody } from '../../git.ts';
import { parseConventional } from '../../commitlint.ts';
import { useLog } from '../../hooks/useLog.ts';
import { useClear } from '../../tui.ts';

export default function CommitApp({ amend = false }: { amend?: boolean }) {
  const { exit } = useApp();
  const clear = useClear();
  const log = useLog();
  const [initialValues, setInitialValues] = useState<CommitValues | undefined>();
  const [originalMeta, setOriginalMeta] = useState<{ hash: string; header: string } | null>(null);
  const [ready, setReady] = useState(!amend);

  useEffect(() => {
    if (!amend) return;
    void (async () => {
      const [raw, hash] = await Promise.all([getLastCommitMessage(), getLastCommitHash()]);
      const header = raw.split('\n')[0] ?? '';
      const parsed = await parseConventional(header);
      setInitialValues({
        type: parsed.type ?? '',
        scope: parsed.scope ?? '',
        description: parsed.description ?? header,
        body: extractCommitBody(raw),
        breaking: parsed.breaking,
      });
      setOriginalMeta({ hash, header });
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <CommitSheet
      brand
      amend={amend}
      initialValues={initialValues}
      onClose={exit}
      onCommit={(msg) => {
        if (amend && originalMeta) {
          const after = msg.split('\n')[0]!;
          log({ action: 'amended', detail: `${originalMeta.hash}\nbefore: ${originalMeta.header}\nafter: ${after}` });
        } else {
          log({ action: 'committed', detail: msg.split('\n')[0]! });
        }
        void commit(msg, amend).then(() => { clear(); exit(); });
      }}
    />
  );
}
