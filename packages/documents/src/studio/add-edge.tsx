import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { AddBeforeButton, AddMenu } from './add-menu';
import { useCanvasActions } from './canvas-actions';
import { FADE_IN, FADE_IN_AFTER, MOTION } from './canvas-zoom';
import type { AddEdge as AddEdgeType } from './canvas-graph';

/** How a marked edge and its label are coloured. Inline strokes: xyflow's unlayered stylesheet beats Tailwind. */
const TONES = {
  floating: {
    stroke: 'var(--color-warning-border)',
    label: 'bg-warning-surface text-warning-text',
  },
  invalid: { stroke: 'var(--color-danger-border)', label: 'bg-danger-surface text-danger' },
} as const;

/**
 * Every edge on the canvas. It carries the + (`AddMenu`): at the midpoint of a persisted edge, which it splits, and at
 * the END of a trailing edge, which adds after the free output. An edge leaving a Condition also shows its branch —
 * the row's clauses, or "Default" — directly above its +; the default path is dashed. A floating edge is orange,
 * an edge after an unset branch red. A headless Condition's LEADING edge is red with a Form-only + at its top.
 */
export function AddEdge({ id, data, sourceX, sourceY, targetX, targetY }: EdgeProps<AddEdgeType>) {
  const { add } = useCanvasActions();
  const [path, midX, midY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 8,
  });
  if (data === undefined) return <BaseEdge id={id} path={path} />;
  if (data.add.kind === 'leading') {
    return (
      <>
        <BaseEdge id={id} path={path} style={{ stroke: TONES.invalid.stroke, strokeWidth: 2 }} />
        <EdgeLabelRenderer>
          <AddBeforeButton
            targetName={data.sourceName}
            onAdd={() => add(data.add, 'form')}
            style={{ transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY}px)` }}
          />
        </EdgeLabelRenderer>
      </>
    );
  }
  const trailing = data.add.kind === 'trailing';
  const [x, y] = trailing ? [targetX, targetY] : [midX, midY];
  // A floating edge (not reachable from the start) is orange, and wins over an unset branch's red.
  // Labels and the + live outside the edge's own element, so they fade with it by hand (doc 233).
  const fade =
    data.fading === true
      ? `pointer-events-none! opacity-0 transition-opacity ${MOTION}`
      : data.appearing === 'with-flow'
        ? FADE_IN
        : data.appearing === 'after-page'
          ? FADE_IN_AFTER
          : '';
  const tone = data.floating === true ? 'floating' : data.invalid === true ? 'invalid' : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          ...(data.isDefault === true && { strokeDasharray: '4 3' }),
          ...(tone !== undefined && { stroke: TONES[tone].stroke, strokeWidth: 2 }),
        }}
      />
      <EdgeLabelRenderer>
        {data.branchLabel !== undefined && (
          <span
            data-slot="document-studio-branch-label"
            title={data.branchLabel}
            className={`pointer-events-none absolute max-w-40 truncate rounded-sm px-1.5 py-px text-[10px] ${fade} ${
              tone !== undefined
                ? TONES[tone].label
                : data.isDefault === true
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-primary/10 text-primary'
            }`}
            style={{
              transform: `translate(-50%, -100%) translate(${x}px, ${y - 16}px)`,
            }}
          >
            {data.branchLabel}
          </span>
        )}
        <AddMenu
          sourceName={
            data.branchLabel === undefined
              ? data.sourceName
              : `${data.sourceName} (${data.branchLabel})`
          }
          onAdd={(kind) => add(data.add, kind)}
          className={fade}
          style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
        />
      </EdgeLabelRenderer>
    </>
  );
}
