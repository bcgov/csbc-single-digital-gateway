import { rankWith, uiTypeIs, type RankedTester, type UISchemaElement } from '@jsonforms/core';
import type { Criterion } from '../../types/elements';

// The Flow, Stage and Condition elements (doc 195 rules 4-5, 8; doc 199 rules 16-17). Pure — no React, no
// @xyflow/react — so renderers/default and the studio's code editor can import it.

/** The root-only multi-stage form element. */
export const FLOW_TYPE = 'Flow';
/** A node of a Flow, holding that stage's Forms. */
export const STAGE_TYPE = 'Stage';
/** A node of a Flow that branches it (doc 199). */
export const CONDITION_TYPE = 'Condition';

/**
 * Doc 199 rule 18: the source handle of a Condition's DEFAULT output. Criteria use their own ids, so this is
 * reserved and can never collide with a `nanoid(8)`.
 */
export const DEFAULT_HANDLE = '__default';

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
/** Rule 19: what fillable forms show for a Flow. */
export const FLOW_UNSUPPORTED_MESSAGE = "Flows can't be filled in yet.";

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
 * Doc 199 rule 5: a Condition's authored criteria — the entries that are records with a non-empty string `id`,
 * in order, the first winning a repeated id. Anything else is not a criterion and is skipped; what makes a
 * criterion *invalid* (as opposed to absent) is `criterionProblems`.
 */
export function criteriaOf(element: UISchemaElement): Criterion[] {
  const authored = element.options?.['criteria'];
  if (!Array.isArray(authored)) return [];
  const seen = new Set<string>();
  const criteria: Criterion[] = [];
  for (const entry of authored) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const { id } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue;
    seen.add(id);
    criteria.push(entry as Criterion);
  }
  return criteria;
}

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
