import { createElement, type ComponentType } from 'react';
import { render } from 'ink';
import App, { type Tab } from './App.tsx';
import Postscript from './Postscript.tsx';

async function altScreen(fn: () => Promise<void>) {
  process.stdout.write('\x1b[?1049h'); // enter alternate screen buffer
  process.stdout.write('\x1b[2J\x1b[H'); // clear and move cursor to top-left
  try {
    await fn();
  } finally {
    process.stdout.write('\x1b[?1049l'); // exit alternate screen, restores original content
  }
}

async function renderPostscript(): Promise<void> {
  const { unmount, waitUntilExit } = render(createElement(Postscript));
  await new Promise(resolve => setTimeout(resolve, 0));
  unmount();
  await waitUntilExit();
}

export async function runUI(Component: ComponentType, useAltScreen = true) {
  const run = async () => {
    const { waitUntilExit } = render(createElement(Component));
    await waitUntilExit();
  };
  if (useAltScreen) {
    await altScreen(run);
  } else {
    await run();
  }
  await renderPostscript();
}

export async function runTUI(initial: Tab) {
  const AppWithTab = () => createElement(App, { initial });
  await runUI(AppWithTab);
}
