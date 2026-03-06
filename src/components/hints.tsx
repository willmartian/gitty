import React from 'react';
import { Box, Text } from 'ink';

type HintPair = [binding: string, label: string];

/**
 * Single hint pill. When the binding is a single character that matches the
 * first letter of the label, the key is shown inline at the start of the word
 * rather than as a separate prefix.
 */
function Hint({ binding, label }: { binding: string; label: string }) {
  // Single-char binding that matches the first letter of the label (case-insensitive):
  // drop the key, color just the first letter of the word, using the binding's casing.
  if (binding.length === 1 && label[0]?.toLowerCase() === binding.toLowerCase()) {
    return (
      <Box>
        <Text color="cyan">{binding}</Text>
        <Text dimColor>{label.slice(1)}</Text>
      </Box>
    );
  }
  // Otherwise: color the binding, dim the label.
  return (
    <Box>
      <Text color="cyan">{binding}</Text>
      <Text dimColor>{' '}{label}</Text>
    </Box>
  );
}

/** Horizontal row of `Hint` pills, spaced with `gap={2}`. */
export function HintBar({ hints }: { hints: HintPair[] }) {
  return (
    <Box gap={2}>
      {hints.map(([binding, label], i) => (
        <Hint key={i} binding={binding} label={label} />
      ))}
    </Box>
  );
}
