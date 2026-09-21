import type { UISchemaElement } from '@jsonforms/core';
import {
  CONDITION_TYPE,
  DEFAULT_HANDLE,
  drawnNodes,
  nodeLabel,
  rowsOf,
} from '../../renderers/xyflow/flow-elements';
import { flowEdges } from '../../renderers/xyflow/flow-graph';

// What the inspector's edge panel shows (doc 209 rules 5-7). Pure, and deliberately NOT an `InspectorField`
// list: that model resolves an ELEMENT and writes through `updateById(uischema, elementId, …)`, and an edge's
// data lives in the Flow's options — a different element from the thing selected (rule 6).

/** One entry of a picker. */
export interface EdgeChoice {
  readonly value: string;
  readonly label: string;
}

/** The edge panel's whole view model. */
export interface EdgeInspectorModel {
  readonly edgeId: string;
  readonly source: string;
  readonly target: string;
  /** The row the edge leaves by, or `DEFAULT_HANDLE` — the panel addresses Else by the reserved id (rule 5). */
  readonly sourceHandle: string;
  readonly nodes: readonly EdgeChoice[];
  /** The source Condition's outputs, or `undefined` when the source is a Stage — which has no branches. */
  readonly branches: readonly EdgeChoice[] | undefined;
}

const UNNAMED_NODE = 'Untitled';
const UNNAMED_BRANCH = 'Untitled condition';
const ELSE_LABEL = 'Else';

/**
 * Rule 7: a value the pickers do not otherwise offer is ADDED to them, so the panel says what the edge
 * actually names. Silently showing the first option instead would read as the edge pointing somewhere it does
 * not — doc 199 rule 9's principle, and the same reason a dangling `startId` is reported rather than repaired.
 */
const withDangling = (choices: EdgeChoice[], value: string): EdgeChoice[] =>
  value === '' || choices.some((choice) => choice.value === value)
    ? choices
    : [...choices, { value, label: `${value} (missing)` }];

/**
 * Rules 5-7: the panel's model for `edgeId`, or `undefined` when the Flow draws no such edge.
 *
 * Read off `flowEdges`, not the raw `options.edges`: an edge the canvas drops is not on screen to be selected,
 * so a panel for one could only ever describe something the author cannot see.
 */
export function edgeInspectorModel(
  flow: UISchemaElement,
  edgeId: string,
): EdgeInspectorModel | undefined {
  const edge = flowEdges(flow).find((candidate) => candidate.id === edgeId);
  if (!edge) return undefined;

  const drawn = drawnNodes(flow).filter(({ authored }) => authored);
  const nodes = drawn.map(({ id, element }) => ({
    value: id,
    label: nodeLabel(element, UNNAMED_NODE),
  }));
  const source = drawn.find(({ id }) => id === edge.source);

  const branches =
    source?.element.type === CONDITION_TYPE
      ? [
          ...rowsOf(source.element).map((row) => ({
            value: row.id,
            label: row.label === '' ? UNNAMED_BRANCH : row.label,
          })),
          // Rule 5: Else is an output like any other, and the one every Condition has.
          { value: DEFAULT_HANDLE, label: ELSE_LABEL },
        ]
      : undefined;

  const handle = edge.sourceHandle ?? DEFAULT_HANDLE;
  return {
    edgeId,
    source: edge.source,
    target: edge.target,
    sourceHandle: handle,
    nodes: withDangling(withDangling(nodes, edge.source), edge.target),
    branches: branches === undefined ? undefined : withDangling(branches, handle),
  };
}
