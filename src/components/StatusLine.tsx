import React from 'react';
import { Text } from 'ink';

export function StatusLine({ error, loading, progress }: { error: string | null; loading: boolean; progress?: string | null }) {
  if (error) return <Text color="red">✖ {error}</Text>;
  if (progress) return <Text dimColor>  {progress}</Text>;
  if (loading) return <Text dimColor>  Loading...</Text>;
  return null;
}
