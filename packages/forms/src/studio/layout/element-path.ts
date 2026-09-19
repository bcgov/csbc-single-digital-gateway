import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { ElementIds } from './element-ids';
import type { TreeElement } from './element-tree';
import { propertyKeyOf } from './schema-properties';

// The path from the root to an element, and the labels naming it, behind the studio's footer
// breadcrumbs (doc 186 rules 11, 16, 19-20).

/** One breadcrumb: an element's studio id and its label. */
export interface PathSegment {
  readonly id: string;
  readonly label: string;
}

/** A path split for display: `hidden` is empty unless the path was collapsed. */
export interface CollapsedPath {
  readonly leading: readonly PathSegment[];
  readonly hidden: readonly PathSegment[];
  readonly trailing: readonly PathSegment[];
}

/** The elements from `root` down to the element with `id`, inclusive; `[]` when `id` is not in the tree. */
export function elementPath(root: TreeElement, id: string, ids: ElementIds): TreeElement[] {
  if (ids.idOf(root) === id) return [root];
  for (const child of root.elements ?? []) {
    const path = elementPath(child, id, ids);
    if (path.length > 0) return [root, ...path];
  }
  return [];
}

/** `value` trimmed when it is a non-empty string, else `undefined`. */
const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const field = (element: UISchemaElement, key: string): unknown =>
  (element as unknown as Record<string, unknown>)[key];

/**
 * An element's breadcrumb label (rule 11): a Control's string `label`, else its property's `title`; a
 * Heading's `text`; any other element's string `label` — falling back to the element type.
 */
export function elementLabel(element: UISchemaElement, schema: JsonSchema): string {
  if (element.type === 'Heading') return text(field(element, 'text')) ?? element.type;
  // Doc 207: rich content has no plain-text label to borrow, so the crumb is the type — an author
  // recognises it by position, and flattening a node tree into a crumb would read as gibberish.
  if (element.type === 'RichContent') return 'Rich content';

  const label = text(field(element, 'label'));
  if (label !== undefined || element.type !== 'Control') return label ?? element.type;

  const key = propertyKeyOf(element, schema);
  const title = key === undefined ? undefined : text(schema.properties?.[key]?.title);
  return title ?? element.type;
}

/** The breadcrumbs to the element with `id`, or the root's alone when `id` is `null` or unknown (rule 20). */
export function pathSegments(
  root: TreeElement,
  id: string | null,
  schema: JsonSchema,
  ids: ElementIds,
): PathSegment[] {
  const path = id === null ? [] : elementPath(root, id, ids);
  return (path.length > 0 ? path : [root]).map((element) => ({
    id: ids.idOf(element),
    label: elementLabel(element, schema),
  }));
}

/** A path longer than `max` as root › (hidden) › parent › current; shorter paths stay whole (rule 16). */
export function collapsePath(segments: readonly PathSegment[], max: number): CollapsedPath {
  if (segments.length <= max) return { leading: segments, hidden: [], trailing: [] };
  return {
    leading: segments.slice(0, 1),
    hidden: segments.slice(1, -2),
    trailing: segments.slice(-2),
  };
}
