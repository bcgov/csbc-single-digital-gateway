import type { Uischema } from '../document-types';
import { idOf } from '../element-ids';
import type { Capability, CapabilityMap, CascadeScope } from './capability-types';

// Doc 258 rule 8 (Forms doc 231): a contents toggle cascades COPY ON WRITE — explicit entries on what its scope
// reaches. Nothing inherits on resolve, so an element added later has no entry and stays granted.

/** The contents toggles that cascade; `edges` never does. */
export type CascadingKey = 'addChildren' | 'removeChildren' | 'reorderChildren';

export const CASCADING_KEYS: readonly CascadingKey[] = Object.freeze([
  'addChildren',
  'removeChildren',
  'reorderChildren',
] as const);

/** What an absent `cascade` reads as. */
export const DEFAULT_CASCADE: CascadeScope = 'descendants';

/** The key a contents toggle governs on the child ITSELF; `addChildren` has none (a child is never "added"). */
const COUNTERPART: Readonly<Record<CascadingKey, 'remove' | 'move' | undefined>> = Object.freeze({
  addChildren: undefined,
  removeChildren: 'remove',
  reorderChildren: 'move',
});

const childrenOf = (element: Uischema): Uischema[] => {
  const elements = element['elements'];
  return Array.isArray(elements)
    ? elements.filter((child): child is Uischema => typeof child === 'object' && child !== null)
    : [];
};

export const holdsChildren = (element: Uischema): boolean => Array.isArray(element['elements']);

/**
 * The keys `key` writes on one target. Only when the scope continues BELOW it (`inner`) does a child container also
 * take the contents key for remove / move — `mayRemove` asks the parent, so it would otherwise reach a level too far.
 */
function keysFor(key: CascadingKey, target: Uischema, inner: boolean): (keyof Capability)[] {
  const counterpart = COUNTERPART[key];
  const keys: (keyof Capability)[] = counterpart === undefined ? [] : [counterpart];
  if (holdsChildren(target) && (inner || counterpart === undefined)) keys.push(key);
  return keys;
}

/**
 * `capabilities` with `key = value` written onto what `scope` reaches below `container` (never the container's own
 * entry). Targets keep every other key and their own `cascade`; a target without an id is skipped. Pure.
 */
export function cascadeCapabilities(
  capabilities: CapabilityMap,
  container: Uischema,
  key: CascadingKey,
  value: boolean,
  scope: CascadeScope,
): CapabilityMap {
  if (scope === 'self') return capabilities;
  const elements: Record<string, Capability> = { ...capabilities.elements };
  const inner = scope === 'descendants';
  const visit = (target: Uischema) => {
    const id = idOf(target);
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
