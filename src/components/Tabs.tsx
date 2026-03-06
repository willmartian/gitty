import React, { createContext, useContext, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useInputLocked } from '../contexts/InputLock.tsx';

interface TabConfig {
  name: string;
  content: React.ReactNode;
}

interface TabsContextValue {
  active: string;
  tabs: TabConfig[];
}

const TabsContext = createContext<TabsContextValue>({ active: '', tabs: [] });
const useTabsContext = () => useContext(TabsContext);

/**
 * Declarative tab definition. Renders nothing — `Tabs` reads its `name` and
 * `children` to build the tab list.
 */
export function Tab(_props: { name: string; children: React.ReactNode }): null {
  return null;
}

/**
 * Renders the tab name row (e.g. `stage | branch | stash | log`) with the active
 * tab highlighted. Must be a descendant of `Tabs`.
 */
export function TabBar() {
  const { active, tabs } = useTabsContext();
  return (
    <Box gap={1}>
      {tabs.map((tab, i) => (
        <React.Fragment key={tab.name}>
          {i > 0 && <Text dimColor>|</Text>}
          <Text bold={active === tab.name} color={active === tab.name ? 'white' : 'gray'}>
            {tab.name}
          </Text>
        </React.Fragment>
      ))}
    </Box>
  );
}

/**
 * Renders the active tab's children. Must be a descendant of `Tabs`.
 */
export function TabContent() {
  const { active, tabs } = useTabsContext();
  const tab = tabs.find(t => t.name === active);
  return <>{tab?.content ?? null}</>;
}

/**
 * Tab container. Reads `Tab` children to build the tab list, handles Tab /
 * Shift+Tab switching (respects `InputLock`), and provides context for
 * `TabBar` and `TabContent`.
 *
 * `Tab` config elements and layout elements (`TabBar`, `TabContent`, etc.)
 * may be freely mixed as children — `Tab` renders nothing and is read purely
 * for its `name` and `children` props.
 *
 * @example
 * ```tsx
 * <Tabs initial="home" onChange={handleTabChange}>
 *   <Tab name="home"><HomeScreen /></Tab>
 *   <Tab name="settings"><SettingsScreen /></Tab>
 *
 *   <Section><Box gap={1}><Text>My App</Text><TabBar /></Box></Section>
 *   <TabContent />
 * </Tabs>
 * ```
 */
export function Tabs({ initial, onChange, children }: {
  /** The tab name to show on first render. */
  initial: string;
  /** Called whenever the active tab changes. */
  onChange?: (tab: string) => void;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(initial);
  const locked = useInputLocked();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabs: TabConfig[] = (React.Children.toArray(children) as React.ReactElement<any>[])
    .filter(c => React.isValidElement(c) && c.type === Tab)
    .map(c => ({ name: c.props.name as string, content: c.props.children as React.ReactNode }));

  useInput((_input, key) => {
    if (locked) return;
    const idx = tabs.findIndex(t => t.name === active);
    if (key.tab && key.shift) {
      const next = tabs[Math.max(0, idx - 1)]!.name;
      setActive(next); onChange?.(next);
    } else if (key.tab) {
      const next = tabs[Math.min(tabs.length - 1, idx + 1)]!.name;
      setActive(next); onChange?.(next);
    }
  });

  return (
    <TabsContext.Provider value={{ active, tabs }}>
      {children}
    </TabsContext.Provider>
  );
}
