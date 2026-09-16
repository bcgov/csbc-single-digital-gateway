import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { AddNodeMenu } from './add-affordance';
import { useFlowEditor } from './flow-editor';
import type { ActionFlowEdge } from './flow-nodes';

/**
 * Doc 198 rules 9-10: the edge every Flow connection is drawn with. It draws the connection itself and, under a Flow
 * editor, a square + at the midpoint that slides open to "+ Add" and splits the edge when pressed.
 *
 * `EdgeLabelRenderer` portals the button OUT of the SVG into a normal DOM layer, which is what lets it take a press at
 * all — an HTML button inside `<svg>` would not render. The Flow's element id arrives in `data` (set by the renderer),
 * because an edge component is given only its own id.
 */
export function ActionEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps<ActionFlowEdge>) {
  const editor = useFlowEditor();
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const flowId = data?.flowId;

  return (
    <>
      {/*
        `exactOptionalPropertyTypes`: EdgeProps hands these over as `string | undefined`, while BaseEdge declares them
        optional — so an absent marker or style must be an ABSENT KEY, never an explicit `undefined`.
      */}
      <BaseEdge
        id={id}
        path={path}
        {...(markerEnd === undefined ? {} : { markerEnd })}
        {...(style === undefined ? {} : { style })}
      />
      {editor && flowId !== undefined ? (
        <EdgeLabelRenderer>
          <div
            data-slot="flow-edge-action"
            className="pointer-events-none absolute"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {/* Doc 199 rule 24: the edge + splits the edge with either kind of node. */}
            <AddNodeMenu
              variant="action"
              label="Insert a node"
              onAdd={(kind) =>
                editor.onGesture({ type: 'insert-between', flowId, edgeId: id, kind })
              }
            />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
