import React from 'react';
import { Box, Text } from 'ink';

type HintPair = [binding: string, label: string];

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

export function HintBar({ hints }: { hints: HintPair[] }) {
  return (
    <Box gap={2}>
      {hints.map(([binding, label], i) => (
        <Hint key={i} binding={binding} label={label} />
      ))}
    </Box>
  );
}
