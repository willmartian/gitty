import React from 'react';
import { Box, Text } from 'ink';

export function FlashMessage({ flash }: { flash: { msg: string; ok: boolean } | null }) {
  if (!flash) return null;
  return (
    <Box marginTop={1}>
      <Text color={flash.ok ? 'green' : 'red'}>{flash.ok ? '✔ ' : '✖ '}{flash.msg}</Text>
    </Box>
  );
}
