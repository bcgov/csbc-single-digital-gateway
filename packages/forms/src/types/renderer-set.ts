import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
} from '@jsonforms/core';

/**
 * The shape every `@repo/forms/renderers/*` module exports (doc 180), as four named arrays.
 *
 * A consumer hands JSONForms `cells={cells}` and
 * `renderers={[...controlRenderers, ...displayRenderers, ...layoutRenderers]}`. Composite sets
 * spread their sources category by category. JSONForms picks the highest-ranked tester and, on a
 * tie, the FIRST entry — so a set must never hold two entries that tie on the same element.
 */
export interface RendererSet {
  /** Cell renderers. */
  cells: JsonFormsCellRendererRegistryEntry[];
  /** Renderers for `Control` elements. */
  controlRenderers: JsonFormsRendererRegistryEntry[];
  /** Read-only / presentational elements, e.g. `Heading`. */
  displayRenderers: JsonFormsRendererRegistryEntry[];
  /** Containers, e.g. `Grid`. */
  layoutRenderers: JsonFormsRendererRegistryEntry[];
}
