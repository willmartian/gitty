import React from 'react';
import { Box, type BoxProps } from 'ink';
import { bracketStyle } from '../styles.ts';

type Props = BoxProps & { children?: React.ReactNode };

/** Bordered column container. Accepts all Ink `BoxProps` for padding, alignment, etc. */
export function Section({ children, ...props }: Props) {
  return (
    <Box flexDirection="column" borderStyle={bracketStyle} borderColor="gray" {...props}>
      {children}
    </Box>
  );
}
