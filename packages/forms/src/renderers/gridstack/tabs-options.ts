import { createContext, useContext } from 'react';

// A Tabs's own settings (doc 216 rules 3-4, 6). Pure — no gridstack, no React — so
// `renderers/default` may read it under doc 193's purity gate, exactly as `layout-gap` is read.

/**
 * Rules 3, 28: the presentations a Tabs may render as — a row of tabs, or the tabs BROKEN OUT into
 * labelled blocks, all visible at once. `tabs` is the default; an absent `options.component` renders tabs.
 */
export const TABS_COMPONENTS = ['tabs', 'list'] as const;

export type TabsComponent = (typeof TABS_COMPONENTS)[number];

export const DEFAULT_TABS_COMPONENT: TabsComponent = 'tabs';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Rule 3: the presentation `elementOptions` asks for — the authored `options.component` when it names a known
 * component, else the default. A wrong-typed or unknown value renders tabs rather than nothing, the sanitiser
 * rule of doc 182: what is not understood becomes the default, never `undefined`.
 */
export function tabsComponentOf(elementOptions: unknown): TabsComponent {
  const component = isRecord(elementOptions) ? elementOptions['component'] : undefined;
  return TABS_COMPONENTS.find((known) => known === component) ?? DEFAULT_TABS_COMPONENT;
}

/**
 * Rules 31-32: the component a preview is FORCING, overriding whatever the element authored — or `null`
 * everywhere else, which is everywhere but the studio's preview.
 *
 * A context rather than a key on JSONForms' `config` (where doc 211 put `presentation`): nothing but this
 * renderer reads it, and the three preview paths each build their own `config`, so threading a key through all
 * of them to reach one component is more seam than the value is worth. It is never authored — only the
 * component drawing the preview provides one.
 */
const TabsOverrideContext = createContext<TabsComponent | null>(null);

export const TabsOverrideProvider = TabsOverrideContext.Provider;

export function useTabsOverride(): TabsComponent | null {
  return useContext(TabsOverrideContext);
}

/** Rule 33: whether `element` or anything below it is a Tabs — what decides if the picker is shown. */
export function hasTabs(element: unknown): boolean {
  if (!isRecord(element)) return false;
  if (element['type'] === 'Tabs') return true;
  const elements = element['elements'];
  return Array.isArray(elements) && elements.some((child) => hasTabs(child));
}
