import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { AddPanel, type AddOption } from './add-panel';
import { useCanvasActions } from './canvas-actions';
import { FADE_IN, FADE_IN_AFTER, MOTION } from './canvas-zoom';
import type { AddEdge as AddEdgeType, AddTarget } from './canvas-graph';

/** How a marked edge and its label are coloured. Inline strokes: xyflow's unlayered stylesheet beats Tailwind. */
/** Each + kind's options, in order (doc 235 rule 2). */
const OPTIONS: Readonly<Record<AddTarget['kind'], readonly AddOption[]>> = Object.freeze({
  trailing: Object.freeze(['connection', 'condition', 'form'] as const),
  between: Object.freeze(['condition', 'form'] as const),
  leading: Object.freeze(['form', 'connection'] as const),
  orphan: Object.freeze(['connection'] as const),
});

const TONES = {
  floating: {
    stroke: 'var(--color-warning-border)',
    label: 'bg-warning-surface text-warning-text',
  },
  invalid: { stroke: 'var(--color-danger-border)', label: 'bg-danger-surface text-danger' },
} as const;

/**
 * Every edge on the canvas. It carries the + (`AddPanel`, doc 235): at the midpoint of a persisted edge, which it
 * splits, and at the END of a trailing edge, which adds after — or connects — the free output. An edge leaving a
 * Condition also shows its branch — the row's clauses, or "Default" — directly above its +; the default path is
 * dashed. A floating edge is orange, an edge after an unset branch red. A headless Condition's LEADING edge is red,
 * with a + at its top that adds a Form before it or connects a node into it.
 */
export function AddEdge({ id, data, sourceX, sourceY, targetX, targetY }: EdgeProps<AddEdgeType>) {
  const { add, startConnect, canConnect } = useCanvasActions();
  const [path, midX, midY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    borderRadius: 8,
  });
  if (data === undefined) return <BaseEdge id={id} path={path} />;
  const target = data.add;
  const options = OPTIONS[target.kind].filter((o) => canConnect || o !== 'connection');
  const choose = (option: AddOption) => {
    if (option !== 'connection') add(target, option);
    else if (target.kind === 'trailing') startConnect({ kind: 'output', output: target.output });
    else if (target.kind !== 'between') startConnect({ kind: 'into', nodeId: target.nodeId });
  };
  if (target.kind === 'leading' || target.kind === 'orphan') {
    const tone = target.kind === 'leading' ? 'invalid' : 'floating';
    return (
      <>
        <BaseEdge id={id} path={path} style={{ stroke: TONES[tone].stroke, strokeWidth: 2 }} />
        <EdgeLabelRenderer>
          <AddPanel
            label={`Add before ${data.sourceName}`}
            options={options}
            onChoose={choose}
            tone={tone === 'invalid' ? 'danger' : 'warning'}
            style={{ transform: `translate(-50%, -50%) translate(${sourceX}px, ${sourceY}px)` }}
          />
        </EdgeLabelRenderer>
      </>
    );
  }
  const trailing = target.kind === 'trailing';
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
        <AddPanel
          label={`Add after ${
            data.branchLabel === undefined
              ? data.sourceName
              : `${data.sourceName} (${data.branchLabel})`
          }`}
          options={options}
          onChoose={choose}
          className={fade}
          style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
        />
      </EdgeLabelRenderer>
    </>
  );
}
