import { JsonFormsDispatch } from '@jsonforms/react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useContext } from 'react';
import { FlowContext } from './flow-context';
import type { StageFlowNode } from './flow-nodes';

/**
 * The xyflow node every Stage is drawn with (doc 195 rules 7, 15): the Stage element dispatched back through JSONForms
 * with the Flow's registry — so the registry, never a tester, decides whether it gets a studio frame — between a target
 * handle on the left and a source handle on the right. The handles only anchor edges: not connectable, and hidden.
 *
 * Rule 15b: xyflow sets `pointer-events: none` on a node that is neither selectable nor draggable, which every child
 * inherits — so a press on the card would fall through to the pane (in the studio, selecting the Flow instead of the
 * Stage). The dispatched Stage sits in a `pointer-events-auto` wrapper so it can be pressed; the handles stay inert.
 */
export function StageNode({ data }: NodeProps<StageFlowNode>) {
  const flow = useContext(FlowContext);
  if (!flow) return null;
  const { schema, path, enabled, renderers, cells } = flow;
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} className="opacity-0" />
      <div data-slot="stage-node" className="pointer-events-auto">
        <JsonFormsDispatch
          uischema={data.element}
          schema={schema}
          path={path}
          enabled={enabled}
          {...(renderers ? { renderers } : {})}
          {...(cells ? { cells } : {})}
        />
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} className="opacity-0" />
    </>
  );
}
