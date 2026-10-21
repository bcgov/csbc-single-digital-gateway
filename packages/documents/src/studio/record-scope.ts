import { isObjectArray } from '../renderers/ui/object-array';
import type { Uischema } from './document-types';
import { idOf } from './element-ids';
import type { PaletteCreation } from './palette-items';
import { refOfScope, scopeOf } from './property-ref';

/** Whether `node` is a record Control (doc 271 rule 3) — by its uischema; the schema check is the renderer's. */
export function isRecordControl(node: Uischema): boolean {
  const options = node['options'];
  return (
    node['type'] === 'Control' &&
    typeof options === 'object' &&
    options !== null &&
    (options as Record<string, unknown>)['component'] === 'record'
  );
}

/**
 * Doc 271 rule 10: the array key of the record whose item form holds the element `id` (the item layout itself, or
 * anything below it), from the NEAREST record ancestor; `undefined` on the page. A record Control is not inside itself.
 */
export function recordArrayOf(root: Uischema, id: string): string | undefined {
  return search(root, id, undefined) ?? undefined;
}

function search(node: Uischema, id: string, array: string | undefined): string | undefined | null {
  if (idOf(node) === id) return array;
  const elements = node['elements'];
  if (!Array.isArray(elements)) return null;
  const inside = isRecordControl(node) ? (refOfScope(node['scope'])?.key ?? array) : array;
  for (const child of elements) {
    if (!isRecord(child)) continue;
    const found = search(child, id, inside);
    if (found !== null) return found;
  }
  return null;
}

/** Every Control scope in a subtree (the element itself included). */
export function controlScopes(node: Uischema): string[] {
  const own =
    node['type'] === 'Control' && typeof node['scope'] === 'string' ? [node['scope']] : [];
  const elements = node['elements'];
  return Array.isArray(elements)
    ? [...own, ...elements.filter(isRecord).flatMap(controlScopes)]
    : own;
}

/** `node` with every Control scope passed through `map`, at any depth; the same object when none changes. */
export function mapScopes(node: Uischema, map: (scope: string) => string): Uischema {
  const scope = node['scope'];
  const own =
    node['type'] === 'Control' && typeof scope === 'string' && map(scope) !== scope
      ? { ...node, scope: map(scope) }
      : node;
  const elements = own['elements'];
  if (!Array.isArray(elements)) return own;
  const children = elements.map((child: unknown) =>
    isRecord(child) ? mapScopes(child, map) : child,
  );
  return children.some((child, i) => child !== elements[i]) ? { ...own, elements: children } : own;
}

/** Whether a subtree holds an object array (a Data table or a Record), by the schema its Controls bind. */
export function holdsObjectArray(
  node: Uischema,
  propertyOf: (scope: string) => Record<string, unknown> | undefined,
): boolean {
  return controlScopes(node).some((scope) => isObjectArray(propertyOf(scope)));
}

/**
 * Doc 271 rule 11: a palette creation placed into the record over `array` — its Controls' page scopes rewritten to
 * item scopes, its properties destined for `items.properties`. `undefined` when it may not go there: it creates an
 * object array (no nesting), or it binds a page field it does not create (a variant's default-field item).
 */
export function intoRecord(creation: PaletteCreation, array: string): PaletteCreation | undefined {
  const added = creation.properties ?? {};
  if (Object.values(added).some((property) => isObjectArray(property))) return undefined;
  const scopes = controlScopes(creation.element);
  const ownKeys = new Set(Object.keys(added));
  const refs = scopes.map(refOfScope);
  if (refs.some((ref) => ref === undefined || ref.array !== undefined || !ownKeys.has(ref.key)))
    return undefined;
  const element = mapScopes(creation.element, (scope) => {
    const ref = refOfScope(scope)!;
    return scopeOf({ array, key: ref.key });
  });
  return { ...creation, element };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
