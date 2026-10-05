import type { Uischema } from '../document-types';
import { idOf } from '../element-ids';
import {
  FULLY_GRANTED,
  WILDCARD_TYPE,
  type Capability,
  type CapabilityMap,
  type ResolvedCapability,
} from './capability-types';

/** Only the keys a level states: `null` / `undefined` never override the level below, and `cascade` is not a rule. */
function stated(level: Capability | undefined): Partial<ResolvedCapability> {
  if (level === undefined) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(level)) {
    if (key !== 'cascade' && value !== undefined && value !== null) out[key] = value;
  }
  return out as Partial<ResolvedCapability>;
}

/**
 * What governs `element`: `FULLY_GRANTED` → `default['*']` → `default[type]` → `elements[id]`, each level overriding
 * only the keys it states. The ONE resolver — nothing reads `elements[id]` to decide what is allowed.
 */
export function capabilityFor(
  capabilities: CapabilityMap | undefined,
  element: Uischema,
): ResolvedCapability {
  const id = idOf(element);
  const type = element['type'];
  return {
    ...FULLY_GRANTED,
    ...stated(capabilities?.default?.[WILDCARD_TYPE]),
    ...stated(typeof type === 'string' ? capabilities?.default?.[type] : undefined),
    ...stated(id === undefined ? undefined : capabilities?.elements?.[id]),
  };
}

/** Whether the inspector field `key` may be changed under `capability`. */
export function mayEdit(capability: ResolvedCapability, key: string): boolean {
  const { edit } = capability;
  if (edit === 'all') return true;
  if (edit === 'none') return false;
  return edit.includes(key);
}

/** Whether a new child may be added to `container`. */
export const mayAddTo = (capabilities: CapabilityMap | undefined, container: Uischema): boolean =>
  capabilityFor(capabilities, container).addChildren;

/** Whether `element` may leave `from` for `to`: its own `move`, the source's reorder, the target's add. */
export function mayMove(
  capabilities: CapabilityMap | undefined,
  element: Uischema,
  from: Uischema,
  to: Uischema,
): boolean {
  return (
    capabilityFor(capabilities, element).move &&
    capabilityFor(capabilities, from).reorderChildren &&
    capabilityFor(capabilities, to).addChildren
  );
}

/** Whether `element` may be deleted from `parent`: its own `remove`, then the parent's `removeChildren`. */
export function mayRemove(
  capabilities: CapabilityMap | undefined,
  element: Uischema,
  parent: Uischema | undefined,
): boolean {
  if (!capabilityFor(capabilities, element).remove) return false;
  return parent === undefined || capabilityFor(capabilities, parent).removeChildren;
}

/** Whether a Funnel's connections (edges, Conditions) may change. */
export const mayChangeEdges = (
  capabilities: CapabilityMap | undefined,
  funnel: Uischema,
): boolean => capabilityFor(capabilities, funnel).edges;
