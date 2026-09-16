import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type EdgeTypes,
  type NodeTypes,
  type ReactFlowProps,
} from '@xyflow/react';
import { useContext, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { LayoutNestingContext } from '../gridstack/layout-nesting';
import { ActionEdge } from './action-edge';
import { AddAffordance } from './add-affordance';
import { FlowContext, type FlowContextValue } from './flow-context';
import { FLOW_EMPTY_MESSAGE, useFlowEditor, type FlowEditor } from './flow-editor';
import {
  drawnStages,
  elementsOf,
  FLOW_CHILD_MESSAGE,
  FLOW_NESTED_MESSAGE,
  isStage,
} from './flow-elements';
import { connectGesture, disconnectGesture } from './flow-gestures';
import {
  ACTION_EDGE_TYPE,
  STAGE_NODE_TYPE,
  toFlowEdges,
  toFlowNodes,
  type StageFlowNode,
} from './flow-nodes';
import { StageNode } from './stage-node';

// Stable identity — xyflow warns and re-creates every node when nodeTypes changes between renders. The same applies to
// edgeTypes (doc 198 rule 9), so both are module-level constants.
const NODE_TYPES: NodeTypes = { [STAGE_NODE_TYPE]: StageNode };
const EDGE_TYPES: EdgeTypes = { [ACTION_EDGE_TYPE]: ActionEdge };

type FlowProps = ReactFlowProps<StageFlowNode>;

/** Doc 195 rule 11: nothing on a view-only canvas can be moved, connected, selected or deleted. */
const VIEW_ONLY_PROPS: FlowProps = {
  nodesDraggable: false,
  nodesConnectable: false,
  elementsSelectable: false,
  deleteKeyCode: null,
};

/**
 * Doc 196 rules 5-7: an editable canvas connects handles that `canConnect` allows and turns Delete / Backspace on
 * selected edges into a disconnect. xyflow never changes anything itself — `onBeforeDelete` resolves `false` — so the
 * uischema stays the only source of truth.
 *
 * Doc 198 rule 4: Stages are NOT draggable even here. Positions are derived (rules 1-2), so a drag could not persist.
 */
function editingProps(editor: FlowEditor, flow: UISchemaElement): FlowProps {
  const flowId = editor.idOf(flow);
  const emit = (gesture: ReturnType<typeof connectGesture>) => {
    if (gesture) editor.onGesture(gesture);
  };
  return {
    nodesDraggable: false,
    nodesConnectable: true,
    elementsSelectable: true,
    selectionOnDrag: false,
    multiSelectionKeyCode: null,
    deleteKeyCode: ['Delete', 'Backspace'],
    isValidConnection: ({ source, target }) => editor.canConnect(flow, source, target),
    onConnect: (connection) => emit(connectGesture(flowId, connection)),
    onBeforeDelete: ({ edges }) => {
      emit(disconnectGesture(flowId, edges));
      return Promise.resolve(false);
    },
  };
}

interface FitOnResizeProps {
  readonly target: RefObject<HTMLElement | null>;
  readonly userMoved: RefObject<boolean>;
}

/**
 * Doc 196 rule 15: refits the view whenever the canvas container resizes (a dock panel opening or closing) until the
 * author pans or zooms by hand. The observer's first report is the mount, which the `fitView` prop already handles.
 */
function FitOnResize({ target, userMoved }: FitOnResizeProps) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const element = target.current;
    if (!element) return undefined;
    let mounted = false;
    const observer = new ResizeObserver(() => {
      if (mounted && !userMoved.current) void fitView();
      mounted = true;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fitView, target, userMoved]);
  return null;
}

/**
 * The Flow layout renderer (doc 195 rules 6-11). Anywhere but the root it renders an error. At the root it draws a
 * ReactFlow canvas — a node per Stage and the sanitised edges, both derived from the uischema — and provides the Flow's
 * dispatch props to the Stage nodes. Without a Flow editor the canvas is view-only; under one it is editable (doc 196).
 */
function FlowLayout({ uischema, schema, path, enabled, renderers, cells, visible }: LayoutProps) {
  const nested = useContext(LayoutNestingContext) !== null;
  const inFlow = useContext(FlowContext) !== null;
  const editor = useFlowEditor();
  const canvasRef = useRef<HTMLDivElement>(null);
  const userMoved = useRef(false);
  const context = useMemo<FlowContextValue>(
    () => ({ schema, path, enabled, renderers, cells }),
    [schema, path, enabled, renderers, cells],
  );
  const derivedNodes = useMemo(() => toFlowNodes(uischema), [uischema]);
  // Doc 198 rule 9: an edge component is given only its own id, so the Flow's element id — which the + needs for its
  // `insert-between` gesture — rides along in `data`. A view-only edge carries none, and draws no +.
  const derivedEdges = useMemo(() => {
    const edges = toFlowEdges(uischema);
    if (!editor) return edges;
    const flowId = editor.idOf(uischema);
    return edges.map((edge) => ({ ...edge, data: { flowId } }));
  }, [uischema, editor]);
  const flowProps = useMemo(
    () => (editor ? editingProps(editor, uischema) : VIEW_ONLY_PROPS),
    [editor, uischema],
  );
  // xyflow applies its own measurements (nodes) and selection (edges, doc 196 rule 7) through its change handlers, so
  // both live in state, re-seeded when the uischema changes (React's "adjust state while rendering" pattern). Edges
  // passed as derived props with no onEdgesChange never become selected, so Delete has nothing to delete.
  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges);
  const [seeded, setSeeded] = useState(uischema);
  if (seeded !== uischema) {
    setSeeded(uischema);
    setNodes(derivedNodes);
    setEdges(derivedEdges);
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
  const empty = editor !== null && drawnStages(uischema).length === 0;

  return (
    <FlowContext.Provider value={context}>
      <div data-slot="flow" className="flex h-full min-h-96 w-full flex-col gap-2">
        {strays ? (
          <p role="alert" data-slot="flow-element-error" className="text-sm text-destructive">
            {FLOW_CHILD_MESSAGE}
          </p>
        ) : null}
        <div ref={canvasRef} data-slot="flow-canvas" className="relative min-h-0 flex-1">
          <ReactFlow
            {...flowProps}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            fitView
            onMoveStart={(event) => {
              // Only a pan or zoom by hand has an event; fitView and the Controls buttons do not.
              if (event) userMoved.current = true;
              if (event) editor?.onGestureActive?.(true);
            }}
            onMoveEnd={(event) => {
              if (event) editor?.onGestureActive?.(false);
            }}
          >
            <Background />
            <Controls showInteractive={false} />
            <FitOnResize target={canvasRef} userMoved={userMoved} />
          </ReactFlow>
          {empty && editor ? (
            // Doc 198 rule 12: with no palette to reach, an empty Flow needs its own way out of the empty state.
            <div
              data-slot="flow-empty"
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <p>{FLOW_EMPTY_MESSAGE}</p>
              <AddAffordance
                label="Add a stage"
                onAdd={() => editor.onGesture({ type: 'append', stageId: null })}
              />
            </div>
          ) : null}
        </div>
      </div>
    </FlowContext.Provider>
  );
}

export const FlowLayoutRenderer = withJsonFormsLayoutProps(FlowLayout);
