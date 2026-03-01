import { useState } from 'react';

export function useTabState(refresh: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ msg: string; ok: boolean } | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  const showFlash = (msg: string, ok = true) => {
    setFlash({ msg, ok });
    setTimeout(() => setFlash(null), 2500);
  };

  const runOp = (op: () => Promise<void>, msg: string, onComplete?: () => void) => {
    if (busy) return;
    setBusy(true);
    void op()
      .then(() => refresh())
      .then(() => { showFlash(msg); onComplete?.(); })
      .catch((e: unknown) => showFlash(e instanceof Error ? e.message : String(e), false))
      .finally(() => setBusy(false));
  };

  const runNetworkOp = (op: (onProgress: (stage: string, progress: number) => void) => Promise<void>, msg: string, onComplete?: () => void) => {
    if (busy) return;
    setBusy(true);
    void op((stage, progress) => setProgressMsg(`${stage} ${progress}%`))
      .then(() => refresh())
      .then(() => { showFlash(msg); onComplete?.(); })
      .catch((e: unknown) => showFlash(e instanceof Error ? e.message : String(e), false))
      .finally(() => { setBusy(false); setProgressMsg(null); });
  };

  return { busy, flash, showFlash, runOp, runNetworkOp, progressMsg };
}
