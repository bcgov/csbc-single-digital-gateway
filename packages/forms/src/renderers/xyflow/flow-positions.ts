import type { UISchemaElement } from '@jsonforms/core';
import type { StagePosition } from '../../types/elements';
import { drawnStages } from './flow-elements';
import { flowEdges } from './flow-graph';

// Where a Flow's Stages sit (doc 195 rule 12). Pure — no React, no @xyflow/react.

/** The horizontal distance between auto-placed columns, in canvas pixels. */
export const STAGE_COLUMN_WIDTH = 320;
/** The vertical distance between auto-placed Stages in one column, in canvas pixels. */
export const STAGE_ROW_HEIGHT = 240;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A Stage's `options.position` when both `x` and `y` are finite numbers, else `undefined`. */
export function authoredPosition(stage: UISchemaElement): StagePosition | undefined {
  const position = stage.options?.['position'];
  if (!isRecord(position)) return undefined;
  const { x, y } = position;
  return typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)
    ? { x, y }
    : undefined;
}

/**
 * Each Stage's column: the longest path to it from a Stage with no incoming edge, relaxed in topological order (Kahn).
 * A Stage the order never reaches — on a cycle, or after one — keeps the column relaxed so far (0 when none).
 */
function columns(stageIds: readonly string[], flow: UISchemaElement): Map<string, number> {
  const edges = flowEdges(flow);
  const column = new Map(stageIds.map((id) => [id, 0]));
  const incoming = new Map(stageIds.map((id) => [id, 0]));
  for (const { target } of edges) incoming.set(target, (incoming.get(target) ?? 0) + 1);
  const ready = stageIds.filter((id) => incoming.get(id) === 0);
  while (ready.length > 0) {
    const current = ready.shift() as string;
    for (const { source, target } of edges) {
      if (source !== current) continue;
      column.set(target, Math.max(column.get(target) ?? 0, (column.get(current) ?? 0) + 1));
      const remaining = (incoming.get(target) ?? 0) - 1;
      incoming.set(target, remaining);
      if (remaining === 0) ready.push(target);
    }
  }
  return column;
}

/**
 * Rule 12: every drawn Stage's position by node id — its authored `options.position`, else `x = column × 320` and
 * `y = row × 240`, where row is its order among the auto-placed Stages of its column.
 */
export function stagePositions(flow: UISchemaElement): Map<string, StagePosition> {
  const stages = drawnStages(flow);
  const columnOf = columns(
    stages.map(({ id }) => id),
    flow,
  );
  const rows = new Map<number, number>();
  const positions = new Map<string, StagePosition>();
  for (const { element, id } of stages) {
    const authored = authoredPosition(element);
    if (authored) {
      positions.set(id, authored);
      continue;
    }
    const column = columnOf.get(id) ?? 0;
    const row = rows.get(column) ?? 0;
    rows.set(column, row + 1);
    positions.set(id, { x: column * STAGE_COLUMN_WIDTH, y: row * STAGE_ROW_HEIGHT });
  }
  return positions;
}
