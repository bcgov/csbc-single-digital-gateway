import type { JsonSchema, UISchemaElement } from '@jsonforms/core';
import type { Criterion, FlowEdge } from '../types/elements';
import { choiceOptions } from '../renderers/ui/choice-control';
import { controlKindOf, type ControlKind } from '../renderers/ui/control-kind';
import { needsValue, operatorsFor, type CriterionField } from '../renderers/xyflow/criteria';
import { criteriaOf } from '../renderers/xyflow/flow-elements';

// Evaluating a Condition's criteria against the answers (doc 202 rules 19-23). PURE — no React, no
// @xyflow/react — because `renderers/default`'s Flow entry imports this and a test pins that boundary
// (doc 202 rule 42). It may not import the studio either (rule 45), which is why the field resolver below is
// local rather than `studio/layout/upstream-fields.ts`.
//
// This is the fill-time half of doc 199's authoring-time `criterionProblems`, and it deliberately shares
// `operatorsFor` / `needsValue` with it (rule 19): "may this criterion be authored?" and "does it match?" can
// then never disagree about which operators a field kind offers, or about which operators take a value.

/** The answers the runner evaluates against — the host's controlled `data` object (rule 3). */
export type RunnerData = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The answer given for `key`, or `undefined`. Forgiving about `data` itself: a host may not have one yet. */
const answerOf = (data: RunnerData | undefined, key: string): unknown =>
  isRecord(data) ? data[key] : undefined;

/**
 * The field a criterion names, resolved from the document's SCHEMA alone: `criterion.field` is a top-level
 * property key (doc 199 rule 1), so `schema.properties[key]` is the whole lookup. An inherited name such as
 * `toString` is never a property, exactly as in `propertyKeyOf`.
 *
 * The studio resolves fields from the Controls that BIND them (`upstreamFieldsOf`), because authoring must
 * offer only fields answered upstream of the branch. The runner asks a different question — "what type is this
 * answer?" — which the schema answers on its own, and it must not import the studio to ask it. A field bound by
 * no Control therefore resolves here and simply never has an answer, which rule 20's operators handle.
 *
 * The label is the property's `title`, else the key: nothing here compares labels, so it exists only so a
 * caller can name the field in a message.
 */
export function criterionFieldOf(key: string, schema: JsonSchema): CriterionField | undefined {
  const properties = schema.properties;
  if (properties === undefined || !Object.hasOwn(properties, key)) return undefined;
  const property = properties[key];
  const kind = controlKindOf(property);
  if (kind === undefined) return undefined;

  const title = property?.title;
  const label = typeof title === 'string' && title.length > 0 ? title : key;
  const options = kind === 'choice' ? choiceOptions(property) : undefined;
  return options === undefined ? { key, label, kind } : { key, label, kind, options };
}

/**
 * The value a `kind` accepts when the operator takes one — the same test `criterionProblems` applies.
 *
 * It is duplicated rather than imported because it is private there, and because the two must NOT be the same
 * check: `criterionProblems` additionally refuses a `choice` value that is not one of the field's options, which
 * is right for authoring but wrong here. A `notEquals` against an option the author has since deleted is still a
 * perfectly evaluable comparison, and rule 22 lists only a dangling field, an unoffered operator and a
 * wrong-TYPED value as unevaluable.
 */
function valueMatchesKind(kind: ControlKind, value: unknown): boolean {
  if (kind === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (kind === 'boolean') return typeof value === 'boolean';
  return typeof value === 'string';
}

/** Rule 20: `undefined`, `null` and `''` are empty. Anything else — `0`, `false` — is an answer. */
const isEmptyAnswer = (answer: unknown): boolean =>
  answer === undefined || answer === null || answer === '';

/** Both sides of a numeric comparison as finite numbers, or `undefined` when either is not (rule 20). */
function comparableNumbers(answer: unknown, value: unknown): [number, number] | undefined {
  if (typeof answer !== 'number' || !Number.isFinite(answer)) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return [answer, value];
}

/**
 * Rules 20-22: whether `criterion` matches the answers, given the field it names (`undefined` when the field is
 * dangling). Pure, total and independently testable — it NEVER throws, because the document it reads is
 * author-supplied and reaches the runner without passing the studio's apply gate.
 *
 * Rule 22 — a criterion that cannot be evaluated never matches:
 * - the field is dangling (doc 199 reports that, and never repairs it),
 * - the operator is not one `operatorsFor(field.kind)` offers,
 * - a value-taking operator (`needsValue`) has no `value`, or one of the wrong type for the kind.
 *
 * `false` is the safe answer in every one of those cases: the user goes down the Condition's default path
 * (rule 21) rather than into an error.
 */
export function matchesCriterion(
  criterion: Criterion,
  field: CriterionField | undefined,
  data: RunnerData | undefined,
): boolean {
  // A field resolved for a different key would silently compare the wrong answer, so the pairing is checked
  // rather than trusted — this is a public function a host or a test may call directly.
  if (field === undefined || field.key !== criterion.field) return false;
  if (!operatorsFor(field.kind).includes(criterion.operator)) return false;

  const { operator, value } = criterion;
  if (needsValue(operator) && (value === undefined || !valueMatchesKind(field.kind, value)))
    return false;

  const answer = answerOf(data, criterion.field);
  switch (operator) {
    case 'equals':
      return answer === value;
    case 'notEquals':
      return answer !== value;
    case 'contains':
      // Only a string answer can contain anything; `value` is a string already, since `contains` is offered
      // for `text` alone and a wrong-typed value was refused above.
      return (
        typeof answer === 'string' &&
        typeof value === 'string' &&
        answer.toLowerCase().includes(value.toLowerCase())
      );
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const pair = comparableNumbers(answer, value);
      if (pair === undefined) return false;
      const [left, right] = pair;
      if (operator === 'gt') return left > right;
      if (operator === 'gte') return left >= right;
      return operator === 'lt' ? left < right : left <= right;
    }
    case 'isEmpty':
      return isEmptyAnswer(answer);
    case 'isNotEmpty':
      return !isEmptyAnswer(answer);
    case 'isTrue':
      return answer === true;
    case 'isFalse':
      return answer === false;
  }
}

/**
 * Rules 21, 23: the first criterion of `condition` that matches the answers, or `undefined` when none does —
 * which includes a Condition with no criteria at all, a pass-through that takes its default path.
 *
 * Authored order decides (`criteriaOf` preserves it), and the FIRST match wins: later criteria are never
 * evaluated, so overlapping branches behave like an if/else-if chain rather than ambiguously.
 */
export function firstMatchingCriterion(
  condition: UISchemaElement,
  schema: JsonSchema,
  data: RunnerData | undefined,
): Criterion | undefined {
  return criteriaOf(condition).find((criterion) =>
    matchesCriterion(criterion, criterionFieldOf(criterion.field, schema), data),
  );
}

/**
 * Doc 202 rule 10c: whether this Condition's branch is DECIDED by the answers so far — a different question from
 * "which edge does it take?", which `conditionEdge` always answers (rule 21 guarantees a default path).
 *
 * The sidebar needs the distinction. Rule 21's default is the right route for a citizen who has genuinely answered
 * and matched nothing, but it is a guess for one who has not answered yet — and listing the stages of a guessed
 * branch is exactly what rule 10c forbids ("Business" must not appear before "Applying as" is chosen).
 *
 * Decided when a criterion matches, when the Condition has no criteria at all (rule 23's pass-through, which always
 * goes the same way), or when every criterion's field is either ANSWERED or OPTIONAL (rule 10f). An answer that
 * matches nothing is a real answer, so the default path is a decision. So is a blank OPTIONAL field: the citizen may
 * leave it blank, blank matches no criterion (an `isEmpty` one would already have matched above), and so the default
 * path is where they go whether they answer or not. Only a blank REQUIRED field leaves the branch open, because the
 * citizen must answer it and that answer may pick any branch.
 */
export function conditionDecided(
  condition: UISchemaElement,
  schema: JsonSchema,
  data: RunnerData | undefined,
): boolean {
  const criteria = criteriaOf(condition);
  if (criteria.length === 0) return true;
  if (firstMatchingCriterion(condition, schema, data) !== undefined) return true;
  const required = requiredKeysOf(schema);
  return criteria.every(
    (criterion) =>
      !isEmptyAnswer(answerOf(data, criterion.field)) || !required.has(criterion.field),
  );
}

/** The schema's top-level `required` keys; anything that is not a list of strings counts as none. */
function requiredKeysOf(schema: JsonSchema): ReadonlySet<string> {
  const { required } = schema;
  return new Set(Array.isArray(required) ? required.filter((key) => typeof key === 'string') : []);
}

/** What `conditionEdge` needs: the Condition, the node id edges address it by, and the answers to judge. */
export interface ConditionRoute {
  readonly condition: UISchemaElement;
  /** The Condition's node id from `drawnNodes` — the `source` of its outgoing edges. */
  readonly nodeId: string;
  /** The SANITISED edges of the whole Flow (`flowEdges`), never raw `options.edges` (doc 199 rule 7). */
  readonly edges: readonly FlowEdge[];
  readonly schema: JsonSchema;
  readonly data: RunnerData | undefined;
}

/**
 * Rule 21: the edge a Condition sends these answers down — the outgoing edge whose `sourceHandle` is the first
 * matching criterion's id, else the outgoing edge with NO `sourceHandle` (the default path).
 *
 * `flowProblems` guarantees every Condition has a default, but this returns `undefined` rather than throwing
 * when it does not: a hand-edited document reaches the runner without passing the apply gate (rule 17), and the
 * traversal reads a missing edge as the end of the flow (rule 16), which is a dead end the author can see.
 *
 * A matching criterion whose output is CONNECTED TO NOTHING falls back to the default too, rather than trying
 * the criteria after it — first match wins means the later ones were never in play. `flowEdges` has already
 * dropped any edge leaving by a criterion id that does not exist (doc 199 rule 12), so an edge found here
 * always names a real branch.
 */
export function conditionEdge(route: ConditionRoute): FlowEdge | undefined {
  const { condition, nodeId, edges, schema, data } = route;
  const outgoing = edges.filter((edge) => edge.source === nodeId);
  const matched = firstMatchingCriterion(condition, schema, data);
  const branch =
    matched === undefined ? undefined : outgoing.find((edge) => edge.sourceHandle === matched.id);
  return branch ?? outgoing.find((edge) => edge.sourceHandle === undefined);
}
