import type { UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import { FLOW_TYPE } from '../../renderers/xyflow/flow-elements';
import { STAGE_TYPE } from '../../renderers/xyflow/flow-elements';
import type { ElementIds } from './element-ids';
import { findById, type TreeElement } from './element-tree';

// Doc 197 rules 1-3 — a Form's address: the authored `options.id` that names it outside this session. Studio ids
// (`el-1`, `el-2`…) are per-mount counters, so only an authored id can appear in a URL. Pure: no React, no router.

/** Rule 1: a Form's `options.id` when it is a non-empty string, else `undefined` — shaped like `authoredStageId`. */
export function authoredFormId(form: UISchemaElement): string | undefined {
  const id = form.options?.['id'];
  return typeof id === 'string' && id !== '' ? id : undefined;
}

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
    const id = authoredFormId(element);
    if (id !== undefined) used.add(id);
  }
  return used;
}

/**
 * Rule 19: every authored id a Stage or a Form already uses, in one set. Stage ids and Form addresses are read in
 * different places, so a copy regenerates against the union and can collide with neither.
 */
export function authoredIdsUsed(root: UISchemaElement): Set<string> {
  const used = new Set<string>();
  for (const element of walk(root as TreeElement)) {
    if (element.type !== FORM_TYPE && element.type !== STAGE_TYPE) continue;
    const id = authoredFormId(element);
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
  return authoredFormId(element) ?? null;
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
    if (element.type === FORM_TYPE && authoredFormId(element) === formId) return ids.idOf(element);
  }
  return null;
}
