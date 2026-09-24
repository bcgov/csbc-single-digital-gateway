/**
 * Doc 220 — the template capability language: what a consuming document's owner may do to an element
 * of a document built from a template.
 *
 * Authored ONLY on a template version's `content.capabilities`, and NEVER copied into a derived
 * document — the studio reads it from the pinned template version (doc 217's `template_version_id`).
 */

/**
 * Which of an element's settings may be changed: every one, none, or a named list of
 * `InspectorField['key']` values (`'label'`, `'gap'`, `'columns'`…).
 *
 * The keys are the inspector's own, deliberately: `INSPECTOR_FIELDS` is already a flat, stably-keyed
 * list, so "which properties" needs no parallel naming scheme that could drift from the fields the
 * author actually sees.
 */
export type EditCapability = 'all' | 'none' | readonly string[];

/**
 * What may be done to ONE element and to its contents.
 *
 * FLAT, with the container verbs named for children. An entry is keyed by a single element id and
 * has to carry both meanings at once — "may this element be deleted" and "may this element's
 * children be deleted" — which collide on the word `remove`. Naming the container verbs
 * `addChildren` / `removeChildren` / `reorderChildren` keeps the resolution merge exactly ONE level
 * deep, which is what makes "each level overrides only the keys it names" true and testable as a
 * truth table. Nesting them under a `contents` object would read better but would need a
 * two-level merge, and three-level precedence is already where this codebase's subtle bugs live.
 *
 * The inspector still presents them as two labelled groups — "This element" and "Its contents".
 *
 * Every key is OPTIONAL: an entry states only what it changes, and everything it omits is inherited
 * from the level below it (see `capabilityFor`).
 */
export interface Capability {
  /** This element: which of its settings may be changed. */
  readonly edit?: EditCapability;
  /** This element: may it be deleted. Overrides what its container granted. */
  readonly remove?: boolean;
  /** This element: may it be moved out of, or within, its container. */
  readonly move?: boolean;
  /** Its contents: may new children be inserted. */
  readonly addChildren?: boolean;
  /** Its contents: may template-origin children be deleted. */
  readonly removeChildren?: boolean;
  /** Its contents: may children be reordered or resized. */
  readonly reorderChildren?: boolean;
  /** A Flow only: may its Stages be connected, disconnected or re-pointed. */
  readonly edges?: boolean;
}

/** A `Capability` with every key resolved — what `capabilityFor` returns, so no caller guesses. */
export type ResolvedCapability = Required<Capability>;

/**
 * The map stored on a template version.
 *
 * `default` is keyed by element TYPE (`'Control'`, `'Section'`…) plus the `'*'` baseline; `elements`
 * by an element's AUTHORED id (doc 219). Type keys rather than coarser groups because type strings
 * are already the vocabulary everywhere — the metaschema enum, `KIND_BY_TYPE`, every tester — so
 * there is no second taxonomy to keep in sync.
 *
 * A per-type entry is a RULE, not a snapshot: it still governs elements added to the template later,
 * which a bulk-applied set of per-element entries would not.
 */
export interface CapabilityMap {
  readonly default?: Readonly<Record<string, Capability>>;
  readonly elements?: Readonly<Record<string, Capability>>;
}

/** The `default` key that applies to every type with no entry of its own. */
export const WILDCARD_TYPE = '*';

/**
 * What an element is granted when NOTHING governs it: everything.
 *
 * This is what makes "a template with no `capabilities` key governs nothing" true, and it is why a
 * per-type `default` must carry a `'*'` entry — without one, a type the author forgot to list would
 * fall through to this and fail OPEN, which is the wrong default for a governance feature.
 *
 * Frozen and `readonly` per the project's immutability rule: it is a shared constant that must never
 * be mutated by a caller building a merged result.
 */
export const FULLY_GRANTED: ResolvedCapability = Object.freeze({
  edit: 'all',
  remove: true,
  move: true,
  addChildren: true,
  removeChildren: true,
  reorderChildren: true,
  edges: true,
} as const);
