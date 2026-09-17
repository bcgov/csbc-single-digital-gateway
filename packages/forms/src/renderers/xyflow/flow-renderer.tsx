import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import {
  Background,
  Controls,
  Panel,
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
import {
  DEFAULT_ALGORITHM,
  DEFAULT_DIRECTION,
  // Aliased: the canvas component in this file is itself called `FlowLayout`.
  type FlowLayout as ElkLayout,
  type LayoutAlgorithm,
  type LayoutDirection,
} from './flow-elk';
import { FlowLayoutControls } from './flow-layout-controls';
import { useFlowLayout } from './use-flow-layout';
import { AddAffordance } from './add-affordance';
import { FlowContext, type FlowContextValue } from './flow-context';
import { FLOW_EMPTY_MESSAGE, useFlowEditor, type FlowEditor } from './flow-editor';
import {
  drawnNodes,
  elementsOf,
  flowNodeKind,
  FLOW_CHILD_MESSAGE,
  FLOW_NESTED_MESSAGE,
} from './flow-elements';
import { connectGesture, disconnectGesture } from './flow-gestures';
import { ConditionNode } from './condition-node';
import {
  ACTION_EDGE_TYPE,
  CONDITION_NODE_TYPE,
  STAGE_NODE_TYPE,
  toFlowEdges,
  toFlowNodes,
  type FlowNode,
} from './flow-nodes';
import { StageNode } from './stage-node';

// Stable identity — xyflow warns and re-creates every node when nodeTypes changes between renders. The same applies to
// edgeTypes (doc 198 rule 9), so both are module-level constants.
const NODE_TYPES: NodeTypes = {
  [STAGE_NODE_TYPE]: StageNode,
  [CONDITION_NODE_TYPE]: ConditionNode,
};
const EDGE_TYPES: EdgeTypes = { [ACTION_EDGE_TYPE]: ActionEdge };

type FlowProps = ReactFlowProps<FlowNode>;

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
  /** Doc 198 rule 31: refit when a new arrangement lands, so a changed algorithm or direction is in view. */
  readonly layout: ElkLayout;
}

/**
 * Doc 196 rule 15: refits the view whenever the canvas container resizes (a dock panel opening or closing) until the
 * author pans or zooms by hand. The observer's first report is the mount, which the `fitView` prop already handles.
 */
function FitOnResize({ target, userMoved, layout }: FitOnResizeProps) {
  const { fitView } = useReactFlow();
  // Rule 31: a new layout moves every node at once; the canvas follows it rather than leaving the flow off-screen.
  useEffect(() => {
    if (layout.positions.size > 0) void fitView();
  }, [fitView, layout]);
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
  // Doc 198 rules 30-32: the arrangement is a VIEW of the document, so it lives here rather than in the uischema.
  const [algorithm, setAlgorithm] = useState<LayoutAlgorithm>(DEFAULT_ALGORITHM);
  const [direction, setDirection] = useState<LayoutDirection>(DEFAULT_DIRECTION);
  const layout = useFlowLayout(uischema, { algorithm, direction });
  const context = useMemo<FlowContextValue>(
    () => ({ schema, path, enabled, renderers, cells, direction }),
    [schema, path, enabled, renderers, cells, direction],
  );
  const derivedNodes = useMemo(
    () => toFlowNodes(uischema, layout.positions),
    [uischema, layout.positions],
  );
  // Doc 198 rule 9: an edge component is given only its own id, so the Flow's element id — which the + needs for its
  // `insert-between` gesture — rides along in `data`. A view-only edge carries none, and draws no +.
  const derivedEdges = useMemo(() => {
    const edges = toFlowEdges(uischema, layout.routes);
    if (!editor) return edges;
    const flowId = editor.idOf(uischema);
    return edges.map((edge) => ({ ...edge, data: { ...edge.data, flowId } }));
  }, [uischema, layout.routes, editor]);
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

  // Doc 198 rule 30b: ELK answers AFTER the render that asked it, so its positions and routes are applied to the
  // nodes and edges already in state rather than re-seeding them — re-seeding would drop the edge selection that
  // Delete works on (doc 196 rule 7) every time a layout resolved.
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => {
        const position = layout.positions.get(node.id);
        return position === undefined ? node : { ...node, position };
      }),
    );
    setEdges((current) =>
      current.map((edge) => ({
        ...edge,
        data: { ...edge.data, points: layout.routes.get(edge.id) ?? [] },
      })),
    );
  }, [layout, setNodes, setEdges]);

  if (nested || inFlow) {
    return (
      <p role="alert" data-slot="flow-nested-error" className="text-sm text-destructive">
        {FLOW_NESTED_MESSAGE}
      </p>
    );
  }
  if (!visible) return null;
  // Doc 199 rule 22: a Flow legitimately holds two kinds of node, so a stray is something that is NEITHER.
  // Reading `isStage` alone flagged every Condition as an illegal child while still drawing its node.
  const strays = elementsOf(uischema).some((element) => flowNodeKind(element) === undefined);
  // Doc 199 rule 16: a Flow holding only a Condition is not empty — reading Stages alone would draw that node
  // and overlay the "add a stage" hint on top of it.
  const empty = editor !== null && drawnNodes(uischema).length === 0;

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
            {/* Rule 31: the layout controls sit on the canvas, opposite its zoom controls. */}
            <Panel position="top-right">
              <FlowLayoutControls
                algorithm={algorithm}
                direction={direction}
                onAlgorithmChange={setAlgorithm}
                onDirectionChange={setDirection}
              />
            </Panel>
            <FitOnResize target={canvasRef} userMoved={userMoved} layout={layout} />
          </ReactFlow>
          {empty && editor ? (
            // Doc 198 rule 12: with no palette to reach, an empty Flow needs its own way out of the empty state.
            <div
              data-slot="flow-empty"
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground"
            >
              <p>{FLOW_EMPTY_MESSAGE}</p>
              {/* Doc 199 rule 24: the origin + stays Stage-only — a Condition with nothing upstream to test
                  could hold no valid criterion (rule 26). */}
              <AddAffordance
                label="Add a stage"
                onAdd={() => editor.onGesture({ type: 'append', stageId: null, kind: 'stage' })}
              />
            </div>
          ) : null}
        </div>
      </div>
    </FlowContext.Provider>
  );
}

export const FlowLayoutRenderer = withJsonFormsLayoutProps(FlowLayout);
