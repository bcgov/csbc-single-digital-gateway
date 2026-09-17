import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useContext, useEffect, useMemo } from 'react';
import { ConditionOutputsProvider } from './condition-outputs';
import { FlowContext } from './flow-context';
import { targetSide } from './flow-handles';
import { useFlowEditor } from './flow-editor';
import { rowsOf } from './flow-elements';
import type { ConditionFlowNode } from './flow-nodes';

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities: handle sizes and colours
// need the important modifier (doc 196 rule 5).
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * Doc 199 rules 17-18, 37: the xyflow node every Condition is drawn with. One target handle, and on the source
 * face ONE SOURCE HANDLE PER ROW plus one for the Else path — each with an `id`, because an edge's
 * `sourceHandle` is matched against it and xyflow cannot otherwise tell several sources apart.
 *
 * Rule 43: the source handles are NOT rendered here. Each is pinned inside the row it belongs to
 * (`ConditionOutputHandle`), so the row's own position IS the attachment point and nothing has to be measured
 * or kept in step. This node renders the target handle, the card, and nothing else.
 */
export function ConditionNode({ id, data }: NodeProps<ConditionFlowNode>) {
  const flow = useContext(FlowContext);
  const editing = useFlowEditor() !== null;
  // Doc 199 rule 20: the card shows a + beside every output this set does NOT hold.
  const connected = useMemo(() => new Set(data.connectedOutputs), [data.connectedOutputs]);
  // Rule 49: xyflow caches each handle's geometry, so an edge stays where its handle USED to be until the node's
  // internals are updated. The rows are what carry the handles now, so their ids AND their order are the signal.
  const outputs = useMemo(
    () =>
      rowsOf(data.element)
        .map((row) => row.id)
        .join('/'),
    [data.element],
  );
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, outputs, updateNodeInternals]);
  if (!flow) return null;
  const { schema, path, enabled, renderers, cells } = flow;
  const handleClass = editing ? EDIT_HANDLE_CLASS : VIEW_HANDLE_CLASS;

  return (
    <>
      <Handle
        type="target"
        position={targetSide(flow.direction)}
        isConnectable={editing}
        className={handleClass}
      />
      {/* Doc 195 rule 15b: xyflow sets pointer-events: none on a node that is neither selectable nor
          draggable, and every child inherits it — so the card opts back in or presses fall through. */}
      <div data-slot="condition-node" className="pointer-events-auto">
        <ConditionOutputsProvider value={connected}>
          <JsonFormsDispatch
            uischema={data.element}
            schema={schema}
            path={path}
            enabled={enabled}
            {...(renderers ? { renderers } : {})}
            {...(cells ? { cells } : {})}
          />
        </ConditionOutputsProvider>
      </div>
    </>
  );
}
