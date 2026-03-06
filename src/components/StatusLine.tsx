import React from 'react';
import { Text } from 'ink';
import { Section } from './Section.tsx';

/**
 * Renders the current async state of a tab.
 * Shows `error` and `loading` inside a `Section` to prevent layout shift.
 * Shows `progress` inline (alongside existing content during network ops).
 * Returns `null` when idle.
 */
export function StatusLine({ error, loading, progress }: { error: string | null; loading: boolean; progress?: string | null }) {
  if (error) return <Section paddingLeft={1}><Text color="red">✖ {error}</Text></Section>;
  if (progress) return <Text dimColor>  {progress}</Text>;
  if (loading) return <Section paddingLeft={1}><Text dimColor>Loading...</Text></Section>;
  return null;
}
