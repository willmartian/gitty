import React from 'react';
import { Text } from 'ink';

export function StatusLine({ error, loading }: { error: string | null; loading: boolean }) {
  if (error) return <Text color="red">✖ {error}</Text>;
  if (loading) return <Text dimColor>  Loading...</Text>;
  return null;
}
