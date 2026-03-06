import React from 'react';
import { Box, Text } from 'ink';
import { Cursor } from './Cursor.tsx';

/**
 * Props for `Table`.
 * @template T The row data type.
 */
interface TableProps<T> {
  /** The full list of rows to display. */
  rows: T[];
  /** Index of the currently selected row. Pass `-1` for no selection. */
  cursor: number;
  /** Returns a stable unique key for each row. */
  getKey: (row: T) => string;
  /** Renders the column content for a row (everything after the `Cursor`). */
  renderRow: (row: T, selected: boolean) => React.ReactNode;
  /** Text shown when `rows` is empty. */
  empty?: string;
  /** `gap` passed to each row `Box`. */
  gap?: number;
  /** Optional header row. Automatically indented to align with row content. */
  header?: React.ReactNode;
}

/**
 * Cursor-aware list renderer. Prepends a `Cursor` to each row and renders an
 * optional aligned header. Must be wrapped in a `Section` by the caller.
 */
export function Table<T>({ rows, cursor, getKey, renderRow, empty = 'No items', gap = 0, header }: TableProps<T>) {
  return (
    <>
      {header !== undefined && (
        <Box gap={gap}>
          <Text> </Text>
          {header}
        </Box>
      )}
      {rows.length === 0
        ? <Text dimColor>{empty}</Text>
        : rows.map((row, i) => (
            <Box key={getKey(row)} gap={gap}>
              <Cursor selected={i === cursor} />
              {renderRow(row, i === cursor)}
            </Box>
          ))
      }
    </>
  );
}
