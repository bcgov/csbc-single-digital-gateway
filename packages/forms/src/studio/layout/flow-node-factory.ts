import { authoredId } from '../../renderers/ui/authored-id';
import type { UISchemaElement } from '@jsonforms/core';
import { FORM_TYPE } from '../../renderers/gridstack/grid-layouts';
import {
  CONDITION_TYPE,
  drawnNodes,
  STAGE_TYPE,
  type FlowNodeKind,
} from '../../renderers/xyflow/flow-elements';
import { freshId } from './element-parts';
import type { TreeElement } from './element-tree';
import { formIdsUsed } from './form-address';

// The Flow nodes an insert creates (doc 196 rules 18, 20; doc 199 rule 24), extracted from `flow-edits.ts`
// (doc 210 rule 24). Pure: a factory of new elements, with no opinion about where they are attached.

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rule 20: `"<label> <n>"`, `n` one more than the highest among `type` elements labelled exactly `"<label> <digits>"`. */
export function nextElementLabel(root: UISchemaElement, type: string, label: string): string {
  const pattern = new RegExp(`^${escapeRegExp(label)} (\\d+)$`);
  let highest = 0;
  const visit = (element: TreeElement) => {
    const text = (element as { label?: unknown }).label;
    const match = element.type === type && typeof text === 'string' ? pattern.exec(text) : null;
    highest = Math.max(highest, Number(match?.[1] ?? 0));
    for (const child of element.elements ?? []) visit(child);
  };
  visit(root as TreeElement);
  return `${label} ${highest + 1}`;
}

/** Doc 199 rule 15: Stages and Conditions share ONE id-space, so a new node id must avoid both. */
/** Doc 219: the Stage + Condition id-space — they share one, so an edge target is unambiguous. */
export const nodeIdsUsed = (root: TreeElement): ReadonlySet<unknown> =>
  new Set(drawnNodes(root).map(({ element }) => authoredId(element)));

/**
 * Rules 18, 20: a fresh `"Stage <n>"` holding one Form, both with ids unused anywhere in `root`.
 *
 * Doc 198 rule 11: no `options.position` is written — where the Stage lands follows from its rank and its place
 * in `elements` (doc 198 rules 1-2).
 */
export function newStageElement(root: TreeElement, newId: () => string): TreeElement {
  return {
    type: STAGE_TYPE,
    label: nextElementLabel(root, STAGE_TYPE, 'Stage'),
    // Doc 219: the authored id is a TOP-LEVEL sibling of `type`. A Stage now writes no `options` at all —
    // the only key it ever held besides the id was `position`, left INERT by doc 198 and never written.
    id: freshId(nodeIdsUsed(root), newId),
    // Doc 197 rule 4: the Stage's Form is addressable from the moment it exists. It is UNTITLED — the Stage card
    // and the canvas both draw "Untitled form" for a Form with no label, which says more to an author than a
    // numbered "Form 3" they did not choose (user request 2026-09-18).
    elements: [
      {
        type: FORM_TYPE,
        id: freshId(formIdsUsed(root), newId),
        elements: [],
      },
    ],
  } as TreeElement;
}

/**
 * Doc 199 rule 24: a fresh `"Condition <n>"`, with an id unused by any node (rule 15). It holds NO children —
 * a Condition is not a Layout — and starts with no criteria, which is a legal pass-through (rule 13); its
 * criteria are authored on the card afterwards, each born complete (rule 26).
 */
export function newConditionElement(root: TreeElement, newId: () => string): TreeElement {
  return {
    type: CONDITION_TYPE,
    label: nextElementLabel(root, CONDITION_TYPE, 'Condition'),
    /**
     * `rows`, NOT `criteria`. Doc 199 rule 35 renamed the key and this seeding site was missed, so every
     * Condition the canvas added was REFUSED by the code panel's apply gate — the studio's own output
     * failing its own gate, exactly the trap doc 205 rule 37b records. `rows` is required, so an empty
     * list is what makes a fresh Condition valid.
     */
    id: freshId(nodeIdsUsed(root), newId),
    options: { rows: [] },
  } as TreeElement;
}

/** The new node of `kind`, so an appended and an inserted node are identical but for their edges. */
export const newNodeElement = (
  root: TreeElement,
  kind: FlowNodeKind,
  newId: () => string,
): TreeElement =>
  kind === 'condition' ? newConditionElement(root, newId) : newStageElement(root, newId);

/** Doc 197 rule 4: a new, untitled Form with a fresh address. */
export const newFormElement = (root: TreeElement, newId: () => string): TreeElement =>
  ({
    type: FORM_TYPE,
    id: freshId(formIdsUsed(root), newId),
    elements: [],
  }) as TreeElement;
