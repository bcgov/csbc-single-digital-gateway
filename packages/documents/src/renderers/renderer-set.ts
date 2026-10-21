import type {
  JsonFormsCellRendererRegistryEntry,
  JsonFormsRendererRegistryEntry,
} from '@jsonforms/core';

/**
 * Every `renderers/*` module exports these four categories (doc 236 rule 1): table `cells` (no Field wrapper),
 * `contentRenderers` that display content, `controlRenderers` for fields that accept data, and `layoutRenderers`.
 * An empty category is an empty array, never absent.
 */
export interface RendererSet {
  cells: JsonFormsCellRendererRegistryEntry[];
  contentRenderers: JsonFormsRendererRegistryEntry[];
  controlRenderers: JsonFormsRendererRegistryEntry[];
  layoutRenderers: JsonFormsRendererRegistryEntry[];
}

/** A set's three renderer categories as the one list `<JsonForms renderers>` takes. */
export function renderersOf(set: RendererSet): JsonFormsRendererRegistryEntry[] {
  return [...set.contentRenderers, ...set.controlRenderers, ...set.layoutRenderers];
}
