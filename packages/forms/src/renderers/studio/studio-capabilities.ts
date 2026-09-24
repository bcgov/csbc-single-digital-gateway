import type { UISchemaElement } from '@jsonforms/core';
import { createContext, useContext, useMemo } from 'react';
import { capabilityFor } from '../../capabilities/capability-for';
import type { CapabilityMap, ResolvedCapability } from '../../capabilities/capability-types';

// Doc 221 — the port through which a host tells the studio what a GOVERNING template permits.
//
// Shaped like `StudioSelection`, `GridEditor`, `FlowEditor` and `TabsEditor`, including the default:
// WITHOUT A PROVIDER EVERY ELEMENT IS UNGOVERNED, as those give "without a provider, view-only". That
// default is what keeps an untemplated document — and `/admin/studio` — behaving exactly as before.
//
// This is deliberately NOT `StudioDocument.capabilities`. That half is the map being AUTHORED on a
// template (doc 220); a GOVERNING map emitted there would be reported by `onDocumentChange` as part
// of the document being edited, and any host that persists what it reports would write the
// template's capabilities into the derived document. The two are different things travelling in
// different directions, so they travel by different channels.
//
// Kept in a module with no components, like `grid-editor.ts`, so components using it stay
// Fast Refresh-able.
const CapabilityContext = createContext<CapabilityMap | null>(null);

export const CapabilityProvider = CapabilityContext.Provider;

/**
 * The governing capability map, or `null` outside a governed document.
 *
 * Prefer {@link useCapability} — a gate wants to know what THIS element permits, and reaching into
 * the map directly would skip `capabilityFor`'s `'*'` → type → element merge and its closed baseline.
 */
export function useCapabilities(): CapabilityMap | null {
  return useContext(CapabilityContext);
}

/**
 * What the governing template permits for `element` — every key resolved, so no caller guesses.
 *
 * With no provider this is `FULLY_GRANTED`: `capabilityFor(undefined, …)` already returns it, so
 * "ungoverned" needs no branch at any call site. That is the property that makes threading this
 * through nine gates safe — a gate reads a capability and acts on it, and the ungoverned case falls
 * out of the same code path rather than being a condition each gate has to remember.
 */
export function useCapability(element: UISchemaElement): ResolvedCapability {
  const capabilities = useCapabilities();
  return useMemo(() => capabilityFor(capabilities ?? undefined, element), [capabilities, element]);
}

/**
 * Whether an element grants NOTHING at all — the test for making it unselectable (doc 221 rule 3).
 *
 * Selectability is DERIVED, not a stored flag: an element whose label is editable but whose
 * validation is frozen must stay selectable with a reduced inspector, and only one that permits no
 * action whatsoever should refuse selection entirely.
 */
export function grantsNothing(capability: ResolvedCapability): boolean {
  // An EMPTY list means the same as 'none' — no field may be changed. Treating only the literal
  // 'none' as nothing would leave `edit: []` selectable with an empty inspector, which reads as a
  // bug rather than as a locked element.
  const editsNothing =
    capability.edit === 'none' || (Array.isArray(capability.edit) && capability.edit.length === 0);
  return (
    editsNothing &&
    !capability.remove &&
    !capability.move &&
    !capability.addChildren &&
    !capability.removeChildren &&
    !capability.reorderChildren &&
    !capability.edges
  );
}
