import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Section } from '../components/Section.tsx';

interface Pending {
  message: string;
  onConfirm: () => void;
}

export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);

  useInput((input) => {
    if (!pending) return;
    if (input === 'y' || input === 'Y') {
      const { onConfirm } = pending;
      setPending(null);
      onConfirm();
    } else {
      setPending(null);
    }
  });

  const confirm = (message: string, onConfirm: () => void) => setPending({ message, onConfirm });

  const confirmEl = pending ? (
    <Section borderColor="yellow" paddingLeft={1} paddingRight={1}>
      <Box gap={1}>
        <Text color="yellow">{pending.message}</Text>
        <Text bold color="white">y</Text><Text dimColor>/N</Text>
      </Box>
    </Section>
  ) : null;

  return { confirming: pending !== null, confirm, confirmEl };
}
