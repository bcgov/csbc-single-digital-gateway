import type { UISchemaElement } from '@jsonforms/core';
import { authoredId } from '../renderers/ui/authored-id';
import {
  FULLY_GRANTED,
  WILDCARD_TYPE,
  type Capability,
  type CapabilityMap,
  type ResolvedCapability,
} from './capability-types';

// Doc 220 — resolving which capability governs an element. Pure: no React, no studio, no document
// mutation. This module is the ONLY resolver; reading `capabilities.elements[id]` directly skips the
// merge chain and the closed baseline, and would silently grant more than the author wrote.

/**
 * Only the keys this level actually states.
 *
 * A capability arrives as authored JSON, so a key may be present with a `null` or `undefined` value
 * — spreading that would OVERRIDE the level below with nothing, which is the opposite of "an entry
 * states only what it changes". `exactOptionalPropertyTypes` rules that out in TypeScript but not at
 * runtime, and the API validates the map only from doc 220 onward, so old or hand-edited content can
 * still carry one.
 */
function stated(level: Capability | undefined): Partial<ResolvedCapability> {
  if (!level) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(level)) {
    // Doc 231: `cascade` is an authoring hint, not a capability, so it never reaches a resolved result.
    if (key === 'cascade') continue;
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out as Partial<ResolvedCapability>;
}

/**
 * What `element` is governed by, resolving the three levels most-general first:
 *
 * ```
 * FULLY_GRANTED  →  default['*']  →  default[element.type]  →  elements[authoredId(element)]
 * ```
 *
 * Each level overrides only the keys it states, so a type entry naming just `edit` leaves the
 * baseline's `remove` untouched. With no map at all — or an element the map has never heard of —
 * the result is `FULLY_GRANTED`: an element whose id the template has never seen is the owner's own
 * (the provenance rule), and a template with no map governs nothing.
 *
 * Takes the ELEMENT, not an id, because resolution needs its `type`. The id is read through
 * `authoredId()` and never `element.id` — doc 219's contract: the direct read skips the
 * non-empty-string guard, and an entry keyed `''` must never match an element that simply has no id.
 */
export function capabilityFor(
  capabilities: CapabilityMap | undefined,
  element: UISchemaElement,
): ResolvedCapability {
  const defaults = capabilities?.default;
  const id = authoredId(element);
  const forElement = id === undefined ? undefined : capabilities?.elements?.[id];

  return {
    ...FULLY_GRANTED,
    ...stated(defaults?.[WILDCARD_TYPE]),
    ...stated(defaults?.[element.type]),
    ...stated(forElement),
  };
}

/**
 * Whether the inspector field `key` may be changed on this element — the one place `edit`'s three
 * shapes are interpreted, so no caller has to handle `'all'` and a list separately.
 */
export function mayEdit(capability: ResolvedCapability, key: string): boolean {
  const { edit } = capability;
  if (edit === 'all') return true;
  if (edit === 'none') return false;
  return edit.includes(key);
}
