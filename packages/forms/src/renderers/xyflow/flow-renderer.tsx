import type { LayoutProps } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Background, Controls, ReactFlow, useNodesState, type NodeTypes } from '@xyflow/react';
import { useContext, useMemo, useState } from 'react';
import { LayoutNestingContext } from '../gridstack/layout-nesting';
import { FlowContext, type FlowContextValue } from './flow-context';
import { elementsOf, FLOW_CHILD_MESSAGE, FLOW_NESTED_MESSAGE, isStage } from './flow-elements';
import { STAGE_NODE_TYPE, toFlowEdges, toFlowNodes } from './flow-nodes';
import { StageNode } from './stage-node';

// Stable identity — xyflow warns and re-creates every node when nodeTypes changes between renders.
const NODE_TYPES: NodeTypes = { [STAGE_NODE_TYPE]: StageNode };

/**
 * The Flow layout renderer (doc 195 rules 6-11). Anywhere but the root it renders an error. At the root it draws a
 * ReactFlow canvas — a node per Stage and the sanitised edges, both derived from the uischema — and provides the Flow's
 * dispatch props to the Stage nodes. The canvas is view-only: it pans and zooms, and nothing on it can be moved,
 * connected, selected or deleted.
 */
function FlowLayout({ uischema, schema, path, enabled, renderers, cells, visible }: LayoutProps) {
  const nested = useContext(LayoutNestingContext) !== null;
  const inFlow = useContext(FlowContext) !== null;
  const context = useMemo<FlowContextValue>(
    () => ({ schema, path, enabled, renderers, cells }),
    [schema, path, enabled, renderers, cells],
  );
  const derivedNodes = useMemo(() => toFlowNodes(uischema), [uischema]);
  const edges = useMemo(() => toFlowEdges(uischema), [uischema]);
  // xyflow applies its own measurements through onNodesChange, so the nodes live in state, re-seeded when the uischema
  // changes (React's "adjust state while rendering" pattern).
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  const [seeded, setSeeded] = useState(derivedNodes);
  if (seeded !== derivedNodes) {
    setSeeded(derivedNodes);
    setNodes(derivedNodes);
  }

  if (nested || inFlow) {
    return (
      <p role="alert" data-slot="flow-nested-error" className="text-sm text-destructive">
        {FLOW_NESTED_MESSAGE}
      </p>
    );
  }
  if (!visible) return null;
  const strays = elementsOf(uischema).some((element) => !isStage(element));

  return (
    <FlowContext.Provider value={context}>
      <div data-slot="flow" className="flex h-full min-h-96 w-full flex-col gap-2">
        {strays ? (
          <p role="alert" data-slot="flow-element-error" className="text-sm text-destructive">
            {FLOW_CHILD_MESSAGE}
          </p>
        ) : null}
        <div data-slot="flow-canvas" className="min-h-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={NODE_TYPES}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            deleteKeyCode={null}
            fitView
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </FlowContext.Provider>
  );
}

export const FlowLayoutRenderer = withJsonFormsLayoutProps(FlowLayout);
