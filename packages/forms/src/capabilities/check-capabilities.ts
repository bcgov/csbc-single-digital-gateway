import type { UISchemaElement } from '@jsonforms/core';
import { authoredId } from '../renderers/ui/authored-id';
import { inspectorContext } from '../studio/inspector/inspector-context';
import { INSPECTOR_FIELDS } from '../studio/inspector/inspector-fields';
import type { EditableDocument } from '../studio/layout/schema-properties';
import { AUTHORED_ELEMENT_IDS } from './authored-element-ids';
import { capabilityFor, mayEdit } from './capability-for';
import { mayAddTo, mayChangeEdges, mayMove, mayRemove } from './capability-gates';
import type { CapabilityMap } from './capability-types';
import { placeAll, placeByAuthoredId, sameValue, type PlacedElement } from './document-index';

// Doc 222 — the enforcement the studio's gates only advertise.
//
// The studio's Monaco uischema panel writes raw JSON, and the API accepts whatever a client sends,
// so every gate doc 221 installed is bypassable. This is the one function both ask before accepting
// a save.
//
// The diff base is the document's PREVIOUS version, never the template. Every verb in the language
// is an ACTION — add, remove, move, edit — and an action is a delta, so the question asked is exactly
// "what is this owner doing right now, and may they?". On the FIRST save the previous version IS the
// template copy, so the template comparison happens for free rather than as a special case.

export type ViolationCode = 'edit' | 'remove' | 'move' | 'add' | 'edges' | 'dangling';

/**
 * `refused` blocks the save. `dangling` is a diagnostic the studio surfaces and the API ignores.
 *
 * A capability keyed on an element that exists in NEITHER document must not block: once an owner
 * legitimately removes an element they were allowed to remove, that id is absent from both sides for
 * ever, and refusing on it would permanently wedge the document.
 */
export type ViolationSeverity = 'refused' | 'dangling';

export interface Violation {
  readonly code: ViolationCode;
  readonly severity: ViolationSeverity;
  /** The authored id of the element at fault, or `undefined` for an id-less new element. */
  readonly elementId: string | undefined;
  /** The `InspectorField` key, for an `edit` violation only. */
  readonly field?: string;
  readonly message: string;
}

type TreeElement = UISchemaElement & { elements?: UISchemaElement[] };

const describe = (element: UISchemaElement): string => {
  const id = authoredId(element);
  return id === undefined ? element.type : `${element.type} ${id}`;
};

/** Which fields the inspector would offer for this element, in EITHER version. */
function comparableFields(previous: EditableDocument, submitted: EditableDocument, id: string) {
  const before = inspectorContext(previous, id, AUTHORED_ELEMENT_IDS);
  const after = inspectorContext(submitted, id, AUTHORED_ELEMENT_IDS);
  if (before === undefined || after === undefined) return undefined;
  // The union, not the intersection: a field that stops applying (a Control rebound to a different
  // property type) still had its value changed, and dropping it would let that change through.
  const fields = INSPECTOR_FIELDS.filter((field) => field.applies(before) || field.applies(after));
  return { before, after, fields };
}

/**
 * Every way `submitted` departs from `previous` that `capabilities` does not permit.
 *
 * An EMPTY array means the save is allowed. An ungoverned document (`capabilities` undefined) always
 * returns empty — `capabilityFor` resolves an absent map to `FULLY_GRANTED`, so there is no
 * "is this governed?" branch anywhere below.
 */
export function checkCapabilities(
  previous: EditableDocument,
  submitted: EditableDocument,
  capabilities: CapabilityMap | undefined,
): Violation[] {
  if (capabilities === undefined) return [];

  const violations: Violation[] = [];
  const before = placeByAuthoredId(previous.uischema as TreeElement);
  const after = placeByAuthoredId(submitted.uischema as TreeElement);

  // ---- removed, moved and edited -------------------------------------------------------------
  for (const [id, was] of before) {
    const now = after.get(id);

    if (now === undefined) {
      if (!mayRemove(capabilities, was.element, was.parent))
        violations.push({
          code: 'remove',
          severity: 'refused',
          elementId: id,
          message: `${describe(was.element)} may not be removed.`,
        });
      continue;
    }

    checkPlacement(capabilities, id, was, now, violations);
    checkEdits(previous, submitted, capabilities, id, violations);
  }

  // ---- added ----------------------------------------------------------------------------------
  for (const placed of placeAll(submitted.uischema as TreeElement)) {
    const id = authoredId(placed.element);
    // An element the previous version already had is not an add. An element with NO authored id is
    // always new: doc 219 stamps one on every element the studio inserts, so an id-less element came
    // from hand-written JSON.
    if (id !== undefined && before.has(id)) continue;
    if (placed.parent === undefined) continue; // the root; a replaced root is reported as a remove

    if (!mayAddTo(capabilities, placed.parent))
      violations.push({
        code: 'add',
        severity: 'refused',
        elementId: id,
        message: `${describe(placed.element)} may not be added to ${describe(placed.parent)}.`,
      });
  }

  // ---- Flow edges ------------------------------------------------------------------------------
  checkEdges(capabilities, before, after, violations);

  // ---- dangling capability entries --------------------------------------------------------------
  for (const id of Object.keys(capabilities.elements ?? {}))
    if (!before.has(id) && !after.has(id))
      violations.push({
        code: 'dangling',
        severity: 'dangling',
        elementId: id,
        message: `The template grants capabilities to ${id}, which this document does not contain.`,
      });

  return violations;
}

/** A changed parent, or a changed position under the same parent, is a move. */
function checkPlacement(
  capabilities: CapabilityMap,
  id: string,
  was: PlacedElement,
  now: PlacedElement,
  violations: Violation[],
): void {
  const from = was.parent;
  const to = now.parent;
  if (from === undefined || to === undefined) return; // the root is not inside anything

  // Parents are paired by AUTHORED id, the only identity that survives storage — the two documents
  // share no object identity at all. When either parent is id-less they cannot be paired, so only a
  // changed index is treated as a move; that is the conservative reading, since claiming a move
  // between two containers we cannot tell apart would refuse an edit that never happened.
  const fromId = authoredId(from);
  const toId = authoredId(to);
  const sameParent = fromId === undefined || toId === undefined ? true : fromId === toId;
  if (sameParent && was.index === now.index) return;

  // `mayMove` asks all three permissions: the element's own `move`, the source's `reorderChildren`
  // (taking it out rearranges what is left) and the target's `addChildren`. Within one layout it
  // asks the same layout twice, which is correct — reordering inside a frozen layout is reordering.
  if (!mayMove(capabilities, now.element, from, to))
    violations.push({
      code: 'move',
      severity: 'refused',
      elementId: id,
      message: sameParent
        ? `${describe(now.element)} may not be reordered within ${describe(to)}.`
        : `${describe(now.element)} may not be moved into ${describe(to)}.`,
    });
}

/** Each inspector field whose value changed must be named by `edit`. */
function checkEdits(
  previous: EditableDocument,
  submitted: EditableDocument,
  capabilities: CapabilityMap,
  id: string,
  violations: Violation[],
): void {
  const comparable = comparableFields(previous, submitted, id);
  if (comparable === undefined) return;

  const capability = capabilityFor(capabilities, comparable.after.element);
  for (const field of comparable.fields) {
    if (sameValue(field.read(comparable.before), field.read(comparable.after))) continue;
    if (mayEdit(capability, field.key)) continue;
    violations.push({
      code: 'edit',
      severity: 'refused',
      elementId: id,
      field: field.key,
      message: `${field.label} of ${describe(comparable.after.element)} may not be changed.`,
    });
  }
}

/** A Flow's `options.edges` may only change under `edges`. */
function checkEdges(
  capabilities: CapabilityMap,
  before: Map<string, PlacedElement>,
  after: Map<string, PlacedElement>,
  violations: Violation[],
): void {
  const edgesOf = (element: UISchemaElement | undefined): unknown =>
    (element?.options as Record<string, unknown> | undefined)?.['edges'];

  for (const [id, was] of before) {
    if (was.element.type !== 'Flow') continue;
    const now = after.get(id);
    if (now === undefined) continue; // already reported as a remove
    if (sameValue(edgesOf(was.element), edgesOf(now.element))) continue;
    if (mayChangeEdges(capabilities, now.element)) continue;
    violations.push({
      code: 'edges',
      severity: 'refused',
      elementId: id,
      message: `The stages of ${describe(now.element)} may not be reconnected.`,
    });
  }
}
