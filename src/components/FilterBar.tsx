import React from 'react';
import { Box, Text } from 'ink';
import { Section } from './Section.tsx';
import { brandColor } from '../styles.ts';

/** Displays the active filter query with a search icon and block cursor. */
export function FilterBar({ query }: { query: string }) {
  return (
    <Section borderColor={brandColor} paddingLeft={1} paddingRight={1}>
      <Box gap={1}>
        <Text bold color={brandColor}>🔎</Text>
        <Text color="white">{query}█</Text>
      </Box>
    </Section>
  );
}
