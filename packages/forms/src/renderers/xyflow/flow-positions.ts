import type { UISchemaElement } from '@jsonforms/core';
import type { StagePosition } from '../../types/elements';
import { drawnNodes } from './flow-elements';
import { flowEdges } from './flow-graph';

// Where a Flow's Stages sit (doc 198 rules 1-2). Pure — no React, no @xyflow/react.
//
// Supersedes doc 195 rule 12. Positions are DERIVED and the canvas runs top-down: a Stage's authored
// `options.position` is no longer read at all, so dragging cannot persist and the Stage nodes are not
// draggable (rule 4). The key stays permitted by the metaschema and is left untouched in documents.

/** The vertical distance between ranks, in canvas pixels. */
export const STAGE_RANK_HEIGHT = 240;
/** The horizontal distance between the Stages sharing one rank, in canvas pixels. */
export const STAGE_SIBLING_WIDTH = 320;

/**
 * Each Stage's rank: the longest path to it from a Stage with no incoming edge, relaxed in topological order (Kahn).
 * A Stage the order never reaches — on a cycle, or after one — keeps the rank relaxed so far (0 when none).
 */
function ranks(stageIds: readonly string[], flow: UISchemaElement): Map<string, number> {
  const edges = flowEdges(flow);
  const rank = new Map(stageIds.map((id) => [id, 0]));
  const incoming = new Map(stageIds.map((id) => [id, 0]));
  for (const { target } of edges) incoming.set(target, (incoming.get(target) ?? 0) + 1);
  const ready = stageIds.filter((id) => incoming.get(id) === 0);
  while (ready.length > 0) {
    const current = ready.shift() as string;
    for (const { source, target } of edges) {
      if (source !== current) continue;
      rank.set(target, Math.max(rank.get(target) ?? 0, (rank.get(current) ?? 0) + 1));
      const remaining = (incoming.get(target) ?? 0) - 1;
      incoming.set(target, remaining);
      if (remaining === 0) ready.push(target);
    }
  }
  return rank;
}

/**
 * Rules 1-2: every drawn Stage's position by node id — `y = rank × 240` and `x = sibling × 320`, where sibling is its
 * order among the Stages sharing its rank, in `elements` order.
 */
export function stagePositions(flow: UISchemaElement): Map<string, StagePosition> {
  const stages = drawnNodes(flow);
  const rankOf = ranks(
    stages.map(({ id }) => id),
    flow,
  );
  const siblings = new Map<number, number>();
  const positions = new Map<string, StagePosition>();
  for (const { id } of stages) {
    const rank = rankOf.get(id) ?? 0;
    const sibling = siblings.get(rank) ?? 0;
    siblings.set(rank, sibling + 1);
    positions.set(id, { x: sibling * STAGE_SIBLING_WIDTH, y: rank * STAGE_RANK_HEIGHT });
  }
  return positions;
}
