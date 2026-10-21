import { nanoid } from 'nanoid';
import { DEFAULT_GRID_COLUMNS, DEFAULT_GRID_ROWS, MAX_GRID_ROWS } from '../default/grid-placement';

type Uischema = Record<string, unknown>;

/** How a Tabs lays out each tab's content (doc 272 rule 11). */
export type TabsLayout = 'card' | 'grid' | 'horizontal' | 'vertical';

/** Rule 15: the inspector's choices, alphabetical by title. */
export const TABS_LAYOUTS: ReadonlyArray<readonly [TabsLayout, string]> = Object.freeze([
  ['card', 'Card'],
  ['grid', 'Grid'],
  ['horizontal', 'Horizontal layout'],
  ['vertical', 'Vertical layout'],
] as const);

/** Rule 11: what every Tabs drew before the setting existed — an absent or unknown layout. */
export const DEFAULT_TABS_LAYOUT: TabsLayout = 'vertical';

/** Rule 12: each layout's tab container type — a Card tab is a VerticalLayout in a Card frame (rule 13). */
const CONTAINER_TYPES: Readonly<Record<TabsLayout, string>> = Object.freeze({
  card: 'VerticalLayout',
  vertical: 'VerticalLayout',
  horizontal: 'HorizontalLayout',
  grid: 'Grid',
});

/** Rule 12: the types a tab may be, whatever the Tabs' setting. */
const TAB_TYPES: ReadonlySet<unknown> = new Set(Object.values(CONTAINER_TYPES));

/** Rule 14: the container options a layout type owns, dropped when a tab changes type. */
const TYPE_OPTIONS: readonly string[] = Object.freeze([
  'columns',
  'rows',
  'justify',
  'alignItems',
  'justifyItems',
]);

/** Rule 11: `options.layout` when it is one of the four, else `vertical`. Takes the Tabs' `options`. */
export function tabsLayout(options: unknown): TabsLayout {
  const layout = recordOf(options)?.['layout'];
  return TABS_LAYOUTS.some(([value]) => value === layout)
    ? (layout as TabsLayout)
    : DEFAULT_TABS_LAYOUT;
}

/** One tab of a Tabs element (doc 272 rules 1, 12): its container layout and the name its trigger shows. */
export interface TabEntry {
  id: string;
  label: string;
  layout: Uischema;
}

/** A Tabs' tabs: its tab-container children (rule 12), each named by its non-blank `label` else `Tab <n>`. */
export function tabsOf(element: unknown): TabEntry[] {
  const elements = (element as { elements?: unknown } | undefined)?.elements;
  if (!Array.isArray(elements)) return [];
  return elements.flatMap((child: unknown, index) => {
    if (typeof child !== 'object' || child === null || Array.isArray(child)) return [];
    const layout = child as Uischema;
    if (!TAB_TYPES.has(layout['type'])) return [];
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

/**
 * A new empty tab named `Tab <n>`, `n` the smallest from count + 1 whose name is free (rule 1), of the container
 * `layout` calls for (rule 16).
 */
export function newTab(
  tabs: readonly TabEntry[],
  layout: TabsLayout = DEFAULT_TABS_LAYOUT,
): Uischema {
  const used = new Set(tabs.map((tab) => tab.label));
  let n = tabs.length + 1;
  while (used.has(`Tab ${n}`)) n += 1;
  return {
    id: nanoid(8),
    type: CONTAINER_TYPES[layout],
    label: `Tab ${n}`,
    ...(layout === 'grid' && { options: gridOptions(0) }),
    elements: [],
  };
}

/** A new Tabs' starting tabs: Tab 1 and Tab 2, fresh every call (doc 272 rule 8). */
export function starterTabs(layout: TabsLayout = DEFAULT_TABS_LAYOUT): Uischema[] {
  const first = newTab([], layout);
  return [first, newTab(tabsOf({ elements: [first] }), layout)];
}

/**
 * A Tabs' `elements` with every tab container converted to `layout`'s type (rule 14): ids, labels, children and gap
 * kept; type-specific options and each child's placement dropped; a grid places its children in reading order. Nothing
 * is deleted, and a non-tab child is returned as it was.
 */
export function convertTabs(elements: readonly unknown[], layout: TabsLayout): unknown[] {
  const type = CONTAINER_TYPES[layout];
  return elements.map((child) => {
    const tab = recordOf(child);
    if (tab === undefined || !TAB_TYPES.has(tab['type'])) return child;
    if (tab['type'] === type) return child;
    const children = (Array.isArray(tab['elements']) ? tab['elements'] : []).map(withoutPlacement);
    const kept = withoutKeys(recordOf(tab['options']) ?? {}, TYPE_OPTIONS);
    const options = layout === 'grid' ? { ...kept, ...gridOptions(children.length) } : kept;
    return {
      ...withoutKeys(tab, ['options']),
      type,
      ...(Object.keys(options).length > 0 && { options }),
      elements: layout === 'grid' ? children.map(placedInReadingOrder) : children,
    };
  });
}

/** A converted Grid's size (rule 14): 2 columns and as many rows as its children need, within the Grid's limits. */
function gridOptions(count: number): { columns: number; rows: number } {
  const rows = Math.ceil(count / DEFAULT_GRID_COLUMNS);
  return {
    columns: DEFAULT_GRID_COLUMNS,
    rows: Math.min(MAX_GRID_ROWS, Math.max(DEFAULT_GRID_ROWS, rows)),
  };
}

/** A child at `index` of a converted Grid, at the next cell in reading order. */
function placedInReadingOrder(child: unknown, index: number): unknown {
  const record = recordOf(child);
  if (record === undefined) return child;
  const gridItem = { x: index % DEFAULT_GRID_COLUMNS, y: Math.floor(index / DEFAULT_GRID_COLUMNS) };
  return { ...record, options: { ...recordOf(record['options']), gridItem } };
}

/** A child without its `options.gridItem` — the old layout's placement, which the new one derives for itself. */
function withoutPlacement(child: unknown): unknown {
  const record = recordOf(child);
  const options = recordOf(record?.['options']);
  if (record === undefined || options === undefined || !('gridItem' in options)) return child;
  const rest = withoutKeys(options, ['gridItem']);
  const element = withoutKeys(record, ['options']);
  return Object.keys(rest).length > 0 ? { ...element, options: rest } : element;
}

function withoutKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
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
