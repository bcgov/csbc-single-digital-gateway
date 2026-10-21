import type { UISchemaElement } from '@jsonforms/core';
import type { Capability, CapabilityMap, CascadeScope } from '../../capabilities/capability-types';
import { authoredId } from '../../renderers/ui/authored-id';

// Doc 231 — a contents toggle cascades COPY ON WRITE: changing it writes explicit entries onto the
// elements its scope reaches. Resolution (`capabilityFor`), the studio gates and API enforcement are
// untouched — they already read per-element entries — and an element the owner adds later has no
// entry, so it stays the owner's own (doc 220's provenance rule). Inheriting on resolve would lock it.

/** The contents toggles that cascade. `edges` is deliberately absent (rule 9). */
export type CascadingKey = 'addChildren' | 'removeChildren' | 'reorderChildren';

export const CASCADING_KEYS: readonly CascadingKey[] = Object.freeze([
  'addChildren',
  'removeChildren',
  'reorderChildren',
] as const);

/** What an absent `cascade` reads as. */
export const DEFAULT_CASCADE: CascadeScope = 'descendants';

/**
 * The element-level key a contents toggle governs on the child itself. `addChildren` has none: a
 * child is never "added", so its first level is the child container's own `addChildren`.
 */
const ELEMENT_COUNTERPART: Readonly<Record<CascadingKey, 'remove' | 'move' | undefined>> =
  Object.freeze({ addChildren: undefined, removeChildren: 'remove', reorderChildren: 'move' });

type TreeElement = UISchemaElement & { elements?: UISchemaElement[] };

const childrenOf = (element: UISchemaElement): readonly UISchemaElement[] => {
  const { elements } = element as TreeElement;
  return Array.isArray(elements) ? elements : [];
};

const holdsChildren = (element: UISchemaElement): boolean =>
  Array.isArray((element as TreeElement).elements);

/**
 * The keys `key` writes on one target.
 *
 * `inner` is whether the scope continues BELOW this target (`descendants`). Only then does a child
 * container take the contents key for `remove` / `move` too: `mayRemove` asks the PARENT's
 * `removeChildren`, so writing it on a first-level child would reach the second level — exactly what
 * "Immediate children" excludes.
 */
function keysFor(key: CascadingKey, target: UISchemaElement, inner: boolean): (keyof Capability)[] {
  const counterpart = ELEMENT_COUNTERPART[key];
  const keys: (keyof Capability)[] = counterpart ? [counterpart] : [];
  if (holdsChildren(target) && (inner || counterpart === undefined)) keys.push(key);
  return keys;
}

/**
 * `capabilities` with `key = value` cascaded onto what `scope` reaches below `container`. The
 * container's OWN entry is not written here — `applyPermissions` writes that, as it always has.
 *
 * Each target keeps every key it had except the ones this cascade maps to (rule 5); its own `cascade`
 * is never read or written (rule 8); a target without an authored id is skipped, since no entry keyed
 * on nothing could ever resolve (rule 7). Pure: never mutates an element or the map passed in.
 */
export function cascadePermissions(
  capabilities: CapabilityMap,
  container: UISchemaElement,
  key: CascadingKey,
  value: boolean,
  scope: CascadeScope,
): CapabilityMap {
  if (scope === 'self') return capabilities;

  const elements: Record<string, Capability> = { ...capabilities.elements };
  const inner = scope === 'descendants';

  const visit = (target: UISchemaElement) => {
    const id = authoredId(target);
    const keys = keysFor(key, target, inner);
    if (id !== undefined && keys.length > 0) {
      const entry: Record<string, unknown> = { ...elements[id] };
      for (const name of keys) entry[name] = value;
      elements[id] = entry as Capability;
    }
    if (inner) childrenOf(target).forEach(visit);
  };
  childrenOf(container).forEach(visit);

  return { ...capabilities, elements };
}
