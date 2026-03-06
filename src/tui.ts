import { createElement, createContext, useContext, type ComponentType } from 'react';
import { render } from 'ink';
import App, { type AppTab } from './App.tsx';
import Postscript from './Postscript.tsx';

const ClearContext = createContext<() => void>(() => {});
export const useClear = () => useContext(ClearContext);

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
  if (useAltScreen) {
    await altScreen(async () => {
      const { waitUntilExit } = render(createElement(Component));
      await waitUntilExit();
    });
  } else {
    const clearRef = { current: () => {} };
    const Wrapped = () => createElement(ClearContext.Provider, { value: () => clearRef.current() }, createElement(Component));
    const { waitUntilExit, clear } = render(createElement(Wrapped));
    clearRef.current = clear;
    await waitUntilExit();
  }
  await renderPostscript();
}

export async function runTUI(initial: AppTab) {
  const AppWithTab = () => createElement(App, { initial });
  await runUI(AppWithTab);
}
