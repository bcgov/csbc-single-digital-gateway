import { Handle, Position, type NodeProps } from '@xyflow/react';
import type {
  EndNode as EndNodeType,
  FormNode as FormNodeType,
  LeadNode as LeadNodeType,
} from './canvas-graph';
import { HIDDEN_HANDLE, InputHandle, NodeDeleteButton, NodeFrame } from './node-parts';

/** One Form on the canvas: a card with a delete button, an input unless it is first, and one output below. */
export function FormNode({ data, selected }: NodeProps<FormNodeType>) {
  const label = data.label ?? 'Untitled form';
  return (
    <NodeFrame
      marks={data}
      selected={selected}
      slot="document-studio-form-node"
      className="px-3 py-2 text-sm"
    >
      <InputHandle show={!data.first} />
      <NodeDeleteButton nodeId={data.formId} name={label} />
      <p className="text-xs text-muted-foreground">Form</p>
      <p className="truncate text-sm font-medium">{label}</p>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
    </NodeFrame>
  );
}

/**
 * Where a trailing edge ends: a point with a target handle and nothing to see. It must have a real size: xyflow
 * never initialises a 0×0 node, and an edge to an uninitialised node is not drawn at all.
 */
export function EndNode(_props: NodeProps<EndNodeType>) {
  return (
    <div data-slot="document-studio-end-node" className="size-px">
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
    </div>
  );
}

/** Where a headless Condition's leading edge starts: like an end node, a real-sized point, with a source handle. */
export function LeadNode(_props: NodeProps<LeadNodeType>) {
  return (
    <div data-slot="document-studio-lead-node" className="size-px">
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className={HIDDEN_HANDLE}
      />
    </div>
  );
}
