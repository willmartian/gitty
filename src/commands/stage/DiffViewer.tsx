import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { type GitFile, getDiff } from '../../git.ts';
import { highlightDiff } from '../../highlight.ts';
import { useInputLock } from '../../contexts/InputLock.tsx';

type Section = 'staged' | 'changes';

export default function DiffViewer({ file, section, onClose }: {
  file: GitFile;
  section: Section;
  onClose: () => void;
}) {
  useInputLock();
  const [lines, setLines] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const { stdout } = useStdout();

  const viewHeight = (stdout.rows ?? 24) - 3;

  useEffect(() => {
    void getDiff(file, section).then(highlightDiff).then(setLines);
  }, []);

  const maxOffset = Math.max(0, lines.length - viewHeight);

  useInput((input, key) => {
    if (key.escape) { onClose(); return; }
    if (key.downArrow || input === 'j') { setOffset(o => Math.min(o + 1, maxOffset)); return; }
    if (key.upArrow || input === 'k') { setOffset(o => Math.max(0, o - 1)); return; }
  });

  const visible = lines.slice(offset, offset + viewHeight);
  const name = file.origPath ? `${file.origPath} → ${file.path}` : file.path;

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1} gap={2}>
        <Text bold>{name}</Text>
        {lines.length > 0 && (
          <Text dimColor>{offset + 1}–{Math.min(offset + viewHeight, lines.length)}/{lines.length}</Text>
        )}
      </Box>
      <Box flexDirection="column" paddingLeft={1}>
        {visible.map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}
      </Box>
    </Box>
  );
}
