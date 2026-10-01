import { mdiRhombusOutline } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { useEffect } from 'react';
import { useCanvasActions } from './canvas-actions';
import type { ConditionNode as ConditionNodeType } from './canvas-graph';
import { HIDDEN_HANDLE, InputHandle, NodeDeleteButton, NodeFrame } from './node-parts';

/**
 * A Condition on the canvas: one input, and one output per branch plus the default, spread along its bottom edge in
 * that order. The card body opens the condition dialog. xyflow caches handle positions, so it is told whenever the
 * set of outputs changes.
 */
export function ConditionNode({ id, data }: NodeProps<ConditionNodeType>) {
  const { editCondition } = useCanvasActions();
  const updateNodeInternals = useUpdateNodeInternals();
  const outputsKey = data.outputs.join('|');
  useEffect(() => updateNodeInternals(id), [id, outputsKey, updateNodeInternals]);
  const name = data.label ?? 'Untitled condition';
  const branches = data.outputs.length - 1;

  return (
    <NodeFrame marks={data} slot="document-studio-condition-node" className="text-sm">
      <InputHandle show={!data.first} />
      <NodeDeleteButton nodeId={data.conditionId} name={name} />
      <button
        type="button"
        aria-label={`Edit ${name}`}
        className="nodrag nopan flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted/50"
        onClick={() => editCondition(data.conditionId)}
      >
        <Icon path={mdiRhombusOutline} size="16px" className="shrink-0 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block text-xs text-muted-foreground">Condition</span>
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block text-xs text-muted-foreground">
            {branches} {branches === 1 ? 'branch' : 'branches'} + otherwise
          </span>
        </span>
      </button>
      {data.outputs.map((handle, i) => (
        <Handle
          key={handle}
          id={handle}
          type="source"
          position={Position.Bottom}
          isConnectable={false}
          className={HIDDEN_HANDLE}
          style={{ left: `${((i + 1) / (data.outputs.length + 1)) * 100}%` }}
        />
      ))}
    </NodeFrame>
  );
}
