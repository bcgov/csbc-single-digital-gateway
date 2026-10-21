import {
  compareCells,
  gridItemOption,
  gridPlacement,
  itemAlignmentOf,
  type GridRect,
} from '../default/grid-placement';

type GridChild = Record<string, unknown>;

// Doc 260 rule 18: what a Grid writes back — the element-order.ts of a 2-D layout.

/**
 * `element` with `options.gridItem` placed at `rect` — KEEPING its alignment keys (doc 260 rule 30) — or removed
 * (and an emptied `options` with it) for `undefined`: alignment means nothing outside a Grid.
 */
export function withGridItem(element: GridChild, rect: GridRect | undefined): GridChild {
  const options = recordOf(element['options']) ?? {};
  if (rect === undefined) {
    if (!('gridItem' in options)) return element;
    const { gridItem: _gridItem, ...rest } = options;
    const { options: _options, ...bare } = element;
    return Object.keys(rest).length === 0 ? bare : { ...bare, options: rest };
  }
  return { ...element, options: { ...options, gridItem: gridItemAt(element, rect) } };
}

/** The `gridItem` `element` has at `rect`: the placement, and the alignment it already had. */
function gridItemAt(element: GridChild, rect: GridRect): Record<string, unknown> {
  return { ...gridItemOption(rect), ...itemAlignmentOf(element) };
}

/**
 * A Grid's children with the rectangles gridstack reports (rule 18), sorted into reading order; the SAME array when no
 * child's placement or position changed. Children with no rectangle keep their placed one.
 */
export function placedElements(
  grid: object,
  rects: ReadonlyMap<string, GridRect>,
): readonly unknown[] {
  const own = (grid as GridChild)['elements'];
  const elements = Array.isArray(own) ? (own as unknown[]) : [];
  const placed = gridPlacement(grid).items.map((item) => {
    const rect = rects.get(item.key) ?? item;
    const child = elements[item.index];
    if (!isRecord(child)) return { rect, child };
    const same = sameItem(gridItemAt(child, rect), child);
    return { rect, child: same ? child : withGridItem(child, rect) };
  });
  const next = placed.toSorted((a, b) => compareCells(a.rect, b.rect)).map(({ child }) => child);
  return next.every((child, index) => child === elements[index]) ? elements : next;
}

/** Whether `child` already stores exactly `option` as its gridItem. */
function sameItem(option: Record<string, unknown>, child: GridChild): boolean {
  const current = recordOf(recordOf(child['options'])?.['gridItem']);
  if (current === undefined) return false;
  const keys = Object.keys(option);
  return (
    keys.length === Object.keys(current).length && keys.every((key) => current[key] === option[key])
  );
}

function isRecord(value: unknown): value is GridChild {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordOf(value: unknown): GridChild | undefined {
  return isRecord(value) ? value : undefined;
}
