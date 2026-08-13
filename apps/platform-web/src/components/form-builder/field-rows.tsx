import { CollisionPriority } from '@dnd-kit/abstract';
import { useDroppable } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import { GripVertical, Trash2 } from 'lucide-react';
import { DisplayCard } from './display-card';
import { ROOT_GROUP, containerId, controlId, displayId, groupId } from './dnd';
import { FieldPreview, previewNodeForType } from './field-card';
import { type FieldTypeId } from './field-types';
import type { ContainerNode, ControlNode, DisplayNode, Path } from './model';

export function pathEq(a: Path | null, b: Path): boolean {
  return a !== null && a.length === b.length && a.every((v, i) => v === b[i]);
}

// Sortable rows never animate position changes. NOTE: `transition: null` does NOT work — @dnd-kit's
// useSortable spreads `{...defaultSortableTransition, ...input.transition}`, and spreading null is a
// no-op, so it silently keeps the 250ms default. `duration: 0` is the real "no animation" path (it's
// what @dnd-kit itself uses for reduced-motion). The during-drag gap still opens; only the slide is gone.
const NO_SLIDE = { transition: { duration: 0 } } as const;

/** The gap shown where a dragged field will land — a ghost of the actual field for palette drags. */
function DropPlaceholder({ fieldType }: { fieldType: FieldTypeId | null }) {
  return fieldType !== null ? (
    <FieldPreview node={previewNodeForType(fieldType)} ghost />
  ) : (
    <div
      aria-hidden
      className="h-11 rounded-lg border-2 border-dashed border-primary bg-primary/10"
    />
  );
}

/** Delete affordance pinned to the top-right corner on the border; shown on hover or when selected. */
function DeleteHandle({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onDelete}
      className="absolute -right-2.5 -top-2.5 z-10 hidden size-6 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors group-hover:flex group-data-[selected]:flex hover:border-destructive hover:text-destructive"
    >
      <Trash2 className="size-3.5" aria-hidden />
    </button>
  );
}

/**
 * A field (a data-collecting control OR a display-only node) rendered as a sortable row. Default
 * plugins → live reflow opens the reorder gap. Controls are addressed by `f:<key>`, display nodes
 * by `d:<id>` — both share the `'field'` sortable type so they interleave freely in a list.
 */
export function FieldRow({
  node,
  index,
  group,
  path,
  selected,
  paletteDragType,
  onSelect,
  onDelete,
  onChangeDisplay,
}: {
  node: ControlNode | DisplayNode;
  index: number;
  group: string;
  path: Path;
  selected: boolean;
  paletteDragType: FieldTypeId | null;
  onSelect: (path: Path) => void;
  onDelete: (path: Path) => void;
  onChangeDisplay: (path: Path, patch: Partial<DisplayNode>) => void;
}) {
  const { ref, handleRef, isDragSource, isDropTarget } = useSortable({
    id: node.kind === 'control' ? controlId(node.key) : displayId(node.id),
    index,
    group,
    type: 'field',
    accept: ['field', 'palette-item'],
    // `path` drives moveField; `container`/`index` let a palette drop ON this row insert here;
    // `node` lets the drag overlay render this field as its real control.
    data: { path, container: path.length === 2 ? path[0] : null, index, node },
    ...NO_SLIDE,
  });
  return (
    <div
      ref={ref}
      data-selected={selected || undefined}
      data-dragging={isDragSource || undefined}
      className="group flex flex-col gap-2"
    >
      {paletteDragType !== null && isDropTarget && !isDragSource ? (
        <DropPlaceholder fieldType={paletteDragType} />
      ) : null}
      <div className="relative">
        <DeleteHandle label="Remove field" onDelete={() => onDelete(path)} />
        {/* Clicking anywhere in the card selects it. The drag handle stops propagation so it never
            selects, and the inner control/display keep their own keyboard-select affordance. */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          onClick={() => onSelect(path)}
          className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-card p-3 group-data-[dragging]:opacity-40 group-data-[selected]:border-primary group-data-[selected]:ring-1 group-data-[selected]:ring-primary"
        >
          <button
            ref={handleRef}
            type="button"
            aria-label="Reorder field"
            onClick={(event) => event.stopPropagation()}
            className="mt-1 cursor-grab text-muted-foreground"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          {node.kind === 'display' ? (
            // Content is edited inline; clicking/focusing the card selects it so the inspector shows
            // its config (e.g. heading level). onFocusCapture covers keyboard focus into an input.
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- wraps real inputs; not a control itself
            <div
              className="min-w-0 flex-1"
              onClick={() => onSelect(path)}
              onFocusCapture={() => onSelect(path)}
            >
              <DisplayCard node={node} path={path} onChange={onChangeDisplay} />
            </div>
          ) : (
            // The card body renders the REAL control (inert preview); clicking it selects the field.
            <div
              role="button"
              tabIndex={0}
              aria-label={`Select field ${index + 1}`}
              onClick={() => onSelect(path)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(path);
                }
              }}
              className="min-w-0 flex-1 cursor-pointer text-left"
            >
              <FieldPreview node={node} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Thin droppable at the end of a non-empty list — lets you drop AFTER the last row. */
export function EndZone({
  id,
  container,
  index,
  accept,
  paletteDragType,
}: {
  id: string;
  container: number | null;
  index: number;
  accept: string[];
  paletteDragType: FieldTypeId | null;
}) {
  const { ref, isDropTarget } = useDroppable({
    id,
    type: 'zone',
    accept,
    data: { container, index },
  });
  return (
    <div ref={ref} className="flex flex-col">
      {isDropTarget ? <DropPlaceholder fieldType={paletteDragType} /> : <div className="h-2" />}
    </div>
  );
}

/** Large labelled drop target for an EMPTY list (root or container body). */
export function EmptyDropZone({
  id,
  container,
  accept,
}: {
  id: string;
  container: number | null;
  accept: string[];
}) {
  const { ref, isDropTarget } = useDroppable({
    id,
    type: 'zone',
    accept,
    data: { container, index: 0 },
    collisionPriority: CollisionPriority.High,
  });
  return (
    <div
      ref={ref}
      data-drop-target={isDropTarget || undefined}
      className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground data-[drop-target]:border-primary data-[drop-target]:bg-primary/5"
    >
      Drop components here
    </div>
  );
}

/** A layout container rendered as a sortable row whose body is a nested sortable group. */
export function ContainerRow({
  node,
  index,
  selectedPath,
  paletteDragType,
  onSelect,
  onDelete,
  onChangeDisplay,
}: {
  node: ContainerNode;
  index: number;
  selectedPath: Path | null;
  paletteDragType: FieldTypeId | null;
  onSelect: (path: Path) => void;
  onDelete: (path: Path) => void;
  onChangeDisplay: (path: Path, patch: Partial<DisplayNode>) => void;
}) {
  const label =
    node.label ?? (node.layout === 'group' ? 'Group' : node.layout === 'grid' ? 'Grid' : 'Row');
  const { ref, handleRef, isDragSource, isDropTarget } = useSortable({
    id: containerId(index),
    index,
    group: ROOT_GROUP,
    type: 'container',
    accept: ['field', 'container', 'palette-item'],
    data: { path: [index], container: null, index, node },
    ...NO_SLIDE,
  });
  return (
    <div
      ref={ref}
      data-selected={pathEq(selectedPath, [index]) || undefined}
      data-dragging={isDragSource || undefined}
      className="group flex flex-col gap-2"
    >
      {paletteDragType !== null && isDropTarget && !isDragSource ? (
        <DropPlaceholder fieldType={paletteDragType} />
      ) : null}
      <div className="relative">
        <DeleteHandle label="Remove field" onDelete={() => onDelete([index])} />
        <div className="rounded-lg border border-dashed border-border p-2 group-data-[dragging]:opacity-40 group-data-[selected]:border-primary group-data-[selected]:bg-primary/5 group-data-[selected]:ring-1 group-data-[selected]:ring-primary">
          <div className="flex items-center justify-between">
            <button
              ref={handleRef}
              type="button"
              aria-label="Reorder field"
              className="cursor-grab text-muted-foreground"
            >
              <GripVertical className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`Select section ${index + 1}`}
              onClick={() => onSelect([index])}
              className="flex-1 px-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </button>
          </div>
          <div
            className={
              node.layout === 'horizontal'
                ? 'mt-2 grid gap-2 sm:grid-cols-2'
                : node.layout === 'grid'
                  ? 'mt-2 grid gap-2'
                  : 'mt-2 flex flex-col gap-2'
            }
            style={
              node.layout === 'grid'
                ? { gridTemplateColumns: `repeat(${node.columns ?? 2}, minmax(0, 1fr))` }
                : undefined
            }
          >
            {node.children.map((child, childIndex) => (
              <FieldRow
                key={child.kind === 'control' ? child.key || childIndex : child.id}
                node={child}
                index={childIndex}
                group={groupId(index)}
                path={[index, childIndex]}
                selected={pathEq(selectedPath, [index, childIndex])}
                paletteDragType={paletteDragType}
                onSelect={onSelect}
                onDelete={onDelete}
                onChangeDisplay={onChangeDisplay}
              />
            ))}
            {node.children.length === 0 ? (
              <EmptyDropZone
                id={`zone-g${index}`}
                container={index}
                accept={['field', 'palette-item']}
              />
            ) : (
              <EndZone
                id={`zone-g${index}-end`}
                container={index}
                index={node.children.length}
                accept={['field', 'palette-item']}
                paletteDragType={paletteDragType}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
