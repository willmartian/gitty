import React from 'react';
import { Text } from 'ink';

/** Renders a chevron when `selected`, otherwise a blank space of equal width. */
export function Cursor({ selected }: { selected: boolean }) {
  return <Text color="cyan">{selected ? '▶' : ' '}</Text>;
}
