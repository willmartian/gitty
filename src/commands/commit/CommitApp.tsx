import React from 'react';
import { useApp } from 'ink';
import CommitSheet from '../stage/CommitSheet.tsx';
import { commit } from '../../git.ts';
import { useLog } from '../../hooks/useLog.ts';

export default function CommitApp() {
  const { exit } = useApp();
  const log = useLog();

  return (
    <CommitSheet
      brand
      onClose={exit}
      onCommit={(msg) => {
        log({ action: 'committed', detail: msg.split('\n')[0]! });
        void commit(msg).then(exit);
      }}
    />
  );
}
