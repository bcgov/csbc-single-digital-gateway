import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, type NodeProps } from '@xyflow/react';
import { useContext } from 'react';
import { AddNodeMenu } from './add-affordance';
import { FlowContext } from './flow-context';
import { connectorClass, sourceSide, targetSide, trailingAnchor } from './flow-handles';
import { useFlowEditor } from './flow-editor';
import type { StageFlowNode } from './flow-nodes';
import { NodeBadge, ringClass, type NodeTone } from './node-badge';

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities: handle sizes and colours need
// the important modifier to apply.
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * Doc 203 rules 8-9, amended 2026-09-17: where a Stage sits in the flow, said on the CARD rather than in chrome
 * hung off it — a green ring on the one the flow starts at, a BLACK one on any Stage no edge leaves.
 *
 * Black, not red (user 2026-09-17: "black should be the border, background for the End Stages. Red should be
 * reserved for parsing errors"). An end is a perfectly good state — a finished flow's last Stage is one — and a
 * ring that reads as a warning on a correct document trains the author to ignore it. Red now means only that a
 * node can never route an answer anywhere (doc 199 rule 45b).
 *
 * Precedence, highest first: UNREACHABLE, start, end. Unreachable is the only one of the three that means
 * something is WRONG (doc 203 rule 9, widened 2026-09-17 to red), so it outranks either — an unreachable end
 * Stage needs to say it is stranded far more than it needs to say the flow stops there. A start is never
 * unreachable, so that pair never arises; start beats end because a one-Stage flow is trivially its own end.
 */
function stageTone(data: StageFlowNode['data']): NodeTone | null {
  if (data.isUnreachable) return 'danger';
  if (data.isStart) return 'success';
  if (data.isLeaf) return 'neutral';
  return null;
}

function stageTreatment(data: StageFlowNode['data']): string {
  const tone = stageTone(data);
  const base = 'pointer-events-auto rounded-xl';
  return tone === null ? base : `${base} ${ringClass(tone)}`;
}

/** Doc 203 rules 8-9 (amended): what a Stage's ring says in words. */
export const START_LABEL = 'Start';
export const END_LABEL = 'End';
export const UNREACHABLE_LABEL = 'Not reachable';

const STAGE_LABELS: Readonly<Record<NodeTone, string>> = {
  danger: UNREACHABLE_LABEL,
  success: START_LABEL,
  neutral: END_LABEL,
};

/** The caption for this Stage, or none — the same precedence the ring follows, so the two always agree. */
function StageBadge({ data }: { readonly data: StageFlowNode['data'] }) {
  const tone = stageTone(data);
  return tone === null ? null : <NodeBadge label={STAGE_LABELS[tone]} tone={tone} />;
}

/**
 * The xyflow node every Stage is drawn with (doc 195 rules 7, 15): the Stage element dispatched back through JSONForms
 * with the Flow's registry — so the registry, never a tester, decides whether it gets a studio frame — between a target
 * handle on top and a source handle beneath. View-only, the handles only anchor edges: not connectable, and hidden.
 * Under a Flow editor (doc 196 rule 5) they are visible and connectable.
 *
 * Doc 198 rules 3, 32: the handles sit on the faces the canvas direction puts them on, and the leaf + that hangs off
 * the card follows them. Changing the layout without moving them draws every edge,
 * and every affordance, leaving the wrong face.
 *
 * Rule 15b: xyflow sets `pointer-events: none` on a node that is neither selectable nor draggable, which every child
 * inherits — so a press on the card would fall through to the pane (in the studio, selecting the Flow instead of the
 * Stage). The dispatched Stage sits in a `pointer-events-auto` wrapper so it can be pressed.
 */
export function StageNode({ data }: NodeProps<StageFlowNode>) {
  const flow = useContext(FlowContext);
  const editor = useFlowEditor();
  const editing = editor !== null;
  if (!flow) return null;
  const { schema, path, enabled, renderers, cells } = flow;
  const handleClass = editing ? EDIT_HANDLE_CLASS : VIEW_HANDLE_CLASS;
  return (
    <>
      {/*
        Doc 203 rule 8, SUPERSEDED 2026-09-17 (user: "the start stage should have a thick green border/glow.
        The input slot should be removed"). The start Stage wore a "Start" badge on a connector line above its
        target handle; the card itself now says it, and the input slot is gone — nothing flows INTO the start,
        so offering somewhere to connect one was inviting a shape the flow has no meaning for.

        The handle is still RENDERED, hidden and unconnectable, rather than deleted: xyflow silently drops an
        edge whose end names a handle the node does not have (doc 199 rule 18's trap), so deleting it would
        make an authored edge into the start VANISH with no error anywhere. Kept, such an edge still draws, and
        its source still earns the "Not reachable" badge — which is the honest reading of that document.
      */}
      <StageBadge data={data} />
      <Handle
        type="target"
        position={targetSide(flow.direction)}
        isConnectable={editing && !data.isStart}
        className={data.isStart ? VIEW_HANDLE_CLASS : handleClass}
      />
      <div
        data-slot="stage-node"
        className={stageTreatment(data)}
        {...(data.isStart ? { 'data-start': '' } : {})}
        {...(data.isLeaf ? { 'data-end': '' } : {})}
        {...(data.isUnreachable ? { 'data-unreachable': '' } : {})}
      >
        <JsonFormsDispatch
          uischema={data.element}
          schema={schema}
          path={path}
          enabled={enabled}
          {...(renderers ? { renderers } : {})}
          {...(cells ? { cells } : {})}
        />
      </div>
      <Handle
        type="source"
        position={sourceSide(flow.direction)}
        isConnectable={editing}
        className={handleClass}
      />
      {/*
        Doc 198 rules 6-7: the end of a chain grows a dangling + that appends the next Stage. It hangs off the
        TRAILING face — the one the flow leaves by — so it continues the chain rather than reading as something
        under the card (doc 199 amendment 8).
      */}
      {editor && data.isLeaf ? (
        <div
          data-slot="flow-leaf-add"
          className={`pointer-events-none absolute flex items-center ${trailingAnchor(flow.direction)}`}
        >
          <span aria-hidden="true" className={connectorClass(flow.direction)} />
          {/* Doc 199 rule 24: the leaf + now offers a Stage or a Condition. */}
          <AddNodeMenu
            label="Add a node"
            onAdd={(kind) =>
              editor.onGesture({ type: 'append', stageId: editor.idOf(data.element), kind })
            }
          />
        </div>
      ) : null}
    </>
  );
}
