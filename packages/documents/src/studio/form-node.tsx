import { Handle, Position, type NodeProps } from '@xyflow/react';
import type {
  EndNode as EndNodeType,
  FormNode as FormNodeType,
  LeadNode as LeadNodeType,
} from './canvas-graph';
import { useCanvasActions } from './canvas-actions';
import { FormPageBody } from './form-page';
import { NodeActions } from './node-actions';
import { useNodeConnect } from './use-connect-mode';
import { HIDDEN_HANDLE, InputHandle, NodeFrame } from './node-parts';

/**
 * One Form on the canvas: a card with its actions (Edit, Inspect, Delete — doc 234), an input unless it is first, and
 * one output below — or, while focused (doc 233), the same node grown into the Form's page, which has no actions.
 */
export function FormNode({ data, selected }: NodeProps<FormNodeType>) {
  const { remove, focus, inspect, edit, insert } = useCanvasActions();
  const { mark } = useNodeConnect(data.formId);
  const label = data.label ?? 'Untitled form';
  const focused = data.focused === true;
  return (
    <NodeFrame
      // A page carries no Start / End badges: nothing else is on the canvas for them to place it among.
      marks={focused ? { ...data, start: false, end: false } : data}
      // A page is selected by default (doc 233 rule 6) and alone on the canvas: a ring would only frame it.
      selected={selected && !focused}
      page={focused ? (data.open === true ? 'open' : 'growing') : undefined}
      connect={mark}
      slot="document-studio-form-node"
      // A fixed card height (CARD_HEIGHT), so it transitions to the page's height instead of jumping.
      className={focused ? 'text-sm' : 'h-14 px-3 py-2 text-sm'}
    >
      <InputHandle show={!data.first} />
      {focused ? (
        <FormPageBody
          label={label}
          page={data.page ?? null}
          open={data.open === true}
          onEdit={edit}
          onInsert={insert}
        />
      ) : (
        <>
          <NodeActions
            name={label}
            shown={selected}
            onEdit={() => focus(data.formId)}
            onInspect={() => inspect(data.formId)}
            onDelete={() => remove({ id: data.formId, kind: 'form', name: label })}
          />
          <p className="text-xs text-muted-foreground">Form</p>
          <p className="truncate text-sm font-medium">{label}</p>
          {data.closing === true && <FormPageBody label={label} page={data.page ?? null} closing />}
        </>
      )}
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
