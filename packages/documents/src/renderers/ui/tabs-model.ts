import { nanoid } from 'nanoid';

type Uischema = Record<string, unknown>;

/** One tab of a Tabs element (doc 272 rule 1): its VerticalLayout and the name its trigger shows. */
export interface TabEntry {
  id: string;
  label: string;
  layout: Uischema;
}

/** A Tabs' tabs: its VerticalLayout children, each named by its non-blank `label` else `Tab <n>`. */
export function tabsOf(element: unknown): TabEntry[] {
  const elements = (element as { elements?: unknown } | undefined)?.elements;
  if (!Array.isArray(elements)) return [];
  return elements.flatMap((child: unknown, index) => {
    if (typeof child !== 'object' || child === null || Array.isArray(child)) return [];
    const layout = child as Uischema;
    if (layout['type'] !== 'VerticalLayout') return [];
    const label = layout['label'];
    return [
      {
        id: typeof layout['id'] === 'string' ? layout['id'] : `#${index}`,
        label: typeof label === 'string' && label.trim() !== '' ? label.trim() : `Tab ${index + 1}`,
        layout,
      },
    ];
  });
}

/** A new empty tab named `Tab <n>`, `n` the smallest from count + 1 whose name is free (rule 1). */
export function newTab(tabs: readonly TabEntry[]): Uischema {
  const used = new Set(tabs.map((tab) => tab.label));
  let n = tabs.length + 1;
  while (used.has(`Tab ${n}`)) n += 1;
  return { id: nanoid(8), type: 'VerticalLayout', label: `Tab ${n}`, elements: [] };
}

/** A new Tabs' starting tabs: Tab 1 and Tab 2, fresh every call (doc 272 rule 8). */
export function starterTabs(): Uischema[] {
  const first = newTab([]);
  return [first, newTab(tabsOf({ elements: [first] }))];
}

/** Whether the element with id `id` is, or sits inside, `layout` — so the studio can follow the selection into a tab. */
export function holdsId(layout: Uischema, id: string): boolean {
  if (layout['id'] === id) return true;
  const elements = layout['elements'];
  return (
    Array.isArray(elements) &&
    elements.some(
      (child: unknown) =>
        typeof child === 'object' &&
        child !== null &&
        !Array.isArray(child) &&
        holdsId(child as Uischema, id),
    )
  );
}
