import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const InputLockContext = createContext({
  lockInput: () => {},
  unlockInput: () => {},
  locked: false,
});

export function InputLockProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const lockInput = useCallback(() => setCount(n => n + 1), []);
  const unlockInput = useCallback(() => setCount(n => Math.max(0, n - 1)), []);
  return (
    <InputLockContext.Provider value={{ lockInput, unlockInput, locked: count > 0 }}>
      {children}
    </InputLockContext.Provider>
  );
}

export function useInputLocked() {
  return useContext(InputLockContext).locked;
}

export function useInputLock() {
  const { lockInput, unlockInput } = useContext(InputLockContext);
  useEffect(() => {
    lockInput();
    return unlockInput;
  }, []);
}

export function useInputLockControls() {
  const { lockInput, unlockInput } = useContext(InputLockContext);
  return { lockInput, unlockInput };
}
