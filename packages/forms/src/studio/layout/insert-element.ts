import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { LayoutNode } from '../../renderers/gridstack/grid-editor';
import { fitDropIn } from '../../renderers/gridstack/grid-drop-fit';
import {
  layoutKindOf,
  rowHasRoom,
  type GridLayoutKind,
} from '../../renderers/gridstack/grid-layouts';
import { buildTemplate } from '../palette/palette-templates';
import { layoutGrid } from './apply-layout';
import type { ElementIds } from './element-ids';
import {
  findById,
  findParentById,
  updateById,
  withElements,
  type TreeElement,
} from './element-tree';
import { propertyScope, type StudioDocument } from './schema-properties';

// Inserting a palette template into the studio document (doc 189 rules 18, 20-23). Pure: every changed element is a
// new object carrying its id, and the schema object is replaced only for field templates.

/** Where a template lands: a layout, and — for a drop — the dropped node's placement and the layout's other nodes. */
export interface InsertTarget {
  readonly gridId: string;
  readonly placement?: { readonly x: number; readonly y: number; readonly w: number };
  readonly nodes?: readonly LayoutNode[];
}

export interface InsertResult extends StudioDocument {
  /** The inserted element as it is in the returned uischema, or `undefined` when refused (rule 20). */
  readonly inserted: UISchemaElement | undefined;
}

type Placement = NonNullable<InsertTarget['placement']>;

const GRID_COLUMNS = 12;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A Grid's authored `options.column` when an integer 1-12, else 12. */
function gridColumns(options: unknown): number {
  const column = isRecord(options) ? options['column'] : undefined;
  return typeof column === 'number' &&
    Number.isInteger(column) &&
    column >= 1 &&
    column <= GRID_COLUMNS
    ? column
    : GRID_COLUMNS;
}

/** Rule 22: a clicked item is full width in a Grid (gridstack places it), width 1 in a row, unplaced in a stack. */
function clickPlacement(layout: TreeElement, element: UISchemaElement): UISchemaElement {
  const kind = layoutKindOf(layout.type);
  if (kind === 'vertical') return element;
  const w = kind === 'horizontal' ? 1 : gridColumns(layout.options);
  return { ...element, options: { ...element.options, gridItem: { w } } };
}

/**
 * Rule 21d: in a Grid, the drop fits the free run on its row, up to 6 columns — the same `fitDropIn` the grid's engine
 * previews while dragging, against the grid's other nodes. Other layouts keep the drop as it is.
 */
function dropPlacement(
  kind: GridLayoutKind,
  layout: TreeElement,
  placement: Placement,
  nodes: readonly LayoutNode[],
): Placement {
  if (kind !== 'grid') return placement;
  return { ...placement, ...fitDropIn(placement, nodes, gridColumns(layout.options)) };
}

/** Rule 18: a new key, regenerated while an existing property has it. */
function freshKey(schema: JsonSchema, newKey: () => string): string {
  const properties = schema.properties ?? {};
  let key = newKey();
  while (Object.hasOwn(properties, key)) key = newKey();
  return key;
}

/**
 * Rules 20-23: the template `template` appended to the layout `target.gridId` — laid out from the drop when
 * `target.placement` is given, else placed as a click — with a new data property for a field. An unknown template,
 * an unknown or non-layout target, or a full HorizontalLayout returns the same document.
 */
export function insertElement(
  document: StudioDocument,
  template: string,
  target: InsertTarget,
  ids: ElementIds,
  newKey: () => string,
): InsertResult {
  const root = document.uischema as TreeElement;
  const layout = findById(root, target.gridId, ids);
  const kind = layout ? layoutKindOf(layout.type) : undefined;
  const built = buildTemplate(template, document.schema);
  if (!layout || !kind || !built) return { ...document, inserted: undefined };
  if (kind === 'horizontal' && !rowHasRoom(layout.options, layout.elements ?? []))
    return { ...document, inserted: undefined };

  const key = built.property ? freshKey(document.schema, newKey) : undefined;
  const scoped =
    key === undefined
      ? built.element
      : ({ ...built.element, scope: propertyScope(key) } as UISchemaElement);
  const placed = (target.placement ? scoped : clickPlacement(layout, scoped)) as TreeElement;

  const uischema = updateById(
    root,
    target.gridId,
    (grid) => {
      const appended = withElements(grid, [...(grid.elements ?? []), placed], ids);
      if (!target.placement) return appended;
      const fitted = dropPlacement(kind, layout, target.placement, target.nodes ?? []);
      const node = { id: ids.idOf(placed), ...fitted };
      return layoutGrid(appended, [...(target.nodes ?? []), node], ids, placed);
    },
    ids,
  );
  const schema =
    key === undefined || !built.property
      ? document.schema
      : ({
          ...document.schema,
          properties: { ...document.schema.properties, [key]: built.property },
        } as JsonSchema);
  return { schema, uischema, inserted: findById(uischema as TreeElement, ids.idOf(placed), ids) };
}

/**
 * Rule 24: where a clicked palette item goes — the selected element when it is a Grid, VerticalLayout or
 * HorizontalLayout, else the element holding it; the root when nothing, or an unknown id, is selected.
 */
export function addTargetId(
  uischema: UISchemaElement,
  selectedId: string | null,
  ids: ElementIds,
): string {
  const root = uischema as TreeElement;
  const selected = selectedId === null ? undefined : findById(root, selectedId, ids);
  if (!selected) return ids.idOf(root);
  if (layoutKindOf(selected.type)) return ids.idOf(selected);
  return ids.idOf(findParentById(root, ids.idOf(selected), ids) ?? root);
}
