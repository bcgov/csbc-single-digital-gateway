import { nanoid } from 'nanoid';
import {
  DEFAULT_VARIANT,
  withVariant,
  type DocumentContent,
  type Uischema,
} from './document-types';
import { carriedEntries, withCapabilities } from './capabilities/capability-edits';
import { idOf, newId } from './element-ids';
import { withGridItem } from '../renderers/studio/grid-order';
import { cellAfter, gridLanding, isGrid } from './grid-edits';
import { copyInRow, isRow, rowHasRoom } from './row-edits';

/** A Control bound to a top-level schema property (doc 242 rule 6's binding). */
const PROPERTY_SCOPE = /^#\/properties\/([^/]+)$/;

/** What a copy produced: the new content, and the copy's id so the studio can select it. */
export interface CopyResult {
  content: DocumentContent;
  copyId: string;
}

/**
 * `content` with a copy of the element `id` inserted right after it, in the same layout (doc 254 rule 6). Every copied
 * element gets a new id, and every copied Control a NEW property — a `nanoid(8)` key holding a copy of the original's
 * schema, required when the original is — so the copy is its own field, not a second view of the same answer. Controls
 * in the copied subtree that shared a property share the new one. `undefined` for an unknown id or the root.
 *
 * A Grid child's copy takes the first free cell after it (doc 260 rule 22), one cell in size; a row child's lands right
 * after it at its width (doc 261 rule 18). With no room there is no copy (`undefined`).
 */
export function copyElement(content: DocumentContent, id: string): CopyResult | undefined {
  const variant = content.variants[DEFAULT_VARIANT];
  const keys = new Map<string, string>();
  const ids = new Map<string, string>();
  let copyId: string | undefined;
  const next = withCopy(variant, id, (element) => {
    const copy = cloned(element, keys, ids);
    copyId = idOf(copy);
    return copy;
  });
  if (next === variant || copyId === undefined) return undefined;
  const copied = { ...withVariant(content, next), schema: withKeys(content.schema, keys) };
  // Doc 258 rule 12: a copied element keeps its Implementation Rules under its new id.
  const capabilities = carriedEntries(content.capabilities, ids);
  return {
    content:
      capabilities === content.capabilities ? copied : withCapabilities(copied, capabilities),
    copyId,
  };
}

/** `node` with `copy(child)` inserted after the child whose id is `id`, at any depth; the same node when none is. */
function withCopy(node: Uischema, id: string, copy: (element: Uischema) => Uischema): Uischema {
  const elements = node['elements'];
  if (!Array.isArray(elements)) return node;
  const at = elements.findIndex((child) => isRecord(child) && idOf(child) === id);
  if (at !== -1) {
    const original = elements[at] as Uischema;
    if (isGrid(node)) {
      const after = cellAfter(node, id);
      const landing = after === undefined ? undefined : gridLanding(node, after);
      if (landing === undefined) return node;
      const placed = withGridItem(copy(original), { ...landing.cell, w: 1, h: 1 });
      return {
        ...node,
        elements: [...elements.slice(0, landing.index), placed, ...elements.slice(landing.index)],
      };
    }
    if (isRow(node)) {
      // Doc 261 rule 18: right after it at its width, the others re-fitted; asked first, so a refusal makes no copy.
      if (!rowHasRoom(node)) return node;
      return copyInRow(node, at, copy(original)) ?? node;
    }
    return {
      ...node,
      elements: [...elements.slice(0, at + 1), copy(original), ...elements.slice(at + 1)],
    };
  }
  const next = elements.map((child) => (isRecord(child) ? withCopy(child, id, copy) : child));
  return next.some((child, i) => child !== elements[i]) ? { ...node, elements: next } : node;
}

/** A deep copy with new ids (old → new recorded in `ids`), and Controls re-keyed through `keys` (old key → new). */
function cloned(element: Uischema, keys: Map<string, string>, ids: Map<string, string>): Uischema {
  const copy: Uischema = { ...structuredClone(element), id: newId() };
  const old = idOf(element);
  if (old !== undefined) ids.set(old, copy['id'] as string);
  const scope = copy['scope'];
  const key = typeof scope === 'string' ? PROPERTY_SCOPE.exec(scope)?.[1] : undefined;
  if (copy['type'] === 'Control' && key !== undefined) {
    const fresh = keys.get(key) ?? nanoid(8);
    keys.set(key, fresh);
    copy['scope'] = `#/properties/${fresh}`;
  }
  const elements = copy['elements'];
  if (Array.isArray(elements)) {
    copy['elements'] = elements.map((child: unknown) =>
      isRecord(child) ? cloned(child, keys, ids) : child,
    );
  }
  return copy;
}

/** `schema` with each re-keyed property copied under its new key, required when the original is. */
function withKeys(
  schema: Record<string, unknown>,
  keys: ReadonlyMap<string, string>,
): Record<string, unknown> {
  const properties = isRecord(schema['properties']) ? schema['properties'] : {};
  const added = [...keys].filter(([old]) => isRecord(properties[old]));
  if (added.length === 0) return schema;
  const required = Array.isArray(schema['required'])
    ? (schema['required'] as unknown[])
    : undefined;
  const newlyRequired = added.filter(([old]) => required?.includes(old)).map(([, fresh]) => fresh);
  return {
    ...schema,
    properties: {
      ...properties,
      ...Object.fromEntries(added.map(([old, fresh]) => [fresh, structuredClone(properties[old])])),
    },
    ...(required !== undefined &&
      newlyRequired.length > 0 && { required: [...required, ...newlyRequired] }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
