import { nanoid } from 'nanoid';
import type { DocumentContent, Uischema } from './document-types';

/**
 * Every uischema element carries a top-level `id` — `nanoid(8)`. Ids are what edges and canvas actions address,
 * so they must survive a save.
 */
export function newId(): string {
  return nanoid(8);
}

export function idOf(element: Uischema): string | undefined {
  const id = element['id'];
  return typeof id === 'string' && id !== '' ? id : undefined;
}

/** The element whose id is `id` at or below `node` (through `elements`, any depth), else `undefined`. */
export function findById(node: Uischema, id: string): Uischema | undefined {
  if (idOf(node) === id) return node;
  const elements = node['elements'];
  if (!Array.isArray(elements)) return undefined;
  for (const child of elements) {
    const found = isElement(child) ? findById(child, id) : undefined;
    if (found !== undefined) return found;
  }
  return undefined;
}

function isElement(value: unknown): value is Uischema {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `element` with `options` merged over its own — never mutates it. */
export function withOptions(element: Uischema, options: Record<string, unknown>): Uischema {
  const current = element['options'];
  const base = typeof current === 'object' && current !== null ? current : {};
  return { ...element, options: { ...base, ...options } };
}

/**
 * `uischema` with an id stamped on every element (the root and everything under `elements`, at any depth) and on
 * every Funnel condition that lacks one. Returns the SAME object when every element already has an id, so a caller can tell nothing changed.
 * An empty variant (`{}`) is not an element yet and is returned as is.
 */
export function ensureIds(uischema: Uischema): Uischema {
  if (Object.keys(uischema).length === 0) return uischema;
  let next = idOf(uischema) === undefined ? { ...uischema, id: newId() } : uischema;
  const elements = next['elements'];
  if (Array.isArray(elements)) {
    const stamped = elements.map((child: unknown) =>
      typeof child === 'object' && child !== null && !Array.isArray(child)
        ? ensureIds(child as Uischema)
        : child,
    );
    if (stamped.some((child, i) => child !== elements[i])) next = { ...next, elements: stamped };
  }
  return withConditionIds(next);
}

/** A Funnel's `options.conditions` with an id on every condition that lacks one; the same object otherwise. */
function withConditionIds(uischema: Uischema): Uischema {
  const options = uischema['options'];
  if (typeof options !== 'object' || options === null) return uischema;
  const conditions = (options as Record<string, unknown>)['conditions'];
  if (!Array.isArray(conditions)) return uischema;
  const stamped = conditions.map((c: unknown) =>
    typeof c === 'object' && c !== null && idOf(c as Uischema) === undefined
      ? { ...c, id: newId() }
      : c,
  );
  if (stamped.every((c, i) => c === conditions[i])) return uischema;
  return withOptions(uischema, { conditions: stamped });
}

/** `content` with ids stamped through every variant; the same object when nothing needed one. */
export function ensureContentIds(content: DocumentContent): DocumentContent {
  const entries = Object.entries(content.variants).map(
    ([name, v]) => [name, ensureIds(v)] as const,
  );
  if (entries.every(([name, v]) => v === content.variants[name])) return content;
  return { ...content, variants: Object.fromEntries(entries) as DocumentContent['variants'] };
}
