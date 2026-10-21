// A Tabs's own settings (doc 216 rules 3-4, 6). Pure — no gridstack, no React (doc 222 moved the
// override context to `tabs-override.ts` to keep that true) — so
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

/** Rule 33: whether `element` or anything below it is a Tabs — what decides if the picker is shown. */
export function hasTabs(element: unknown): boolean {
  if (!isRecord(element)) return false;
  if (element['type'] === 'Tabs') return true;
  const elements = element['elements'];
  return Array.isArray(elements) && elements.some((child) => hasTabs(child));
}
