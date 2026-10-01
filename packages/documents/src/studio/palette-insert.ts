import type { DocumentContent, Uischema } from './document-types';
import { DEFAULT_VARIANT, withVariant } from './document-types';
import { idOf } from './element-ids';
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

function spliced(node: Uischema, layoutId: string, index: number, element: Uischema): Uischema {
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
