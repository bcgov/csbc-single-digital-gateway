import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { UISchemaElement } from "@jsonforms/core";
import { useStudioStore } from "../state/studio-store.js";

interface Props {
  node: UISchemaElement;
}

interface CategoryNode {
  type?: string;
  label?: string;
  elements?: UISchemaElement[];
}

function SortableRow({
  id,
  label,
  index,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      data-cy={`categorization-category-${index}`}
      className={[
        "flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5 text-sm",
        selected ? "ring-2 ring-primary" : "",
      ].join(" ")}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        data-cy={`categorization-category-handle-${index}`}
      >
        ⋮⋮
      </button>
      <button
        type="button"
        className="flex-1 text-left"
        onClick={onSelect}
      >
        {label || <span className="text-muted-foreground">(unlabeled)</span>}
      </button>
    </li>
  );
}

export function CategorizationCategories({ node }: Props) {
  const replaceSelectedSubtree = useStudioStore((s) => s.replaceSelectedSubtree);
  const select = useStudioStore((s) => s.select);
  const selection = useStudioStore((s) => s.selection);
  const readonly = useStudioStore((s) => s.readonly);

  const categories = ((node as CategoryNode).elements ?? []) as CategoryNode[];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const ids = categories.map((_, i) => `category-${i}`);

  const onDragEnd = (event: DragEndEvent) => {
    if (readonly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(categories as UISchemaElement[], from, to);
    const merged = {
      ...(node as unknown as Record<string, unknown>),
      elements: reordered,
    };
    replaceSelectedSubtree(merged as unknown as UISchemaElement);
  };

  return (
    <div className="flex flex-col gap-1" data-cy="categorization-categories">
      <label className="text-xs font-medium text-muted-foreground">
        Categories
      </label>
      {categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">No categories</p>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1.5">
              {categories.map((cat, index) => {
                const categoryPath = [...(selection ?? []), index];
                const isSelected =
                  !!selection &&
                  selection.length === categoryPath.length - 1 &&
                  false; // parent is selected, not this child; keep false
                return (
                  <SortableRow
                    key={ids[index]}
                    id={ids[index]}
                    index={index}
                    label={cat.label ?? ""}
                    selected={isSelected}
                    onSelect={() => select(categoryPath)}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <p className="text-[10px] text-muted-foreground">
        Drag the handle to reorder. Click a row to select that category.
      </p>
    </div>
  );
}
