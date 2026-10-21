// Doc 258 — the template capability language, ported from `@repo/forms` (Forms docs 220, 231) and free to diverge:
// what an implementation built from a TEMPLATE may change. Authored on the template's `content.capabilities`;
// read only through `capabilityFor`.

/** Which of an element's inspector settings an implementation may change: every one, none, or these field keys. */
export type EditCapability = 'all' | 'none' | string[];

/** How far a change to a contents toggle reaches (Forms doc 231). */
export type CascadeScope = 'descendants' | 'children' | 'self';

/** One element's rules. Every key is optional: an absent key is granted. */
export interface Capability {
  edit?: EditCapability;
  remove?: boolean;
  move?: boolean;
  addChildren?: boolean;
  removeChildren?: boolean;
  reorderChildren?: boolean;
  /** A Funnel's connections — its edges and Conditions. Never cascades. */
  edges?: boolean;
  /** An authoring hint for the cascade, never a capability: `capabilityFor` drops it. */
  cascade?: CascadeScope;
}

/** Every capability resolved — what a reader gets from `capabilityFor`. */
export type ResolvedCapability = Required<Omit<Capability, 'cascade'>>;

/** The map a template stores: per-type defaults (`'*'` for every type) and per-element entries by element id. */
export interface CapabilityMap {
  default?: Record<string, Capability>;
  elements?: Record<string, Capability>;
}

/** The `default` key that applies to every element type. */
export const WILDCARD_TYPE = '*';

/** No map, no entry, no key: everything is allowed — an element the template never saw is the implementation's own. */
export const FULLY_GRANTED: Readonly<ResolvedCapability> = Object.freeze({
  edit: 'all',
  remove: true,
  move: true,
  addChildren: true,
  removeChildren: true,
  reorderChildren: true,
  edges: true,
});
