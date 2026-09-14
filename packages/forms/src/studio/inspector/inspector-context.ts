import type { JsonSchema } from '@jsonforms/core';
import {
  horizontalColumns,
  horizontalWidth,
  layoutKindOf,
  type GridLayoutKind,
} from '../../renderers/gridstack/grid-layouts';
import type { ElementIds } from '../layout/element-ids';
import { findById, findParentById, type TreeElement } from '../layout/element-tree';
import { propertyKeyOf, type StudioDocument } from '../layout/schema-properties';

/** The value type of a Control that decides its type-specific settings (doc 187 rule 8). */
export type ValueType = 'string' | 'number';

// The studio's Grids run on the built-in 12 columns (DEFAULT_GRID_OPTIONS) unless authored otherwise.
const GRID_COLUMNS = 12;

/** Everything the inspector needs to know about the selected element (doc 187 rules 8, 11). */
export interface InspectorContext {
  readonly element: TreeElement;
  /** `undefined` for the root. */
  readonly parent: TreeElement | undefined;
  /** The document's root schema — where `required` lives. */
  readonly schema: JsonSchema;
  /** The OWN top-level property a Control binds to, if any. */
  readonly propertyKey: string | undefined;
  readonly property: JsonSchema | undefined;
  readonly valueType: ValueType | undefined;
  /** The element's own gridstack layout kind, if it is a Grid, VerticalLayout or HorizontalLayout. */
  readonly layoutKind: GridLayoutKind | undefined;
  /** The widest the element may be made, when its parent is a Grid or HorizontalLayout. */
  readonly maxWidth: number | undefined;
}

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

/**
 * Width bound (rule 11): a Grid's column count, or — in a HorizontalLayout — its columns less the widths of
 * the other children, never below 1. Other parents place children by order, so there is no width.
 */
function maxWidthIn(parent: TreeElement | undefined, element: TreeElement): number | undefined {
  const kind = parent ? layoutKindOf(parent.type) : undefined;
  if (!parent || kind === undefined || kind === 'vertical') return undefined;
  if (kind === 'grid') return gridColumns(parent.options);

  const siblings = parent.elements ?? [];
  const columns = horizontalColumns(parent.options, siblings.length);
  const others = siblings
    .filter((sibling) => sibling !== element)
    .reduce((sum, sibling) => sum + horizontalWidth(sibling, columns), 0);
  return Math.max(1, columns - others);
}

/** The inspector context for the element with `elementId`, or `undefined` when it is not in the document. */
export function inspectorContext(
  document: StudioDocument,
  elementId: string,
  ids: ElementIds,
): InspectorContext | undefined {
  const root = document.uischema as TreeElement;
  const element = findById(root, elementId, ids);
  if (!element) return undefined;

  const propertyKey = propertyKeyOf(element, document.schema);
  const property =
    propertyKey === undefined ? undefined : document.schema.properties?.[propertyKey];
  const type = property?.type;
  const parent = findParentById(root, elementId, ids);

  return {
    element,
    parent,
    schema: document.schema,
    propertyKey,
    property,
    valueType: type === 'string' || type === 'number' ? type : undefined,
    layoutKind: layoutKindOf(element.type),
    maxWidth: maxWidthIn(parent, element),
  };
}
