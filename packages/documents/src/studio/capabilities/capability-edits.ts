import type { DocumentContent } from '../document-types';
import type { Capability, CapabilityMap } from './capability-types';

// Doc 258 rules 11-12: keeping `content.capabilities` in step with element deletes and copies.

/** `content` with `capabilities` set — the key removed entirely when the map is absent or holds nothing. */
export function withCapabilities(
  content: DocumentContent,
  capabilities: CapabilityMap | undefined,
): DocumentContent {
  const { capabilities: _previous, ...rest } = content;
  const empty =
    capabilities === undefined ||
    (Object.keys(capabilities.elements ?? {}).length === 0 &&
      Object.keys(capabilities.default ?? {}).length === 0);
  return empty ? rest : { ...rest, capabilities };
}

/** Rule 11: `capabilities` without the entries of `ids`; the SAME map when none of them had one. */
export function withoutEntries(
  capabilities: CapabilityMap | undefined,
  ids: readonly string[],
): CapabilityMap | undefined {
  const elements = capabilities?.elements;
  if (elements === undefined || !ids.some((id) => Object.hasOwn(elements, id))) return capabilities;
  const kept = Object.fromEntries(Object.entries(elements).filter(([id]) => !ids.includes(id)));
  const { elements: _removed, ...rest } = capabilities as CapabilityMap;
  return Object.keys(kept).length === 0 ? rest : { ...rest, elements: kept };
}

/** Rule 12: `capabilities` with each `old → new` id pair's entry copied to the new id; the SAME map when none had one. */
export function carriedEntries(
  capabilities: CapabilityMap | undefined,
  pairs: ReadonlyMap<string, string>,
): CapabilityMap | undefined {
  const elements = capabilities?.elements;
  if (elements === undefined) return capabilities;
  const carried: [string, Capability][] = [...pairs]
    .filter(([old]) => Object.hasOwn(elements, old))
    .map(([old, fresh]) => [fresh, structuredClone(elements[old]!)]);
  return carried.length === 0
    ? capabilities
    : { ...capabilities, elements: { ...elements, ...Object.fromEntries(carried) } };
}
