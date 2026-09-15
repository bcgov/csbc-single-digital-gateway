import { rankWith, uiTypeIs, type RankedTester, type UISchemaElement } from '@jsonforms/core';

// The Flow and Stage elements (doc 195 rules 4-5, 8). Pure — no React, no @xyflow/react — so renderers/default and the
// studio's code editor can import it.

/** The root-only multi-stage form element. */
export const FLOW_TYPE = 'Flow';
/** A node of a Flow, holding that stage's Forms. */
export const STAGE_TYPE = 'Stage';

/** Rule 4: the testers every set rendering Flows or Stages uses — no other entry matches either type. */
export const flowTester: RankedTester = rankWith(1, uiTypeIs(FLOW_TYPE));
export const stageTester: RankedTester = rankWith(1, uiTypeIs(STAGE_TYPE));

/** Rule 6: what a Flow shows anywhere but the root. */
export const FLOW_NESTED_MESSAGE = 'A Flow can only be the root element.';
/** Rule 9: shown above the canvas when a Flow holds anything but Stages. */
export const FLOW_CHILD_MESSAGE = 'Only Stages can be placed in a Flow.';
/** Rule 13: what a Stage shows outside a Flow. */
export const STAGE_PLACEMENT_MESSAGE = 'A Stage can only be placed in a Flow.';
/** Rule 14: shown on a Stage card holding anything but Forms. */
export const STAGE_CHILD_MESSAGE = 'Only Forms can be placed in a Stage.';
/** Rule 19: what fillable forms show for a Flow. */
export const FLOW_UNSUPPORTED_MESSAGE = "Flows can't be filled in yet.";

/** The prefix of a Stage's node id when it has no usable `options.id`; never addressable by an edge. */
const PLACEHOLDER_PREFIX = '__stage-';

/** A Stage of a Flow as it is drawn: its element, its index in the Flow's `elements`, and its node id. */
export interface DrawnStage {
  readonly element: UISchemaElement;
  readonly index: number;
  readonly id: string;
  /** Whether `id` is the Stage's own `options.id`, so edges may address it. */
  readonly authored: boolean;
}

/** A layout's `elements`, or `[]`. */
export const elementsOf = (element: UISchemaElement): readonly UISchemaElement[] =>
  (element as { elements?: UISchemaElement[] }).elements ?? [];

export const isStage = (element: UISchemaElement): boolean => element.type === STAGE_TYPE;

/** A Stage's `options.id` when a non-empty string, else `undefined`. */
export function authoredStageId(stage: UISchemaElement): string | undefined {
  const id = stage.options?.['id'];
  return typeof id === 'string' && id !== '' ? id : undefined;
}

/**
 * Rule 8: every Stage of `flow` in `elements` order with its node id — its `options.id` when usable and not taken by an
 * earlier Stage, else a `__stage-<index>` placeholder (suffixed while an authored id already has that text).
 */
export function drawnStages(flow: UISchemaElement): DrawnStage[] {
  const used = new Set<string>();
  const stages: DrawnStage[] = [];
  elementsOf(flow).forEach((element, index) => {
    if (!isStage(element)) return;
    const authored = authoredStageId(element);
    if (authored !== undefined && !used.has(authored)) {
      used.add(authored);
      stages.push({ element, index, id: authored, authored: true });
      return;
    }
    let id = `${PLACEHOLDER_PREFIX}${index}`;
    for (let n = 2; used.has(id); n += 1) id = `${PLACEHOLDER_PREFIX}${index}-${n}`;
    used.add(id);
    stages.push({ element, index, id, authored: false });
  });
  return stages;
}
