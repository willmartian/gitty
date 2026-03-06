import React from 'react';
import { Text } from 'ink';
import { Section } from './Section.tsx';

/** Displays a temporary success/error message in a `Section`. Returns `null` when `flash` is null. */
export function FlashMessage({ flash }: { flash: { msg: string; ok: boolean } | null }) {
  if (!flash) return null;
  return (
    <Section paddingLeft={1}>
      <Text color={flash.ok ? 'green' : 'red'}>{flash.ok ? '✔ ' : '✖ '}{flash.msg}</Text>
    </Section>
  );
}
