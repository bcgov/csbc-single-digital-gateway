import {
  Background,
  Controls,
  ReactFlow,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@repo/ui/button';
import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FormBuilderDialog } from '@/components/form-builder/builder-dialog';
import { StageBuilderContext, type StageBuilderApi } from './stage-context';
import { StageNode } from './stage-node';
import {
  addPage,
  addStage,
  addStageAfter,
  addStageBefore,
  disconnect,
  removePage,
  removeStage,
  reorderPages,
  renameStage,
  updatePageDefinition,
  type MultiStageDefinition,
} from './stage-model';

// Stable reference — xyflow warns/recreates if nodeTypes changes identity each render.
const nodeTypes: NodeTypes = { stage: StageNode };

// Nodes are NOT user-draggable; lay them out top-aligned, left-to-right by flow/array order.
const toNodes = (def: MultiStageDefinition): Node[] =>
  def.stages.map((stage, i) => ({
    id: stage.id,
    type: 'stage',
    position: { x: i * 320, y: 0 },
    data: {},
  }));

const toEdges = (def: MultiStageDefinition): Edge[] =>
  def.edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }));

/** Re-fit the viewport (with margin) whenever the stage count changes — rendered inside ReactFlow. */
function FitOnChange({ count }: { count: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 200 });
    });
    return () => cancelAnimationFrame(raf);
  }, [count, fitView]);
  return null;
}

/** Node-based editor for a multi-stage form. Controlled by `value`; every edit calls `onChange`. */
export function StageBuilder({
  value,
  onChange,
}: {
  value: MultiStageDefinition;
  onChange: (value: MultiStageDefinition) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toNodes(value));
  const [editing, setEditing] = useState<{ stageId: string; pageId: string } | null>(null);

  // Rebuild nodes when the SET of stages changes (add/remove); positions come from the model.
  const stageKey = value.stages.map((s) => s.id).join(',');
  useEffect(() => {
    setNodes(toNodes(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resync only when stages are added/removed
  }, [stageKey, setNodes]);

  const edges = useMemo(() => toEdges(value), [value]);

  const api: StageBuilderApi = {
    def: value,
    addPage: (stageId) => onChange(addPage(value, stageId)),
    removePage: (stageId, pageId) => onChange(removePage(value, stageId, pageId)),
    reorderPages: (stageId, from, to) => onChange(reorderPages(value, stageId, from, to)),
    renameStage: (stageId, name) => onChange(renameStage(value, stageId, name)),
    removeStage: (stageId) => {
      if (globalThis.confirm('Delete this stage and all its pages?')) {
        onChange(removeStage(value, stageId));
      }
    },
    selectPage: (stageId, pageId) => setEditing({ stageId, pageId }),
    addAfter: (stageId) => onChange(addStageAfter(value, stageId)),
    addBefore: (stageId) => onChange(addStageBefore(value, stageId)),
  };

  const activeStage = editing ? value.stages.find((s) => s.id === editing.stageId) : undefined;
  const activePage = activeStage?.pages.find((p) => p.id === editing?.pageId);

  return (
    <StageBuilderContext.Provider value={api}>
      <div className="relative h-full w-full">
        <div className="absolute left-3 top-3 z-10">
          <Button size="sm" type="button" onClick={() => onChange(addStage(value))}>
            <Plus className="size-4" aria-hidden />
            Add stage
          </Button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          onNodesChange={onNodesChange}
          onEdgesDelete={(deleted) => {
            onChange(deleted.reduce((acc, edge) => disconnect(acc, edge.id), value));
          }}
          fitView
        >
          <Background />
          <Controls />
          <FitOnChange count={value.stages.length} />
        </ReactFlow>
      </div>
      {activePage && editing ? (
        <FormBuilderDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null);
            }
          }}
          title={`Edit page — ${activePage.name}`}
          value={{ schema: activePage.schema, uischema: activePage.uischema }}
          onChange={(definition) =>
            onChange(updatePageDefinition(value, editing.stageId, editing.pageId, definition))
          }
        />
      ) : null}
    </StageBuilderContext.Provider>
  );
}
