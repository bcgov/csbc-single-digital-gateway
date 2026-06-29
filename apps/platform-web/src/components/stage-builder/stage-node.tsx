import { DragDropProvider } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';
import { FileText, GripVertical, Plus, Trash2 } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useStageBuilder } from './stage-context';
import { hasIncoming, hasOutgoing, type StagePage } from './stage-model';

/** A circular "+" at the end of a short connector stub off the node — clicking inserts a new
 * connected stage at that side (the stub reads like the start of the edge it will create). `top` is
 * the px offset to the first page row so it lines up with the (first-page-anchored) edges. */
function AddStageButton({
  side,
  top,
  onClick,
}: {
  side: 'left' | 'right';
  top: number;
  onClick: () => void;
}) {
  return (
    <div
      style={{ top }}
      className={`nodrag absolute z-10 flex -translate-y-1/2 items-center ${side === 'right' ? '-right-10 flex-row' : '-left-10 flex-row-reverse'}`}
    >
      <span className="h-px w-4 bg-border" aria-hidden />
      <button
        type="button"
        aria-label={side === 'right' ? 'Add stage after' : 'Add stage before'}
        onClick={onClick}
        className="flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary hover:text-primary"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** One page row inside a stage card — sortable (drag-to-reorder), click opens the form builder. */
function PageRow({ page, index, stageId }: { page: StagePage; index: number; stageId: string }) {
  const { removePage, selectPage } = useStageBuilder();
  const fieldCount = Object.keys(
    (page.schema.properties as Record<string, unknown> | undefined) ?? {},
  ).length;
  const { ref, handleRef } = useSortable({
    id: page.id,
    index,
    data: { index },
    transition: { duration: 0 },
  });
  return (
    <div
      ref={ref}
      className="nodrag flex items-center gap-1.5 rounded-md border border-border bg-background p-1.5"
    >
      <button
        ref={handleRef}
        type="button"
        aria-label="Reorder page"
        className="cursor-grab text-muted-foreground"
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => selectPage(stageId, page.id)}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate text-sm">{page.name}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
        </span>
      </button>
      <button
        type="button"
        aria-label="Remove page"
        onClick={() => removePage(stageId, page.id)}
        className="text-muted-foreground transition-colors hover:text-destructive"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/** A stage = a custom xyflow node: editable name, reorderable pages, "Add page", connection handles. */
export function StageNode({ id }: NodeProps) {
  const { def, addPage, reorderPages, renameStage, removeStage, addAfter, addBefore } =
    useStageBuilder();
  const pagesRef = useRef<HTMLDivElement>(null);
  // Anchor the edges + "+" stubs to the FIRST page row's vertical center, so they stay put no matter
  // how many pages a stage has (the first row's offset is constant; the node grows downward).
  const [anchorTop, setAnchorTop] = useState(64);
  const stage = def.stages.find((s) => s.id === id);
  const pageCount = stage?.pages.length ?? 0;
  useLayoutEffect(() => {
    const row = pagesRef.current?.firstElementChild as HTMLElement | null;
    if (row !== null && row !== undefined) {
      setAnchorTop(row.offsetTop + row.offsetHeight / 2);
    }
  }, [pageCount]);
  if (stage === undefined) {
    return null;
  }
  return (
    <div className="relative w-64 rounded-xl border border-border bg-card shadow-sm">
      {/* Handles only anchor the edges — connecting is done via the "+" buttons, not by dragging.
          Pinned to the first page row's center via `anchorTop`. */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="opacity-0"
        style={{ top: anchorTop }}
      />
      {!hasIncoming(def, stage.id) ? (
        <AddStageButton side="left" top={anchorTop} onClick={() => addBefore(stage.id)} />
      ) : null}
      {!hasOutgoing(def, stage.id) ? (
        <AddStageButton side="right" top={anchorTop} onClick={() => addAfter(stage.id)} />
      ) : null}
      <div className="flex items-center gap-1.5 border-b border-border p-2">
        <Input
          aria-label="Stage name"
          value={stage.name}
          onChange={(event) => renameStage(stage.id, event.target.value)}
          className="nodrag h-8 border-0 px-1 text-sm font-semibold shadow-none focus-visible:ring-0"
        />
        <button
          type="button"
          aria-label="Remove stage"
          onClick={() => removeStage(stage.id)}
          className="nodrag text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
      <DragDropProvider
        onDragEnd={(event) => {
          const { source, target } = event.operation;
          if (source === null || target === null) {
            return;
          }
          const from = (source.data as { index?: number }).index;
          const to = (target.data as { index?: number }).index;
          if (typeof from === 'number' && typeof to === 'number' && from !== to) {
            reorderPages(stage.id, from, to);
          }
        }}
      >
        <div ref={pagesRef} className="nodrag flex flex-col gap-1.5 p-2">
          {stage.pages.map((page, index) => (
            <PageRow key={page.id} page={page} index={index} stageId={stage.id} />
          ))}
        </div>
      </DragDropProvider>
      <div className="border-t border-border p-2">
        <Button
          size="xs"
          variant="outline"
          type="button"
          className="nodrag w-full"
          onClick={() => addPage(stage.id)}
        >
          <Plus className="size-3.5" aria-hidden />
          Add page
        </Button>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="opacity-0"
        style={{ top: anchorTop }}
      />
    </div>
  );
}
