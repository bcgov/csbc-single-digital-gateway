import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { AddNodeMenu } from './add-affordance';
import { isHovered, useConditionHover } from './condition-hover';
import { isRouted, routedPath } from './flow-edge-path';
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
  source,
  sourceHandleId,
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
  // Doc 199 rule 50: hovering a Condition row highlights its edge. The hovered output is CANVAS state handed
  // down by the renderer, so the edge and the card agree without either knowing the other.
  const hover = useConditionHover();
  const highlighted = sourceHandleId !== null && isHovered(hover, source, sourceHandleId ?? '');
  // Doc 198 rule 23: square corners. An edge spanning ranks follows the lane dagre reserved for it (rule 30b); one
  // between adjacent ranks has nothing to avoid, so the step path is all it needs.
  const points = data?.points ?? [];
  const [path, labelX, labelY] = isRouted(points)
    ? routedPath({ x: sourceX, y: sourceY }, { x: targetX, y: targetY }, points)
    : getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const flowId = data?.flowId;
  const branchLabel = data?.branchLabel;

  // Rule 45: the Else edge draws dashed in the warning colour; a highlighted edge thickens in the accent.
  // An inline style rather than a class: xyflow's own stylesheet is unlayered and beats Tailwind on an edge path
  // (doc 196 rule 4), and `style` is the prop xyflow itself passes through to `BaseEdge`.
  const edgeStyle = {
    ...style,
    ...(data?.isElse === true
      ? { stroke: 'var(--color-warning-border)', strokeDasharray: '4 3' }
      : {}),
    ...(highlighted ? { stroke: 'var(--color-primary)', strokeWidth: 2 } : {}),
  };

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
        style={edgeStyle}
      />
      {/* Rule 50: the branch's name, near the TARGET end where a long edge is still readable. */}
      {branchLabel === undefined ? null : (
        <EdgeLabelRenderer>
          <span
            data-slot="flow-edge-branch"
            className={`pointer-events-none absolute rounded-sm px-1 py-px font-mono text-[9px] ${
              highlighted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${targetX - 28}px, ${targetY - 12}px)`,
            }}
          >
            {branchLabel}
          </span>
        </EdgeLabelRenderer>
      )}
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
