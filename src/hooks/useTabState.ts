import { useState } from 'react';

export function useTabState(refresh: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);

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

  return { busy, flash, showFlash, runOp };
}
