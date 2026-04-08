import { useDraggable } from "@dnd-kit/core";
import { useMemo } from "react";
import { buildPaletteSections, type PaletteEntry } from "../model/palette-items.js";
import { useStudioStore } from "../state/studio-store.js";

function DraggableItem({ entry, disabled }: { entry: PaletteEntry; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: entry.id,
    data: { palette: entry.item },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-cy={`palette-item-${entry.id}`}
      className={[
        "select-none rounded border border-border bg-card px-2 py-1.5 text-sm",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-grab hover:bg-accent",
        isDragging ? "opacity-30" : "",
      ].join(" ")}
    >
      {entry.label}
    </div>
  );
}

export function Palette() {
  const schema = useStudioStore((s) => s.schema);
  const readonly = useStudioStore((s) => s.readonly);

  const sections = useMemo(
    () => buildPaletteSections(Object.keys(schema.properties ?? {})),
    [schema],
  );

  return (
    <aside
      data-cy="studio-palette"
      className="flex h-full min-h-0 w-64 flex-col border-r border-border bg-muted/30"
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section
              key={section.id}
              data-cy={`palette-section-${section.id}`}
              className="flex flex-col gap-1.5"
            >
              <h3 className="sticky top-0 z-10 -mx-3 bg-muted/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                {section.title}
              </h3>
              {section.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No items</p>
              ) : (
                section.items.map((entry) => (
                  <DraggableItem
                    key={entry.id}
                    entry={entry}
                    disabled={readonly}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}
