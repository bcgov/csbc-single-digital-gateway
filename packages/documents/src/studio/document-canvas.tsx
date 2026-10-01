import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import {
  Background,
  PanOnScrollMode,
  ReactFlow,
  useNodesState,
  type Viewport,
} from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AddEdge } from './add-edge';
import { CanvasActionsContext, useEditActions } from './canvas-actions';
import { fitNow, MIN_ZOOM, type Zoomable } from './canvas-zoom';
import { focusEdges, focusNodes, focusRect, scrollExtent, type FocusFrame } from './focus-view';
import {
  focusedCard,
  moving,
  PAGE_PADDING,
  useFocusFrame,
  useKeepPageFitted,
  useZoomInOnFocus,
  useZoomOutOnBack,
} from './use-canvas-focus';
import {
  canvasGraph,
  type AddEdge as AddEdgeType,
  type CanvasGraph,
  type CanvasNode,
} from './canvas-graph';
import { ConditionDialog } from './condition-dialog';
import { updateCondition } from './condition-edits';
import { ConditionNode } from './condition-node';
import { ConnectPrompt } from './connect-overlay';
import { useDeleteGate, type DeleteChoice, type DeleteChoices } from './delete-gate';
import type { Uischema } from './document-types';
import { EndNode, FormNode, LeadNode } from './form-node';
import { conditionsOf } from './funnel-model';
import { newForm, removeNode } from './node-edits';
import { upstreamFields } from './upstream-fields';
import { ConnectViewContext, useConnectMode } from './use-connect-mode';

/** Module-level so xyflow sees a stable identity and never remounts every node or edge. */
const NODE_TYPES = { form: FormNode, condition: ConditionNode, end: EndNode, lead: LeadNode };
const EDGE_TYPES = { add: AddEdge };
const NO_EDGES: AddEdgeType[] = [];
const NO_INSPECT = () => {};
const NO_INSERT = () => {};
const ASK_EVERY_TIME: DeleteChoices = {};

export interface DocumentCanvasProps {
  /** The variant being edited. */
  uischema: Uischema;
  /** The document's schema: types the fields a Condition can test. */
  schema: Record<string, unknown>;
  onChange: (uischema: Uischema) => void;
  /** The selected Form's id (doc 232), or `null`. */
  selectedId?: string | null | undefined;
  /** A Form node was clicked (its id), or the empty canvas / Escape cleared the selection (`null`). */
  onSelect?: ((formId: string | null) => void) | undefined;
  /** The Form zoomed in on (doc 233) — drawn alone, as a page — or `null` for the flow. */
  focusedId?: string | null | undefined;
  /** A Form node was double-clicked, or its Edit used (doc 234): the zoom onto it has begun. */
  onFocus?: ((formId: string) => void) | undefined;
  /** A + on the focused page was used (doc 233 rule 9): leave the page, zooming out to the flow it now heads. */
  onUnfocus?: (() => void) | undefined;
  /** A Form's Inspect was used (doc 234 rule 7): select it and reveal the inspector. */
  onInspect?: ((formId: string) => void) | undefined;
  /** Deletes that no longer ask, by kind (doc 235 rule 13); default: every delete asks. */
  deleteChoices?: DeleteChoices | undefined;
  /** A delete was confirmed with "Don't ask me again" ticked: remember that choice for the kind. */
  onRememberDelete?: ((kind: 'form' | 'condition', choice: DeleteChoice) => void) | undefined;
  /** Places a palette item in a layout on a focused page (doc 238 rule 14); absent = nothing can be placed. */
  onInsert?: ((layoutId: string, index: number, itemId: string) => void) | undefined;
}

/**
 * The studio canvas: the variant's Forms and Conditions as nodes, or an offer to add the first form. Focusing a Form
 * (doc 233) grows THAT node into its page while everything else fades away and the viewport follows it; Back shrinks
 * it into the flow again.
 */
export function DocumentCanvas({
  uischema,
  schema,
  onChange,
  selectedId = null,
  onSelect,
  focusedId = null,
  onFocus,
  onUnfocus,
  onInspect,
  deleteChoices = ASK_EVERY_TIME,
  onRememberDelete,
  onInsert,
}: DocumentCanvasProps) {
  const instance = useRef<Zoomable | null>(null);
  const graph = useMemo(() => canvasGraph(uischema, schema), [uischema, schema]);
  const frame = useFocusFrame(uischema, schema, focusedId);
  const [nodes, onNodesChange] = useGraphNodes(graph, selectedId, frame);
  const edges = useMemo(
    () => focusEdges(graph.kind === 'graph' ? graph.edges : NO_EDGES, frame),
    [graph, frame],
  );
  const before = useRef<Viewport | null>(null);
  const [fitsFlowOnMount] = useState(focusedId === null);
  const extent = useScrollExtent(graph, nodes, frame);
  const canvas = useRef<HTMLDivElement | null>(null);
  const settledCard = frame.settled ? focusedCard(graph, frame.id) : undefined;
  const fitBounds = useMemo(
    () => (settledCard === undefined ? undefined : focusRect(settledCard, frame.keepsTrailing)),
    [settledCard, frame.keepsTrailing],
  );
  useKeepPageFitted(canvas, instance, fitBounds);
  useZoomInOnFocus(focusedId, frame.keepsTrailing, graph, instance);
  useZoomOutOnBack(focusedId, nodes, instance, before);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = conditionsOf(uischema).find((c) => c.id === editingId) ?? null;
  const unfocus = focusedId === null ? undefined : onUnfocus;
  const focusForm = useCallback(
    (formId: string) => {
      if (focusedId !== null) return;
      // Remembered so Back can return the camera exactly here; the zoom itself is useZoomInOnFocus's.
      before.current = instance.current?.getViewport() ?? null;
      onFocus?.(formId);
    },
    [focusedId, onFocus],
  );
  const removeNow = useCallback(
    (nodeId: string, choice: DeleteChoice) =>
      onChange(removeNode(uischema, nodeId, { subtree: choice === 'subtree' })),
    [uischema, onChange],
  );
  const { request: remove, gate } = useDeleteGate(deleteChoices, removeNow, onRememberDelete);
  const connectMode = useConnectMode(uischema, graph, onChange);
  const actions = useEditActions(uischema, onChange, unfocus, {
    remove,
    editCondition: setEditingId,
    focus: focusForm,
    inspect: onInspect ?? NO_INSPECT,
    startConnect: connectMode.start,
    // Connecting needs other nodes on the flow: never on a page, never from a lone Form (doc 235 rule 2).
    canConnect: focusedId === null && uischema['type'] === 'Funnel',
    insert: onInsert ?? NO_INSERT,
  });

  return (
    <CanvasActionsContext value={actions}>
      <div
        ref={canvas}
        data-slot="document-studio-canvas"
        data-focused={focusedId === null ? undefined : ''}
        data-connecting={connectMode.connecting ? '' : undefined}
        className={`relative min-h-0 flex-1 ${connectMode.canvasClass}`}
        onClickCapture={connectMode.onClickCapture}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onSelect?.(null);
        }}
      >
        {/* xyflow's stylesheet is unlayered and beats Tailwind's layered utilities, hence the important modifier. */}
        <ConnectViewContext
          value={
            connectMode.view === null
              ? null
              : { view: connectMode.view, chooseOutput: connectMode.chooseOutput }
          }
        >
          <ReactFlow
            className="bg-gray-10!"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            nodesDraggable={false}
            nodesConnectable={false}
            // Selection is the studio's (doc 232), not xyflow's: only Form nodes select, by click.
            elementsSelectable={false}
            onNodeClick={(_, node) => {
              if (node.type === 'form') onSelect?.(node.id);
            }}
            onPaneClick={() => onSelect?.(null)}
            onNodeDoubleClick={(_, node) => {
              if (node.type === 'form') focusForm(node.id);
            }}
            onInit={(flow) => {
              instance.current = flow;
              // A page open from the start is fitted to its first screen, as a double-click would — not to its whole
              // content height, which is what ReactFlow's own fitView would show.
              const card = focusedCard(graph, focusedId);
              if (card !== undefined)
                fitNow(flow, focusRect(card, frame.keepsTrailing), PAGE_PADDING);
            }}
            zoomOnDoubleClick={false}
            // Focused, the page reads like a document (doc 233 rule 12): no drag-pan or zoom; the wheel scrolls it
            // up and down, bounded by the page once it has settled.
            {...(focusedId !== null && FOCUSED_VIEWPORT)}
            {...(extent !== undefined && { translateExtent: extent })}
            minZoom={MIN_ZOOM}
            deleteKeyCode={null}
            fitView={fitsFlowOnMount}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
          </ReactFlow>
        </ConnectViewContext>
        <CanvasOverlay graph={graph} onAddForm={() => onChange(newForm())} />
        {connectMode.connecting && <ConnectPrompt />}
        {/* While a Form grows or shrinks, nothing may reach the canvas: any press (a third click, a drag, a wheel)
            interrupts d3's camera transition mid-way and strands the view at its in-between zoom (doc 233 rule 8). */}
        {moving(frame) && (
          <div
            aria-hidden
            data-slot="document-studio-canvas-shield"
            className="absolute inset-0 z-20"
          />
        )}
      </div>
      <ConditionDialog
        condition={editing}
        fields={editing === null ? [] : upstreamFields(schema, uischema, editing.id)}
        onClose={() => setEditingId(null)}
        onSave={(edit) => {
          if (editing !== null) onChange(updateCondition(uischema, editing.id, edit));
          setEditingId(null);
        }}
      />
      {gate}
    </CanvasActionsContext>
  );
}

/** The viewport while a page is focused: scroll vertically, at the wheel's own speed; never drag-pan or zoom. */
const FOCUSED_VIEWPORT = {
  panOnDrag: false,
  zoomOnScroll: false,
  zoomOnPinch: false,
  panOnScroll: true,
  panOnScrollMode: PanOnScrollMode.Vertical,
  panOnScrollSpeed: 1,
} as const;

/** How far a settled page scrolls; `undefined` (unbounded) for the flow, and while a page grows or shrinks. */
function useScrollExtent(graph: CanvasGraph, nodes: CanvasNode[], frame: FocusFrame) {
  const card = frame.settled ? focusedCard(graph, frame.id) : undefined;
  const height = nodes.find((node) => node.id === frame.id)?.measured?.height;
  return useMemo(
    () => (card === undefined ? undefined : scrollExtent(card, height, frame.keepsTrailing)),
    [card, height, frame.keepsTrailing],
  );
}

/**
 * The graph's nodes, held in state: xyflow stores its node measurements through onNodesChange, so nodes cannot be
 * a derived prop. They are re-seeded whenever the graph changes (React's "adjust state while rendering" pattern).
 * The selected node is flagged on the way out, so selecting never re-seeds (and re-measures) the graph.
 */
function useGraphNodes(graph: CanvasGraph, selectedId: string | null, frame: FocusFrame) {
  const derived = graph.kind === 'graph' ? graph.nodes : [];
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(derived);
  const [seeded, setSeeded] = useState(graph);
  if (seeded !== graph) {
    setSeeded(graph);
    setNodes(derived);
  }
  const shown = useMemo(
    () =>
      focusNodes(
        nodes.map((node) => (node.id === selectedId ? { ...node, selected: true } : node)),
        frame,
      ),
    [nodes, selectedId, frame],
  );
  return [shown, onNodesChange] as const;
}

/** What sits over the canvas when there is no graph to draw: the first "Add a form", or why the root can't be drawn. */
function CanvasOverlay({ graph, onAddForm }: { graph: CanvasGraph; onAddForm: () => void }) {
  if (graph.kind === 'empty') {
    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Button variant="ghost" className="pointer-events-auto" onClick={onAddForm}>
          <Icon path={mdiPlus} size="16px" />
          Add a form to get started
        </Button>
      </div>
    );
  }
  if (graph.kind === 'unsupported') {
    return (
      <p
        role="alert"
        className="absolute inset-x-0 top-4 text-center text-sm text-destructive"
        data-slot="document-studio-unsupported"
      >
        The canvas can't show a {String(graph.type)} root — it expects a Form or a Funnel.
      </p>
    );
  }
  return null;
}
