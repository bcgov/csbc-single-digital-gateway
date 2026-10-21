import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useContext, useEffect, useMemo } from 'react';
import { ConditionOutputsProvider } from './condition-outputs';
import { FlowContext } from './flow-context';
import { targetSide } from './flow-handles';
import { useFlowEditor } from './flow-editor';
import { rowsOf } from './flow-elements';
import type { ConditionFlowNode } from './flow-nodes';
import { NodeBadge, ringClass } from './node-badge';
import { DEFAULT_HANDLE } from './flow-elements';

/** Doc 199 rule 45b: what a red ring on a Condition says in words, most serious first. */
export const UNREACHABLE_LABEL = 'Not reachable';
export const NO_OUTPUTS_LABEL = 'No outputs';
export const NO_ELSE_LABEL = 'No Else path';

/**
 * Rule 45b: why this Condition can never route an answer, or `null` when it can.
 *
 * Read entirely off `connectedOutputs`, which `toFlowNodes` already derives from the Flow's edges — a Condition
 * with nothing in that set has no outgoing edge at all, and one missing `DEFAULT_HANDLE` has no Else path. The
 * order matters: an unwired Condition also has no Else path, and "No outputs" is the more useful of the two to
 * be told; being unreachable outranks both, since nothing downstream of it can matter.
 */
function conditionFault(data: ConditionFlowNode['data']): string | null {
  if (data.isUnreachable) return UNREACHABLE_LABEL;
  if (data.connectedOutputs.length === 0) return NO_OUTPUTS_LABEL;
  return data.connectedOutputs.includes(DEFAULT_HANDLE) ? null : NO_ELSE_LABEL;
}

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities: handle sizes and colours
// need the important modifier (doc 196 rule 5).
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * Doc 199 rules 17-18, 37: the xyflow node every Condition is drawn with. One target handle, and on the source
 * face ONE SOURCE HANDLE PER ROW plus one for the Else path — each with an `id`, because an edge's
 * `sourceHandle` is matched against it and xyflow cannot otherwise tell several sources apart.
 *
 * Doc 199 rule 45b (user 2026-09-17: "red should be reserved for parsing errors: conditions with no outputs
 * or default cases", and "red should also be used for unreachable"): a Condition wears a RED ring, and a pill
 * naming the fault, when it can never route an answer anywhere —
 *   - nothing is wired to it at all,
 *   - it has no Else path, so an answer matching no row has nowhere to go (rule 13's `flowProblems` entry), or
 *   - no path from the flow's start reaches it (doc 203 rule 9, widened to Conditions).
 * All three are faults in the document rather than states of a working flow, which is what red now means; a
 * Stage's end ring went BLACK in the same change so the two can never be confused.
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
  const fault = conditionFault(data);
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
      {fault === null ? null : <NodeBadge label={fault} tone="danger" />}
      {/* Doc 195 rule 15b: xyflow sets pointer-events: none on a node that is neither selectable nor
          draggable, and every child inherits it — so the card opts back in or presses fall through. */}
      <div
        data-slot="condition-node"
        className={
          fault === null
            ? 'pointer-events-auto'
            : `pointer-events-auto rounded-xl ${ringClass('danger')}`
        }
        {...(fault === null ? {} : { 'data-fault': '' })}
      >
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
