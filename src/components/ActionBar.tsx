import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Section } from './Section.tsx';
import { useInputLockControls } from '../contexts/InputLock.tsx';

/**
 * Configuration for a single action within an `ActionBar`.
 * @template T The selected item type.
 */
export interface ActionProps<T> {
  /** The key character that triggers this action. */
  binding: string;
  /** Short human-readable label shown in the hint bar. */
  label: string;
  /** Called when the action fires. Receives the selected item (or `null` if `requiresItem` is false). */
  onAction: (item: T) => void;
  /** Return a non-null string to block the action and show an error instead. */
  disabled?: (item: T) => string | null;
  /** If provided, the user is prompted to confirm before `onAction` is called. */
  confirm?: (item: T) => string;
  /** Whether a selected item is required. Defaults to `true`. */
  requiresItem?: boolean;
}

/**
 * Declarative action definition. Renders nothing — `ActionBar` reads its props
 * to build the keymap and hint bar.
 */
export function Action<T>(_props: ActionProps<T>): null {
  return null;
}

function Hint({ binding, label }: { binding: string; label: string }) {
  if (binding.length === 1 && label[0]?.toLowerCase() === binding.toLowerCase()) {
    return <Box><Text color="cyan">{binding}</Text><Text dimColor>{label.slice(1)}</Text></Box>;
  }
  return <Box><Text color="cyan">{binding}</Text><Text dimColor>{' '}{label}</Text></Box>;
}

/**
 * Declarative action handler and hint bar. Reads `Action` children to build a
 * keymap, wires up `useInput`, manages confirm flow (with `InputLock`), and
 * renders a hint bar when idle or an inline error/confirm prompt when needed.
 *
 * Special binding strings: `"esc"` → Escape key, `"↵"` → Return key,
 * `"space"` → Space bar.
 *
 * @example
 * ```tsx
 * <ActionBar item={sel} busy={busy || loading}>
 *   <Action binding="space" label="checkout" onAction={(b) => runOp(...)} disabled={(b) => b.current ? 'Already on branch' : null} />
 *   <Action binding="D" label="force delete" confirm={(b) => `Delete ${b.name}?`} onAction={(b) => runOp(...)} />
 *   <Action binding="esc" label="quit" requiresItem={false} onAction={() => exit()} />
 * </ActionBar>
 * ```
 */
export function ActionBar<T>({ item, busy = false, children }: {
  item: T | null;
  busy?: boolean;
  children?: React.ReactNode;
}) {
  const [pending, setPending] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const { lockInput, unlockInput } = useInputLockControls();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actions = (React.Children.toArray(children) as React.ReactElement<any>[])
    .filter(c => React.isValidElement(c) && c.type === Action)
    .map(c => c.props as ActionProps<T>);

  useInput((input, key) => {
    if (busy) return;

    if (pending) {
      if (input === 'y' || input === 'Y') { pending.onConfirm(); setPending(null); unlockInput(); }
      else { setPending(null); unlockInput(); }
      return;
    }

    setErrMsg(null);

    for (const action of actions) {
      const matched = action.binding === 'esc' ? key.escape
        : action.binding === '↵' ? key.return
        : action.binding === 'space' ? input === ' '
        : input === action.binding;
      if (!matched) continue;

      const requiresItem = action.requiresItem !== false;
      if (requiresItem && !item) return;

      const target = requiresItem ? item as T : (null as unknown as T);

      if (action.disabled) {
        const err = action.disabled(target);
        if (err) { setErrMsg(err); return; }
      }

      if (action.confirm) {
        lockInput();
        setPending({ msg: action.confirm(target), onConfirm: () => action.onAction(target) });
      } else {
        action.onAction(target);
      }
      return;
    }
  });

  if (pending) {
    return (
      <Section paddingLeft={1} paddingRight={1} borderColor="yellow">
        <Box gap={1}>
          <Text color="yellow">{pending.msg}</Text>
          <Text bold color="white">y</Text>
          <Text dimColor>/N</Text>
        </Box>
      </Section>
    );
  }

  if (errMsg) {
    return <Section paddingLeft={1}><Text color="red">✖ {errMsg}</Text></Section>;
  }

  return (
    <Section paddingLeft={1} paddingRight={1}>
      <Box gap={2}>
        {actions.map(a => <Hint key={a.binding} binding={a.binding} label={a.label} />)}
      </Box>
    </Section>
  );
}
