import type { UISchemaElement } from '@jsonforms/core';

// Doc 219 — the authored element id: a `nanoid(8)` carried at the TOP LEVEL of an element, a sibling of
// `type` / `scope` / `options`, stamped on every element so a template capability map (doc 220) has
// something stable to key on. Studio ids (`el-1`, `el-2`…) are per-mount counters and can never be
// persisted (doc 197), which is why an authored id exists at all.
//
// It is top-level and NOT in `options` for three reasons, all from the model's own conventions:
//   1. `options` is renderer-hint territory; structural data is already top-level — `Heading.text`,
//      `RichContent.content`, `PaletteItem.template` and `label` are all siblings of `type`.
//   2. Every OTHER id in the model is already top-level: `FlowEdge.id`, `ConditionRow.id`, `Clause.id`.
//      The element id was the sole exception.
//   3. `options` is the gridstack sink — `GridItemPlacement` is a `Pick<GridStackWidget, …>` read from
//      `child.options.gridItem`, and `GridStackWidget` has its own `id`.
//
// `@jsonforms/core` neither declares nor reads a top-level `uischema.id` (verified 2026-09-24 against
// 3.6.0: `BaseUISchemaElement` is exactly `{ type, rule?, options? }`), so the key is ours to define.
// `types/elements.ts` augments `BaseUISchemaElement` to declare it.
//
// LIVES HERE, not in `studio/layout/`, for the reason doc 202 rules 44-45 moved `schema-properties` and
// doc 199 rule 1 moved `controlKindOf` down: the studio may import DOWN into the shared layer, never the
// reverse — and three of this reader's six call sites are OUTSIDE the studio (`renderers/xyflow/flow-elements.ts`,
// `renderers/xyflow/condition-renderer.tsx`, `runner/runner-position.ts`). Pure: no React, no studio, no nanoid.

/**
 * An element's authored id when it is a NON-EMPTY string, else `undefined`.
 *
 * This is the ONLY reader. It replaces six that each applied this same guard by hand — `authoredFormId`
 * (`form-address.ts`), `authoredStageId` (`renderers/xyflow/flow-elements.ts`), and inline reads in
 * `condition-renderer.tsx`, `condition-edits.ts`, `condition-edit-parts.ts` and `runner/runner-position.ts`.
 * The last of those is in the RUNNER, so this module is read by the fillable runtime too, not only the studio.
 *
 * The runtime check is not redundant with the declared type: an element arrives as authored JSON, so
 * `id` may be any value at all. An empty string is refused because it can neither address an element nor
 * key a capability, and treating it as present would make `''` collide with every other id-less element.
 *
 * NAMED `authoredId`, not `elementId`: `elementId` is a parameter name all over the studio
 * (`removeElement(document, elementId, ids)`, `joinsOnDelete(elementId)`, `GridEditor.accepts(…, { elementId })`),
 * and a function of that name is SHADOWED by the parameter at exactly the call sites that need it — which
 * typechecks as "Type 'String' has no call signatures" only because the parameter is a string. It also reads
 * correctly alongside `authoredIdsUsed`: this is the AUTHORED id, as opposed to the per-mount studio id.
 *
 * `options.id` is NOT a fallback — doc 219 removed it outright and stored content was regenerated rather
 * than migrated, so reading it here would resurrect a shape the metaschema now refuses.
 */
export function authoredId(element: UISchemaElement): string | undefined {
  const id: unknown = element.id;
  return typeof id === 'string' && id !== '' ? id : undefined;
}
