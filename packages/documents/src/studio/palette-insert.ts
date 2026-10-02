import type { DocumentContent, Uischema } from './document-types';
import { DEFAULT_VARIANT, withVariant } from './document-types';
import { findById, idOf } from './element-ids';
import type { PaletteCreation } from './palette-items';

/**
 * `content` with a placed item (doc 238 rule 15): its element spliced into the `elements` of the element whose id is
 * `layoutId` (any depth, default variant) at `index` clamped to the list, and its schema properties added. The SAME
 * content when the layout is unknown or a property key already exists — an insert never overwrites a field.
 */
export function insertItem(
  content: DocumentContent,
  layoutId: string,
  index: number,
  creation: PaletteCreation,
): DocumentContent {
  const current = isRecord(content.schema['properties']) ? content.schema['properties'] : {};
  const added = creation.properties ?? {};
  if (Object.keys(added).some((key) => Object.hasOwn(current, key))) return content;
  const variant = content.variants[DEFAULT_VARIANT];
  const next = spliced(variant, layoutId, index, creation.element);
  if (next === variant) return content;
  const withElement = withVariant(content, next);
  if (Object.keys(added).length === 0) return withElement;
  return {
    ...withElement,
    schema: { ...content.schema, properties: { ...current, ...added } },
  };
}

/** Where a clicked palette item goes (doc 238 rule 16): a layout and the index in its `elements`. */
export interface AppendTarget {
  layoutId: string;
  index: number;
}

/**
 * Where a palette click places its item in `form`, by the page selection (doc 238 rule 16): the end of a selected
 * layout (an element with `elements`, other than the Form); right after a selected element that is not a layout, in its
 * own layout; the end of the Form with nothing selected, the Form selected, or an id not inside it.
 */
export function appendTarget(form: Uischema, selectedId: string | null): AppendTarget {
  const formId = idOf(form) ?? '';
  const end = { layoutId: formId, index: Infinity };
  if (selectedId === null || selectedId === formId) return end;
  const selected = findById(form, selectedId);
  if (selected === undefined) return end;
  if (Array.isArray(selected['elements'])) return { layoutId: selectedId, index: Infinity };
  const parent = parentOf(form, selectedId);
  const parentId = parent === undefined ? undefined : idOf(parent);
  if (parent === undefined || parentId === undefined) return end;
  const siblings = parent['elements'] as unknown[];
  return {
    layoutId: parentId,
    index: siblings.findIndex((c) => isRecord(c) && idOf(c) === selectedId) + 1,
  };
}

/** The element whose `elements` directly hold the element with id `id`. */
function parentOf(node: Uischema, id: string): Uischema | undefined {
  const elements = node['elements'];
  if (!Array.isArray(elements)) return undefined;
  if (elements.some((child: unknown) => isRecord(child) && idOf(child) === id)) return node;
  for (const child of elements) {
    const found = isRecord(child) ? parentOf(child, id) : undefined;
    if (found !== undefined) return found;
  }
  return undefined;
}

/** `node` with `element` spliced into the `elements` of the element whose id is `layoutId` (any depth), clamped. */
export function spliced(
  node: Uischema,
  layoutId: string,
  index: number,
  element: Uischema,
): Uischema {
  const elements = node['elements'];
  if (idOf(node) === layoutId && Array.isArray(elements)) {
    const at = Math.min(Math.max(index, 0), elements.length);
    return { ...node, elements: [...elements.slice(0, at), element, ...elements.slice(at)] };
  }
  if (!Array.isArray(elements)) return node;
  const children = elements.map((child: unknown) =>
    isRecord(child) ? spliced(child, layoutId, index, element) : child,
  );
  return children.some((child, i) => child !== elements[i])
    ? { ...node, elements: children }
    : node;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
