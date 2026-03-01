import { useState } from 'react';
import { useInputLockControls } from '../contexts/InputLock.tsx';

export function useFilter<T>(items: T[], predicate: (item: T, query: string) => boolean) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { lockInput, unlockInput } = useInputLockControls();

  const filtered = query ? items.filter(i => predicate(i, query)) : items;

  const openFilter = () => { setFilterOpen(true); lockInput(); };
  const closeFilter = () => { setFilterOpen(false); setQuery(''); unlockInput(); };
  const appendQuery = (char: string) => setQuery(q => q + char);
  const backspaceQuery = () => setQuery(q => q.slice(0, -1));

  return { filterOpen, query, filtered, openFilter, closeFilter, appendQuery, backspaceQuery };
}
