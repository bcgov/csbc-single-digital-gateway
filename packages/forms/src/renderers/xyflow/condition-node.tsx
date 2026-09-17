import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, type NodeProps } from '@xyflow/react';
import { useContext, useMemo } from 'react';
import { ConditionOutputsProvider } from './condition-outputs';
import { FlowContext } from './flow-context';
import { outputOffset, sourceSide, targetSide } from './flow-handles';
import { useFlowEditor } from './flow-editor';
import { criteriaOf, DEFAULT_HANDLE } from './flow-elements';
import type { ConditionFlowNode } from './flow-nodes';

// xyflow's stylesheet is imported unlayered, so it beats Tailwind's layered utilities: handle sizes and colours
// need the important modifier (doc 196 rule 5).
const EDIT_HANDLE_CLASS = 'size-2.5! border-ring! bg-background!';
const VIEW_HANDLE_CLASS = 'opacity-0';

/**
 * Doc 199 rules 17-18: the xyflow node every Condition is drawn with. One target handle on top, and on the
 * bottom ONE SOURCE HANDLE PER CRITERION plus one for the default path — each with an `id`, because an edge's
 * `sourceHandle` is matched against it and xyflow cannot otherwise tell several sources apart.
 *
 * The outputs are spread evenly across the bottom edge so each has its own attachment point; with one output the
 * single handle sits centred, exactly where a Stage's does.
 */
export function ConditionNode({ data }: NodeProps<ConditionFlowNode>) {
  const flow = useContext(FlowContext);
  const editing = useFlowEditor() !== null;
  // Doc 199 rule 20: the card shows a + beside every output this set does NOT hold.
  const connected = useMemo(() => new Set(data.connectedOutputs), [data.connectedOutputs]);
  if (!flow) return null;
  const { schema, path, enabled, renderers, cells } = flow;
  const handleClass = editing ? EDIT_HANDLE_CLASS : VIEW_HANDLE_CLASS;

  // The default is last, so adding a criterion never moves it past an existing branch.
  const outputs = [...criteriaOf(data.element).map(({ id }) => id), DEFAULT_HANDLE];

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
      {outputs.map((handleId, index) => (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={sourceSide(flow.direction)}
          isConnectable={editing}
          className={handleClass}
          // Doc 198 rule 32: spread along the face the edges leave by — the bottom edge, or the right one.
          style={outputOffset(flow.direction, index, outputs.length)}
          data-output={handleId === DEFAULT_HANDLE ? 'default' : 'criterion'}
        />
      ))}
    </>
  );
}
