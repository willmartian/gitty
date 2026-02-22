import { createElement } from 'react';
import { render } from 'ink';
import Root, { type Tab } from './root.tsx';

const altScreen = process.argv.includes('-a') || process.argv.includes('--alt-screen');

export async function runTUI(initial: Tab) {
  if (altScreen) {
    process.stdout.write('\x1b[?1049h'); // enter alternate screen buffer
    process.stdout.write('\x1b[2J\x1b[H'); // clear and move cursor to top-left
  }
  try {
    const { waitUntilExit } = render(createElement(Root, { initial }));
    await waitUntilExit();
  } finally {
    if (altScreen) {
      process.stdout.write('\x1b[?1049l'); // exit alternate screen, restores original content
    }
  }
}
