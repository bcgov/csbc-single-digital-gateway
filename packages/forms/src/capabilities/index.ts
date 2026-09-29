// Doc 220 — the template capability language: what a consuming document's owner may do.
//
// Authored only on a TEMPLATE version's `content.capabilities` and never copied into a derived
// document. This module is storage + resolution only; the studio gates (doc 221) and the server-side
// validator (doc 222) both read it through `capabilityFor`.

export { acceptsChildrenAnywhere } from './accepts-children';
export { capabilityFor, mayEdit } from './capability-for';
// Re-exported so a caller at an untyped boundary (platform-api's jsonb `content`) can name the
// shape `checkCapabilities` takes without importing a studio internal.
export type { EditableDocument } from '../studio/layout/schema-properties';
export {
  checkCapabilities,
  type Violation,
  type ViolationCode,
  type ViolationSeverity,
} from './check-capabilities';
export { mayAddTo, mayChangeEdges, mayMove, mayRemove } from './capability-gates';
export {
  FULLY_GRANTED,
  WILDCARD_TYPE,
  type Capability,
  type CapabilityMap,
  type CascadeScope,
  type EditCapability,
  type ResolvedCapability,
} from './capability-types';
