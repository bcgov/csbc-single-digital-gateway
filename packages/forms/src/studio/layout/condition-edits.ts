import type { UISchemaElement } from '@jsonforms/core';
import {
  criterionProblems,
  needsValue,
  operatorsFor,
  type CriterionField,
} from '../../renderers/xyflow/criteria';
import { criteriaOf, isCondition } from '../../renderers/xyflow/flow-elements';
import type { Criterion, Operator } from '../../types/elements';
import type { ElementIds } from './element-ids';
import { findById, updateById, type TreeElement } from './element-tree';
import type { StudioDocument } from './schema-properties';
import { upstreamFieldsOf } from './upstream-fields';

// Criterion edits on a Condition (doc 199 rules 25-28). Pure: every changed element is a new object carrying its
// studio id, untouched subtrees keep identity, and a refused edit returns the SAME document object.
//
// These take a StudioDocument rather than a uischema, unlike the Flow edits in `flow-edits.ts`: a criterion is
// only ever authored complete (rule 26), and deciding what "complete" means needs the schema.

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `element` with `options` merged with `changes`, carrying its id. */
function withOptions(
  element: TreeElement,
  changes: Record<string, unknown>,
  ids: ElementIds,
): TreeElement {
  const next = { ...element, options: { ...element.options, ...changes } };
  ids.carry(element, next);
  return next;
}

/** A new id from `newId`, regenerated while `taken` has it. */
function freshId(taken: ReadonlySet<string>, newId: () => string): string {
  let id = newId();
  while (taken.has(id)) id = newId();
  return id;
}

/** The Flow's `options.edges` as authored, or `[]`. */
const rawEdges = (flow: UISchemaElement): readonly unknown[] => {
  const edges = flow.options?.['edges'];
  return Array.isArray(edges) ? edges : [];
};

/** The Condition with `conditionId`, or `undefined` when it is not one. */
function conditionAt(
  root: TreeElement,
  conditionId: string,
  ids: ElementIds,
): TreeElement | undefined {
  const element = findById(root, conditionId, ids);
  return element && isCondition(element) ? element : undefined;
}

/** The value a complete criterion starts with for `field` (rule 26), or `undefined` when it needs none. */
function startingValue(field: CriterionField, operator: Operator): Criterion['value'] | undefined {
  if (!needsValue(operator)) return undefined;
  if (field.kind === 'number') return 0;
  if (field.kind === 'boolean') return true;
  if (field.kind === 'choice') return field.options?.[0]?.value;
  return '';
}

/** `criteria` written back onto the Condition, as a new document. */
function withCriteria(
  document: StudioDocument,
  conditionId: string,
  criteria: Criterion[],
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const uischema = updateById(
    root,
    conditionId,
    (element) => withOptions(element, { criteria }, ids),
    ids,
  );
  return { schema: document.schema, uischema };
}

/**
 * Rule 26: the Condition gains a criterion born COMPLETE — the first upstream field, that kind's first operator,
 * and a value of the right type where one is needed. Refused, returning the same document, when the id is not a
 * Condition or nothing is upstream: any criterion it could create would be invalid, and a UI-authored document
 * must always stay appliable by the code editor's gate.
 */
export function addCriterion(
  document: StudioDocument,
  conditionId: string,
  ids: ElementIds,
  newId: () => string,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const authoredId = condition.options?.['id'];
  const fields =
    typeof authoredId === 'string' && authoredId !== ''
      ? upstreamFieldsOf(document, authoredId)
      : [];
  const field = fields[0];
  if (!field) return document;

  const operator = operatorsFor(field.kind)[0];
  if (!operator) return document;

  const criteria = criteriaOf(condition);
  const id = freshId(new Set(criteria.map((criterion) => criterion.id)), newId);
  const value = startingValue(field, operator);
  const criterion: Criterion =
    value === undefined
      ? { id, field: field.key, operator }
      : { id, field: field.key, operator, value };

  return withCriteria(document, conditionId, [...criteria, criterion], ids);
}

/**
 * Rule 27: the criterion is dropped, and with it every edge that leaves by it — an edge whose `(source,
 * sourceHandle)` names it. The default-path edge and the other criteria's edges are untouched.
 */
export function removeCriterion(
  document: StudioDocument,
  conditionId: string,
  criterionId: string,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const criteria = criteriaOf(condition);
  const kept = criteria.filter((criterion) => criterion.id !== criterionId);
  if (kept.length === criteria.length) return document;

  const next = withCriteria(document, conditionId, kept, ids);
  const authoredId = condition.options?.['id'];
  if (typeof authoredId !== 'string' || authoredId === '') return next;

  // The Flow is the root: a Condition is only ever a Flow child.
  const flow = next.uischema as TreeElement;
  const edges = rawEdges(flow);
  const remaining = edges.filter(
    (entry) =>
      !(isRecord(entry) && entry['source'] === authoredId && entry['sourceHandle'] === criterionId),
  );
  if (remaining.length === edges.length) return next;
  return { schema: next.schema, uischema: withOptions(flow, { edges: remaining }, ids) };
}

/**
 * Rule 28: `patch` applied to the criterion. Changing the field to one of a DIFFERENT kind resets the operator
 * and value — neither is valid across kinds (rule 1) — while a same-kind field keeps both. The criterion's id
 * never changes, so its edges stay attached. A patch that would leave the criterion invalid is refused.
 */
export function setCriterion(
  document: StudioDocument,
  conditionId: string,
  criterionId: string,
  patch: Partial<Omit<Criterion, 'id'>>,
  ids: ElementIds,
): StudioDocument {
  const root = document.uischema as TreeElement;
  const condition = conditionAt(root, conditionId, ids);
  if (!condition) return document;

  const criteria = criteriaOf(condition);
  const current = criteria.find((criterion) => criterion.id === criterionId);
  if (!current) return document;

  const authoredId = condition.options?.['id'];
  const fields =
    typeof authoredId === 'string' && authoredId !== ''
      ? upstreamFieldsOf(document, authoredId)
      : [];

  const nextField = patch.field ?? current.field;
  const changedKind =
    patch.field !== undefined &&
    patch.field !== current.field &&
    fields.find((field) => field.key === nextField)?.kind !==
      fields.find((field) => field.key === current.field)?.kind;

  const field = fields.find((candidate) => candidate.key === nextField);
  const reset = changedKind && field ? operatorsFor(field.kind)[0] : undefined;
  const operator = patch.operator ?? reset ?? current.operator;
  const value = changedKind
    ? field && reset
      ? startingValue(field, operator)
      : undefined
    : (patch.value ?? current.value);

  const next: Criterion =
    value === undefined
      ? { id: criterionId, field: nextField, operator }
      : { id: criterionId, field: nextField, operator, value };

  if (criterionProblems(next, fields).length > 0) return document;
  return withCriteria(
    document,
    conditionId,
    criteria.map((criterion) => (criterion.id === criterionId ? next : criterion)),
    ids,
  );
}
