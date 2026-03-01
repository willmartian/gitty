import React from 'react';
import { Box, Text } from 'ink';
import { Section } from './components/Section.tsx';
import { brandColor } from './styles.ts';
import { getLog } from './activityLog.ts';

export default function Postscript() {
  const log = getLog();
  if (log.length === 0) return null;

  return (
    <Section paddingLeft={1} paddingRight={1} alignSelf="flex-start">
      <Text bold color={brandColor}>gitty 🐈</Text>
      {log.map((entry, i) => (
        <Box key={i} gap={2}>
          <Text dimColor>{entry.action}</Text>
          <Text>{entry.detail}</Text>
        </Box>
      ))}
    </Section>
  );
}
