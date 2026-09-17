import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, type NodeProps } from '@xyflow/react';
import { useContext } from 'react';
import { AddNodeMenu } from './add-affordance';
import { FlowContext } from './flow-context';
import { connectorClass, sourceSide, targetSide, trailingAnchor } from './flow-handles';
import { useFlowEditor } from './flow-editor';
import type { StageFlowNode } from './flow-nodes';

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities: handle sizes and colours need
// the important modifier to apply.
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * Doc 203 rules 8-9, amended 2026-09-17: where a Stage sits in the flow, said on the CARD rather than in chrome
 * hung off it — a thick green glow on the one the flow starts at, a thick red one on any Stage no edge leaves.
 *
 * All three treatments RING the card rather than restyling it: the ring sits outside the card's own border, so
 * a Stage can be the start, an end, or unreachable without any of them fighting over the same pixels. Start
 * wins when a Stage is both (a one-Stage flow): where the flow BEGINS is the stronger thing to say, and such a
 * Stage is trivially also its end.
 *
 * The colours are the design system's state families, never raw green and red — `success` and `danger` carry
 * the accessible pairings, and the surface tone is what makes the ring read as a glow rather than a border.
 */
function stageTreatment(data: StageFlowNode['data']): string {
  const base = 'pointer-events-auto rounded-xl';
  // Doc 203 rule 9: a Stage no path from the start reaches is muted and outlined dashed. It can combine with
  // either ring — the outline sits outside it — because being unreachable says something neither ring does.
  const unreachable = data.isUnreachable
    ? ' opacity-60 outline-2 outline-offset-2 outline-dashed outline-border'
    : '';
  if (data.isStart)
    return `${base}${unreachable} ring-4 ring-success-border shadow-[0_0_0_6px_var(--color-success-surface)]`;
  if (data.isLeaf)
    return `${base}${unreachable} ring-4 ring-danger-border shadow-[0_0_0_6px_var(--color-danger-surface)]`;
  return `${base}${unreachable}`;
}

/** Doc 203 rule 8 (amended): what the ring on a start or end Stage says in words. */
export const START_LABEL = 'Start';
export const END_LABEL = 'End';

/**
 * Doc 203 rule 8, amended 2026-09-17 (user: "the start, end nodes should have a label above the node"): the ring
 * is a colour, and a colour alone names nothing — so the Stage it rings also says which it is.
 *
 * ABOVE the card in both directions, not on the leading or trailing face: the label is a caption on the node,
 * not an affordance continuing the flow, and a caption beside a card on the horizontal canvas would sit where
 * an edge arrives. LEFT-ALIGNED with the card's edge (user 2026-09-17), which also keeps it clear of the
 * right-aligned "Not reachable" badge — a Stage can be an end AND unreachable, so the two share that strip.
 * It matches the ring's colour family and is purely presentational — `pointer-events-none`, `nodrag nopan`
 * like every other canvas affordance (doc 198 rule 20), and never a Handle.
 *
 * It is drawn with or without an editor: where a flow begins and ends is structure, not authoring.
 */
function StageBadge({ data }: { readonly data: StageFlowNode['data'] }) {
  // Start wins when a Stage is both, exactly as the ring does — a one-Stage flow says where it begins.
  const label = data.isStart ? START_LABEL : data.isLeaf ? END_LABEL : null;
  if (label === null) return null;
  // A SOLID pill, white on the state colour. `*-border` is the family's only mid-tone — `*-surface` is a pale
  // tint that white would disappear into — so it is used as a background here despite its name. Both land at
  // about 4.7:1 against white (#42814a and #ce3e39), which clears AA for text this size.
  const tone = data.isStart ? 'bg-success-border' : 'bg-danger-border';
  return (
    <span
      data-slot="flow-stage-badge"
      className={`nodrag nopan pointer-events-none absolute bottom-full left-0 mb-2 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${tone}`}
    >
      {label}
    </span>
  );
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
      {/*
        The unreachable badge hangs off the TOP-RIGHT corner, clear of the centred Start marker. (The start is
        never unreachable, so they cannot both appear on one node — but keeping them apart costs nothing.)
      */}
      {data.isUnreachable ? (
        <span
          data-slot="flow-unreachable-badge"
          className="nodrag nopan pointer-events-none absolute right-0 bottom-full mb-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          Not reachable
        </span>
      ) : null}
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
