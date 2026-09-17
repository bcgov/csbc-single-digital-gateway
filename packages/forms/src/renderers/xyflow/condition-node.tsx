import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { ConditionOutputsProvider } from './condition-outputs';
import { FlowContext } from './flow-context';
import { outputOffset, sourceSide, targetSide } from './flow-handles';
import { useFlowEditor } from './flow-editor';
import { DEFAULT_HANDLE, rowsOf } from './flow-elements';
import type { ConditionFlowNode } from './flow-nodes';
import { useOutputOffsets } from './use-output-offsets';

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities: handle sizes and colours
// need the important modifier (doc 196 rule 5).
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * Doc 199 rules 17-18, 37: the xyflow node every Condition is drawn with. One target handle, and on the source
 * face ONE SOURCE HANDLE PER ROW plus one for the Else path — each with an `id`, because an edge's
 * `sourceHandle` is matched against it and xyflow cannot otherwise tell several sources apart.
 *
 * Rule 43: each output is CENTRED ON ITS ROW — the branch's row, or the Else row — so an edge visibly leaves
 * the branch it belongs to. The centres are measured from the card (`useOutputOffsets`), because only the DOM
 * knows where a row of wrapped text actually sits; until it has been measured, and on a vertical canvas where
 * the outputs leave the bottom edge and have no row to line up with, they spread evenly instead.
 */
export function ConditionNode({ id, data }: NodeProps<ConditionFlowNode>) {
  const flow = useContext(FlowContext);
  const editing = useFlowEditor() !== null;
  // Doc 199 rule 20: the card shows a + beside every output this set does NOT hold.
  const connected = useMemo(() => new Set(data.connectedOutputs), [data.connectedOutputs]);
  const cardRef = useRef<HTMLDivElement>(null);
  const offsets = useOutputOffsets(cardRef, data.element);
  const updateNodeInternals = useUpdateNodeInternals();
  // Rule 49: xyflow caches each handle's geometry, so an edge stays where the handle USED to be until the node's
  // internals are updated — after a row is added, removed, reordered, or simply measured for the first time.
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, offsets, updateNodeInternals]);
  if (!flow) return null;
  const { schema, path, enabled, renderers, cells } = flow;
  const handleClass = editing ? EDIT_HANDLE_CLASS : VIEW_HANDLE_CLASS;

  // The Else output is last, so adding a row never moves it past an existing branch (rule 45).
  const outputs = [...rowsOf(data.element).map((row) => row.id), DEFAULT_HANDLE];

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
      <div ref={cardRef} data-slot="condition-node" className="pointer-events-auto">
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
      {outputs.map((handleId, index) => (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={sourceSide(flow.direction)}
          isConnectable={editing}
          className={handleClass}
          // Doc 198 rule 32, doc 199 rule 43: down the face the edges leave by, on its own row where the card
          // has been measured.
          style={outputOffset(flow.direction, index, outputs.length, offsets[index])}
          data-output={handleId === DEFAULT_HANDLE ? 'default' : 'row'}
        />
      ))}
    </>
  );
}
