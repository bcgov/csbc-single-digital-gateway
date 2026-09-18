import { rankWith, uiTypeIs, type RankedTester, type UISchemaElement } from '@jsonforms/core';
import type { Clause, ConditionRow } from '../../types/elements';

// The Flow, Stage and Condition elements (doc 195 rules 4-5, 8; doc 199 rules 16-17). Pure — no React, no
// @xyflow/react — so renderers/default and the studio's code editor can import it.

/** The root-only multi-stage form element. */
export const FLOW_TYPE = 'Flow';
/** A node of a Flow, holding that stage's Forms. */
export const STAGE_TYPE = 'Stage';
/** A node of a Flow that branches it (doc 199). */
export const CONDITION_TYPE = 'Condition';

/**
 * Doc 199 rules 18, 37: the source handle of a Condition's DEFAULT (Else) output. Rows use their own ids, so
 * this is reserved and can never collide with a `nanoid(8)`.
 */
export const DEFAULT_HANDLE = 'else';

/** Rule 4: the testers every set rendering Flows, Stages or Conditions uses — no other entry matches them. */
export const flowTester: RankedTester = rankWith(1, uiTypeIs(FLOW_TYPE));
export const stageTester: RankedTester = rankWith(1, uiTypeIs(STAGE_TYPE));
export const conditionTester: RankedTester = rankWith(1, uiTypeIs(CONDITION_TYPE));

/** Rule 6: what a Flow shows anywhere but the root. */
export const FLOW_NESTED_MESSAGE = 'A Flow can only be the root element.';
/** Rule 9, reworded by doc 199 rule 22: shown above the canvas when a Flow holds anything else. */
export const FLOW_CHILD_MESSAGE = 'Only Stages and Conditions can be placed in a Flow.';
/** Rule 13: what a Stage shows outside a Flow. */
export const STAGE_PLACEMENT_MESSAGE = 'A Stage can only be placed in a Flow.';
/** Doc 199 rule 21: what a Condition shows outside a Flow. */
export const CONDITION_PLACEMENT_MESSAGE = 'A Condition can only be placed in a Flow.';
/** Rule 14: shown on a Stage card holding anything but Forms. */
export const STAGE_CHILD_MESSAGE = 'Only Forms can be placed in a Stage.';
// Doc 202 rule 46: `FLOW_UNSUPPORTED_MESSAGE` is DELETED. Doc 195 rule 19 said a Flow "can't be filled in yet";
// it now is — `renderers/default`'s Flow entry renders the runner's stage sidebar and content pane instead.

/** The prefix of a node's id when it has no usable `options.id`; never addressable by an edge. */
const PLACEHOLDER_PREFIX = '__stage-';

/** Which kind of node a Flow child is (doc 199 rule 16). */
export type FlowNodeKind = 'stage' | 'condition';

/** A node of a Flow as it is drawn: its element, its index in the Flow's `elements`, its node id and its kind. */
export interface DrawnNode {
  readonly element: UISchemaElement;
  readonly index: number;
  readonly id: string;
  /** Whether `id` is the node's own `options.id`, so edges may address it. */
  readonly authored: boolean;
  readonly kind: FlowNodeKind;
}

/** Kept for the Stage-only readers (doc 199 rule 16). */
export type DrawnStage = DrawnNode;

/** A layout's `elements`, or `[]`. */
export const elementsOf = (element: UISchemaElement): readonly UISchemaElement[] =>
  (element as { elements?: UISchemaElement[] }).elements ?? [];

export const isStage = (element: UISchemaElement): boolean => element.type === STAGE_TYPE;
export const isCondition = (element: UISchemaElement): boolean => element.type === CONDITION_TYPE;

/** The kind of Flow node `element` is, or `undefined` when it is neither. */
export function flowNodeKind(element: UISchemaElement): FlowNodeKind | undefined {
  if (isStage(element)) return 'stage';
  return isCondition(element) ? 'condition' : undefined;
}

/**
 * Doc 199 rule 31: whether `type` is a node of a Flow. The studio's frame and content decide by TYPE, not by
 * element, and both must treat a Condition exactly as they treat a Stage — one rule, so the two can never drift.
 */
export const isFlowNodeType = (type: string): boolean =>
  type === STAGE_TYPE || type === CONDITION_TYPE;

/** A node's `options.id` when a non-empty string, else `undefined`. Stages and Conditions share one id-space. */
export function authoredStageId(stage: UISchemaElement): string | undefined {
  const id = stage.options?.['id'];
  return typeof id === 'string' && id !== '' ? id : undefined;
}

/**
 * Doc 199 rules 35, 38: a Condition's authored ROWS — the entries that are records with a non-empty string `id`
 * and at least one usable clause, in order, the first winning a repeated id. Anything else is not a row and is
 * skipped; what makes a row *invalid* (as opposed to absent) is `rowProblems`.
 *
 * Rule 35 is a HARD CUT: `options.criteria` is not read. A row whose `match` is neither `all` nor `any` reads
 * as `all` — the narrower reading, so a malformed row can never capture traffic the author did not mean it to —
 * and a row with no `label` reads as an empty one, which the card renders by falling back to its summary.
 */
export function rowsOf(element: UISchemaElement): ConditionRow[] {
  const authored = element.options?.['rows'];
  if (!Array.isArray(authored)) return [];
  const seen = new Set<string>();
  const rows: ConditionRow[] = [];
  for (const entry of authored) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const id = record['id'];
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
    const clauses = clausesOf(record['clauses']);
    if (clauses.length === 0) continue;
    seen.add(id);
    rows.push({
      id,
      label: typeof record['label'] === 'string' ? record['label'] : '',
      match: record['match'] === 'any' ? 'any' : 'all',
      clauses,
    });
  }
  return rows;
}

/** A row's authored clauses: records with a non-empty string `id`, in order, the first winning a repeat. */
function clausesOf(authored: unknown): Clause[] {
  if (!Array.isArray(authored)) return [];
  const seen = new Set<string>();
  const clauses: Clause[] = [];
  for (const entry of authored) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const { id } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
    seen.add(id);
    clauses.push(entry as Clause);
  }
  return clauses;
}

/**
 * Doc 202 rule 47: whether this Flow shows a review page before Submit. Absent, or anything that is not `true`,
 * reads as OFF — so no document authored before the option existed changes behaviour.
 */
export const showsReview = (flow: UISchemaElement): boolean => flow.options?.['review'] === true;

/**
 * Doc 199 rule 51: how a Condition's rows are shown — `rules` (the default) or `switch`. Absent, or anything
 * else, reads as `rules`: switch mode is a VIEW of the same rows, so an unreadable value can only ever mean the
 * fuller of the two faces.
 */
export const conditionMode = (element: UISchemaElement): 'rules' | 'switch' =>
  element.options?.['mode'] === 'switch' ? 'switch' : 'rules';

/** Every clause of every row, in row then clause order — what rule 34's hint and rule 40's walk read. */
export const clausesIn = (element: UISchemaElement): Clause[] =>
  rowsOf(element).flatMap((row) => row.clauses);

/**
 * Rule 8, widened by doc 199 rule 16: every Stage AND Condition of `flow` in `elements` order with its node id —
 * its `options.id` when usable and not taken by an earlier node, else a `__stage-<index>` placeholder (suffixed
 * while an authored id already has that text). ONE list, so ranks, edges and id uniqueness stay consistent
 * across both kinds.
 */
export function drawnNodes(flow: UISchemaElement): DrawnNode[] {
  const used = new Set<string>();
  const nodes: DrawnNode[] = [];
  elementsOf(flow).forEach((element, index) => {
    const kind = flowNodeKind(element);
    if (kind === undefined) return;
    const authored = authoredStageId(element);
    if (authored !== undefined && !used.has(authored)) {
      used.add(authored);
      nodes.push({ element, index, id: authored, authored: true, kind });
      return;
    }
    let id = `${PLACEHOLDER_PREFIX}${index}`;
    for (let n = 2; used.has(id); n += 1) id = `${PLACEHOLDER_PREFIX}${index}-${n}`;
    used.add(id);
    nodes.push({ element, index, id, authored: false, kind });
  });
  return nodes;
}

/** The Stages alone, with the same ids `drawnNodes` assigns (doc 199 rule 16). */
export const drawnStages = (flow: UISchemaElement): DrawnNode[] =>
  drawnNodes(flow).filter((node) => node.kind === 'stage');

/**
 * Doc 203 rules 1-3: where a Flow begins. The ONE resolver, read by the canvas marker AND by the runner
 * (doc 202 rule 18), so the drawn start and the filled-in start can never disagree.
 *
 * The authored `options.startId` when it names a drawn Stage with its own authored id; else the FIRST such Stage
 * in `elements` order; else `undefined`, when the Flow has no addressable Stage.
 *
 * Only a Stage may start a Flow (rule 3): a Condition branches on answers given before it, so it can never be
 * first, and an id naming one resolves as if absent — as does a placeholder id, which no edge can address either.
 *
 * Forgiving on purpose: `flowProblems` REPORTS a dangling start (rule 12), exactly as it reports the bad edges
 * `flowEdges` drops silently, so a live canvas never dead-ends while hand-edited text is still caught.
 */
export function startStageId(flow: UISchemaElement): string | undefined {
  const stages = drawnNodes(flow).filter(({ kind, authored }) => kind === 'stage' && authored);
  const authored = flow.options?.['startId'];
  if (typeof authored === 'string' && stages.some(({ id }) => id === authored)) return authored;
  return stages[0]?.id;
}
