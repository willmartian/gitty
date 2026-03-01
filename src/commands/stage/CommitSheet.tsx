import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Section } from '../../components/Section.tsx';
import { brandColor } from '../../styles.ts';
import { useInputLock } from '../../contexts/InputLock.tsx';

type TextField = 'type' | 'scope' | 'description' | 'body';
type AnyField = TextField | 'breaking';

const ALL_FIELDS: AnyField[] = ['type', 'scope', 'description', 'body', 'breaking'];

const LABELS: Record<AnyField, string> = {
  type:        'type    ',
  scope:       'scope   ',
  breaking:    'breaking',
  description: 'desc    ',
  body:        'body    ',
};

const PLACEHOLDERS: Partial<Record<TextField, string>> = {
  type:        'feat, fix, chore…',
  scope:       'optional',
  description: 'short description',
  body:        'optional',
};

function buildMessage(values: Record<TextField, string>, breaking: boolean): string {
  const { type, scope, description, body } = values;
  let header: string;
  if (type) {
    header = type;
    if (scope) header += `(${scope})`;
    if (breaking) header += '!';
    header += `: ${description}`;
  } else {
    header = description;
  }
  return body ? `${header}\n\n${body}` : header;
}

function InputDisplay({ value, placeholder, focused }: { value: string; placeholder?: string; focused: boolean }) {
  if (focused) return <Text color="white">{value}█</Text>;
  if (value) return <Text>{value}</Text>;
  return <Text dimColor>{placeholder ?? ''}</Text>;
}

export default function CommitSheet({ onClose, onCommit, brand = false }: {
  onClose: () => void;
  onCommit: (message: string) => void;
  brand?: boolean;
}) {
  useInputLock();
  const [fieldIdx, setFieldIdx] = useState(0);
  const [values, setValues] = useState<Record<TextField, string>>({ type: '', scope: '', description: '', body: '' });
  const [breaking, setBreaking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const field = ALL_FIELDS[fieldIdx]!;
  const canCommit = values.description.length > 0;
  const message = buildMessage(values, breaking);

  useInput((input, key) => {
    if (confirming) {
      if (input === 'y' || input === 'Y') { onCommit(message); onClose(); }
      else { setConfirming(false); }
      return;
    }

    if (key.escape) { onClose(); return; }

    if (key.downArrow) { setFieldIdx(i => Math.min(ALL_FIELDS.length - 1, i + 1)); return; }
    if (key.upArrow)   { setFieldIdx(i => Math.max(0, i - 1)); return; }

    if (key.return) {
      if (canCommit) setConfirming(true);
      return;
    }

    if (field === 'breaking') {
      if (input === ' ') { setBreaking(b => !b); }
      return;
    }

    if (key.backspace || key.delete) {
      setValues(v => ({ ...v, [field]: v[field].slice(0, -1) }));
      return;
    }
    if (input && !key.ctrl && !key.meta && input.length === 1) {
      setValues(v => ({ ...v, [field]: v[field] + input }));
    }
  });

  return (
    <Section borderColor={brandColor} paddingLeft={1} paddingRight={1}>
      <Box gap={1}>
        {brand && <><Text bold color={brandColor}>gitty 🐈</Text><Text dimColor>·</Text></>}
        <Text bold color={brandColor}>COMMIT</Text>
      </Box>

      {confirming ? (
        <Box flexDirection="column" marginTop={1} gap={1}>
          {message.split('\n').map((line, i) => (
            <Text key={i} color={i === 0 ? 'white' : 'gray'}>{line || ' '}</Text>
          ))}
          <Box gap={1} marginTop={1}>
            <Text dimColor>commit?</Text>
            <Text bold color="white">y</Text><Text dimColor>/N</Text>
          </Box>
        </Box>
      ) : (
        ALL_FIELDS.map((f, i) => {
          const focused = i === fieldIdx;

          if (f === 'description') {
            return (
              <Box key={f} flexDirection="column" marginTop={1}>
                <Box gap={1}>
                  <Text color={focused ? brandColor : 'gray'}>{focused ? '▶' : ' '}</Text>
                  <Text color={focused ? 'white' : 'gray'}>{LABELS[f]}</Text>
                  <InputDisplay value={values[f]} placeholder={PLACEHOLDERS[f]} focused={focused} />
                </Box>
              </Box>
            );
          }

          return (
            <Box key={f} gap={1}>
              <Text color={focused ? brandColor : 'gray'}>{focused ? '▶' : ' '}</Text>
              <Text color={focused ? 'white' : 'gray'}>{LABELS[f]}</Text>
              {f === 'breaking'
                ? <Text color={breaking ? 'red' : (focused ? 'white' : 'gray')}>{breaking ? '[x]' : '[ ]'}</Text>
                : <InputDisplay value={values[f]} placeholder={PLACEHOLDERS[f]} focused={focused} />
              }
            </Box>
          );
        })
      )}
    </Section>
  );
}
