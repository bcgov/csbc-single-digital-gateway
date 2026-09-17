import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, type NodeProps } from '@xyflow/react';
import { useContext } from 'react';
import { AddNodeMenu } from './add-affordance';
import { FlowContext } from './flow-context';
import {
  connectorClass,
  leadingAnchor,
  sourceSide,
  targetSide,
  trailingAnchor,
} from './flow-handles';
import { useFlowEditor } from './flow-editor';
import type { StageFlowNode } from './flow-nodes';

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities: handle sizes and colours need
// the important modifier to apply.
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * The xyflow node every Stage is drawn with (doc 195 rules 7, 15): the Stage element dispatched back through JSONForms
 * with the Flow's registry — so the registry, never a tester, decides whether it gets a studio frame — between a target
 * handle on top and a source handle beneath. View-only, the handles only anchor edges: not connectable, and hidden.
 * Under a Flow editor (doc 196 rule 5) they are visible and connectable.
 *
 * Doc 198 rules 3, 32: the handles sit on the faces the canvas direction puts them on, and everything that hangs off
 * the card — the leaf + and the Start marker — follows them. Changing the layout without moving them draws every edge,
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
        Doc 203 rule 8: the Flow's start Stage wears a marker beyond its target handle — the mirror of the leaf +
        beyond the source handle, with its connector line running toward the card. Both follow the canvas
        DIRECTION (doc 199 amendment 8): the leading face is the top of a vertical canvas and the left of a
        horizontal one. Purely presentational: it is not a Handle, never connectable, and `nodrag nopan` because
        xyflow pans from any press on the pane (doc 198 rule 20). Unlike the leaf +, it draws with or without an
        editor: a view-only Flow should still say where it begins.
      */}
      {data.isStart ? (
        <div
          data-slot="flow-start-marker"
          className={`nodrag nopan pointer-events-none absolute flex items-center ${leadingAnchor(flow.direction)}`}
        >
          <span className="rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground whitespace-nowrap">
            Start
          </span>
          <span aria-hidden="true" className={connectorClass(flow.direction)} />
        </div>
      ) : null}
      <Handle
        type="target"
        position={targetSide(flow.direction)}
        isConnectable={editing}
        className={handleClass}
      />
      <div
        data-slot="stage-node"
        // Doc 203 rule 9: a Stage no path from the start reaches is muted and outlined dashed. The outline sits
        // OUTSIDE the card's own border, so the two never fight.
        className={
          data.isUnreachable
            ? 'pointer-events-auto rounded-xl opacity-60 outline-2 outline-offset-2 outline-dashed outline-border'
            : 'pointer-events-auto'
        }
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
