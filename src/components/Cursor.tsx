import React from 'react';
import { Text } from 'ink';

export function Cursor({ selected }: { selected: boolean }) {
  return <Text color="cyan">{selected ? '▶' : ' '}</Text>;
}
