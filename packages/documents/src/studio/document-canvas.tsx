import { mdiPlus } from '@mdi/js';
import { Icon } from '@mdi/react';
import { Button } from '@repo/ui/button';
import { Background, ReactFlow, useNodesState } from '@xyflow/react';
import { useMemo, useState } from 'react';
import { AddEdge } from './add-edge';
import { CanvasActionsContext, type CanvasActions } from './canvas-actions';
import {
  canvasGraph,
  type AddEdge as AddEdgeType,
  type AddTarget,
  type CanvasGraph,
  type CanvasNode,
} from './canvas-graph';
import { ConditionDialog } from './condition-dialog';
import { updateCondition } from './condition-edits';
import { ConditionNode } from './condition-node';
import type { Uischema } from './document-types';
import { EndNode, FormNode, LeadNode } from './form-node';
import { conditionsOf } from './funnel-model';
import { addAfter, addBefore, addBetween, newForm, removeNode, type NodeKind } from './node-edits';
import { upstreamFields } from './upstream-fields';

/** Module-level so xyflow sees a stable identity and never remounts every node or edge. */
const NODE_TYPES = { form: FormNode, condition: ConditionNode, end: EndNode, lead: LeadNode };
const EDGE_TYPES = { add: AddEdge };
const NO_EDGES: AddEdgeType[] = [];

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
}

/** The studio canvas: the variant's Forms and Conditions as nodes, or an offer to add the first form. */
export function DocumentCanvas({
  uischema,
  schema,
  onChange,
  selectedId = null,
  onSelect,
}: DocumentCanvasProps) {
  const graph = useMemo(() => canvasGraph(uischema, schema), [uischema, schema]);
  const [nodes, onNodesChange] = useGraphNodes(graph, selectedId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = conditionsOf(uischema).find((c) => c.id === editingId) ?? null;
  const actions = useEditActions(uischema, onChange, setEditingId);

  return (
    <CanvasActionsContext value={actions}>
      <div
        data-slot="document-studio-canvas"
        className="relative min-h-0 flex-1"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onSelect?.(null);
        }}
      >
        {/* xyflow's stylesheet is unlayered and beats Tailwind's layered utilities, hence the important modifier. */}
        <ReactFlow
          className="bg-gray-10!"
          nodes={nodes}
          edges={graph.kind === 'graph' ? graph.edges : NO_EDGES}
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
          deleteKeyCode={null}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
        <CanvasOverlay graph={graph} onAddForm={() => onChange(newForm())} />
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
    </CanvasActionsContext>
  );
}

/**
 * The graph's nodes, held in state: xyflow stores its node measurements through onNodesChange, so nodes cannot be
 * a derived prop. They are re-seeded whenever the graph changes (React's "adjust state while rendering" pattern).
 * The selected node is flagged on the way out, so selecting never re-seeds (and re-measures) the graph.
 */
function useGraphNodes(graph: CanvasGraph, selectedId: string | null) {
  const derived = graph.kind === 'graph' ? graph.nodes : [];
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(derived);
  const [seeded, setSeeded] = useState(graph);
  if (seeded !== graph) {
    setSeeded(graph);
    setNodes(derived);
  }
  const shown = useMemo(
    () => nodes.map((node) => (node.id === selectedId ? { ...node, selected: true } : node)),
    [nodes, selectedId],
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

/** What the nodes and edges can do: every edit goes through a pure function and out through `onChange`. */
function useEditActions(
  uischema: Uischema,
  onChange: (uischema: Uischema) => void,
  editCondition: (conditionId: string) => void,
): CanvasActions {
  return useMemo(
    () => ({
      add: (target, kind) => onChange(added(uischema, target, kind)),
      remove: (nodeId) => onChange(removeNode(uischema, nodeId)),
      editCondition,
    }),
    [uischema, onChange, editCondition],
  );
}

/** The variant with a node added where a + asked; a leading + only ever adds a Form. */
function added(uischema: Uischema, target: AddTarget, kind: NodeKind): Uischema {
  if (target.kind === 'between') return addBetween(uischema, target.edgeId, kind);
  if (target.kind === 'trailing') return addAfter(uischema, target.output, kind);
  return addBefore(uischema, target.nodeId);
}
