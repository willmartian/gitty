import React from 'react';
import { Box, type BoxProps } from 'ink';
import { bracketStyle } from '../styles.ts';

export function Section({ children, ...props }: BoxProps) {
  return (
    <Box flexDirection="column" borderStyle={bracketStyle} borderColor="gray" {...props}>
      {children}
    </Box>
  );
}
