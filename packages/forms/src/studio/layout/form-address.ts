import type { UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import { STAGE_TYPE } from '../../renderers/xyflow/flow-elements';
import { authoredId } from '../../renderers/ui/authored-id';
import type { ElementIds } from './element-ids';
import { findById, type TreeElement } from './element-tree';

// Doc 197 rules 1-3 — a Form's address: the authored id that names it outside this session. Studio ids
// (`el-1`, `el-2`…) are per-mount counters, so only an authored id can appear in a URL. Pure: no React, no router.
//
// Doc 219: the id moved to the element's TOP LEVEL and the local `authoredFormId` is gone — every read here goes
// through the one shared `authoredId()`. The type filters below stay, and that is the point: carrying an id is
// UNIVERSAL, being ADDRESSABLE is not. Every element has an id so a capability can name it (doc 220); only a
// Form, Stage or Condition may be addressed by an edge or a focus address.

/** Every element at or below `root`, depth-first in document order. */
function* walk(root: TreeElement): Generator<TreeElement> {
  yield root;
  for (const child of root.elements ?? []) yield* walk(child as TreeElement);
}

/** Rule 2: every address already used by a Form in the document — what a new id must not collide with. */
export function formIdsUsed(root: UISchemaElement): Set<string> {
  const used = new Set<string>();
  for (const element of walk(root as TreeElement)) {
    if (element.type !== FORM_TYPE) continue;
    const id = authoredId(element);
    if (id !== undefined) used.add(id);
  }
  return used;
}

/**
 * Rule 19: every authored id a Stage or a Form already uses, in one set. Stage ids and Form addresses are read in
 * different places, so a copy regenerates against the union and can collide with neither.
 *
 * Doc 219 rule 5: this is the ADDRESSABLE id-space, not "every id in the document". A Tab, a TabContent and every
 * layout now carry an id too, but nothing addresses them — including them here would make a copy regenerate
 * against ids no edge or focus address can ever name.
 */
export function authoredIdsUsed(root: UISchemaElement): Set<string> {
  const used = new Set<string>();
  for (const element of walk(root as TreeElement)) {
    if (element.type !== FORM_TYPE && element.type !== STAGE_TYPE) continue;
    const id = authoredId(element);
    if (id !== undefined) used.add(id);
  }
  return used;
}

/**
 * Doc 219 rule 8: EVERY authored id in the document, whatever the element type — the set a copy must regenerate
 * against, and the set seed normalisation stamps against.
 *
 * Deliberately distinct from `authoredIdsUsed`, which is the ADDRESSABLE space (Form + Stage). Copy and
 * normalisation care about a wider property: a capability entry (doc 220) is keyed by element id, so two
 * elements sharing one id would both match a single entry no matter what types they are. Uniqueness therefore
 * has to hold across the whole document, not just across the things an edge can name.
 */
export function allIdsUsed(root: UISchemaElement): Set<string> {
  const used = new Set<string>();
  for (const element of walk(root as TreeElement)) {
    const id = authoredId(element);
    if (id !== undefined) used.add(id);
  }
  return used;
}

/**
 * Rule 2: the address of the Form with `studioId`, or `null` — for an unknown id, an element that is not a Form, or a
 * Form authored without one (rule 10: the studio never invents an address).
 */
export function addressOf(
  root: UISchemaElement,
  studioId: string | null,
  ids: ElementIds,
): string | null {
  if (studioId === null) return null;
  const element = findById(root as TreeElement, studioId, ids);
  if (element?.type !== FORM_TYPE) return null;
  return authoredId(element) ?? null;
}

/**
 * Rules 2-3: the studio id of the Form `formId` addresses, or `null`. Only a Flow root is addressable — a Form root is
 * the whole document, never a drilled-in Form. Duplicate addresses resolve to the first Form in document order, as
 * duplicate Stage ids do in `drawnStages`.
 */
export function resolveAddress(
  root: UISchemaElement,
  formId: string | null,
  ids: ElementIds,
): string | null {
  if (formId === null || formId === '' || root.type !== FLOW_TYPE) return null;
  for (const element of walk(root as TreeElement)) {
    if (element.type === FORM_TYPE && authoredId(element) === formId) return ids.idOf(element);
  }
  return null;
}
